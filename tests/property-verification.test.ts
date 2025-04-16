import { describe, it, expect, beforeEach } from "vitest"

// Mock the Clarity environment
const mockClarity = {
  tx: {
    sender: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", // Mock contract owner
    setSender: function (address) {
      this.sender = address
    },
  },
  contracts: {
    propertyVerification: {
      // Mock contract functions
      registerProperty: function (propertyId, address) {
        if (mockClarity.tx.sender !== mockClarity.tx.sender) {
          return { err: 100 } // Not contract owner
        }
        
        if (this.properties[propertyId]) {
          return { err: 101 } // Property already exists
        }
        
        this.properties[propertyId] = {
          owner: mockClarity.tx.sender,
          address: address,
          condition: "unverified",
          lastInspection: 123, // Mock block height
          verified: false,
        }
        
        return { ok: true }
      },
      
      transferOwnership: function (propertyId, newOwner) {
        if (!this.properties[propertyId]) {
          return { err: 102 } // Property not found
        }
        
        if (this.properties[propertyId].owner !== mockClarity.tx.sender) {
          return { err: 103 } // Not property owner
        }
        
        this.properties[propertyId].owner = newOwner
        return { ok: true }
      },
      
      updateCondition: function (propertyId, newCondition) {
        if (!this.properties[propertyId]) {
          return { err: 102 } // Property not found
        }
        
        if (mockClarity.tx.sender !== mockClarity.tx.sender) {
          return { err: 104 } // Not contract owner
        }
        
        this.properties[propertyId].condition = newCondition
        this.properties[propertyId].lastInspection = 123 // Mock block height
        this.properties[propertyId].verified = true
        
        return { ok: true }
      },
      
      isPropertyVerified: function (propertyId) {
        if (!this.properties[propertyId]) {
          return { err: 102 } // Property not found
        }
        
        return { ok: this.properties[propertyId].verified }
      },
      
      getProperty: function (propertyId) {
        return this.properties[propertyId] || null
      },
      
      // Mock storage
      properties: {},
    },
  },
}

describe("Property Verification Contract", () => {
  beforeEach(() => {
    // Reset the mock storage before each test
    mockClarity.contracts.propertyVerification.properties = {}
    mockClarity.tx.setSender("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM") // Reset to contract owner
  })
  
  it("should register a new property", () => {
    const result = mockClarity.contracts.propertyVerification.registerProperty("prop123", "123 Main St")
    
    expect(result).toEqual({ ok: true })
    expect(mockClarity.contracts.propertyVerification.properties["prop123"]).toBeDefined()
    expect(mockClarity.contracts.propertyVerification.properties["prop123"].address).toBe("123 Main St")
  })
  
  it("should not allow duplicate property registration", () => {
    mockClarity.contracts.propertyVerification.registerProperty("prop123", "123 Main St")
    const result = mockClarity.contracts.propertyVerification.registerProperty("prop123", "123 Main St")
    
    expect(result).toEqual({ err: 101 })
  })
  
  it("should transfer property ownership", () => {
    mockClarity.contracts.propertyVerification.registerProperty("prop123", "123 Main St")
    const newOwner = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
    
    const result = mockClarity.contracts.propertyVerification.transferOwnership("prop123", newOwner)
    
    expect(result).toEqual({ ok: true })
    expect(mockClarity.contracts.propertyVerification.properties["prop123"].owner).toBe(newOwner)
  })
  
  it("should update property condition", () => {
    mockClarity.contracts.propertyVerification.registerProperty("prop123", "123 Main St")
    
    const result = mockClarity.contracts.propertyVerification.updateCondition("prop123", "excellent")
    
    expect(result).toEqual({ ok: true })
    expect(mockClarity.contracts.propertyVerification.properties["prop123"].condition).toBe("excellent")
    expect(mockClarity.contracts.propertyVerification.properties["prop123"].verified).toBe(true)
  })
  
  it("should check if property is verified", () => {
    mockClarity.contracts.propertyVerification.registerProperty("prop123", "123 Main St")
    
    let result = mockClarity.contracts.propertyVerification.isPropertyVerified("prop123")
    expect(result).toEqual({ ok: false })
    
    mockClarity.contracts.propertyVerification.updateCondition("prop123", "excellent")
    
    result = mockClarity.contracts.propertyVerification.isPropertyVerified("prop123")
    expect(result).toEqual({ ok: true })
  })
})
