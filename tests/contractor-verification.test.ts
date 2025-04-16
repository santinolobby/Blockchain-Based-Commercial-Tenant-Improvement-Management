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
    contractorVerification: {
      // Mock contract functions
      registerContractor: function (contractorId, name, specialties, licenseNumber) {
        if (this.contractors[contractorId]) {
          return { err: 301 } // Contractor already exists
        }
        
        this.contractors[contractorId] = {
          name: name,
          address: mockClarity.tx.sender,
          specialties: specialties,
          licenseNumber: licenseNumber,
          insuranceVerified: false,
          rating: 0,
          verified: false,
        }
        
        return { ok: true }
      },
      
      verifyContractor: function (contractorId, insuranceVerified) {
        if (!this.contractors[contractorId]) {
          return { err: 302 } // Contractor not found
        }
        
        if (mockClarity.tx.sender !== "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM") {
          return { err: 303 } // Not contract owner
        }
        
        this.contractors[contractorId].insuranceVerified = insuranceVerified
        this.contractors[contractorId].verified = true
        
        return { ok: true }
      },
      
      assignContractor: function (contractorId, projectId) {
        if (!this.contractors[contractorId]) {
          return { err: 302 } // Contractor not found
        }
        
        if (!this.contractors[contractorId].verified) {
          return { err: 304 } // Contractor not verified
        }
        
        const key = `${contractorId}-${projectId}`
        if (this.contractorProjects[key]) {
          return { err: 305 } // Assignment already exists
        }
        
        this.contractorProjects[key] = {
          assigned: true,
          completed: false,
          performanceRating: 0,
        }
        
        return { ok: true }
      },
      
      completeProject: function (contractorId, projectId, rating) {
        const key = `${contractorId}-${projectId}`
        if (!this.contractorProjects[key]) {
          return { err: 306 } // Assignment not found
        }
        
        if (!this.contractorProjects[key].assigned) {
          return { err: 307 } // Not assigned
        }
        
        if (this.contractorProjects[key].completed) {
          return { err: 308 } // Already completed
        }
        
        if (rating > 5) {
          return { err: 309 } // Invalid rating
        }
        
        this.contractorProjects[key].completed = true
        this.contractorProjects[key].performanceRating = rating
        
        // Update contractor rating
        const contractor = this.contractors[contractorId]
        if (contractor.rating === 0) {
          contractor.rating = rating
        } else {
          contractor.rating = Math.floor((contractor.rating + rating) / 2)
        }
        
        return { ok: true }
      },
      
      isContractorVerified: function (contractorId) {
        if (!this.contractors[contractorId]) {
          return { err: 302 } // Contractor not found
        }
        
        return { ok: this.contractors[contractorId].verified }
      },
      
      getContractor: function (contractorId) {
        return this.contractors[contractorId] || null
      },
      
      getContractorAssignment: function (contractorId, projectId) {
        const key = `${contractorId}-${projectId}`
        return this.contractorProjects[key] || null
      },
      
      // Mock storage
      contractors: {},
      contractorProjects: {},
    },
  },
}

describe("Contractor Verification Contract", () => {
  const CONTRACTOR = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
  const CONTRACT_OWNER = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
  
  beforeEach(() => {
    // Reset the mock storage before each test
    mockClarity.contracts.contractorVerification.contractors = {}
    mockClarity.contracts.contractorVerification.contractorProjects = {}
    mockClarity.tx.setSender(CONTRACTOR) // Set to contractor
  })
  
  it("should register a new contractor", () => {
    const result = mockClarity.contracts.contractorVerification.registerContractor(
        "cont123",
        "ABC Construction",
        ["plumbing", "electrical"],
        "LIC12345",
    )
    
    expect(result).toEqual({ ok: true })
    expect(mockClarity.contracts.contractorVerification.contractors["cont123"]).toBeDefined()
    expect(mockClarity.contracts.contractorVerification.contractors["cont123"].name).toBe("ABC Construction")
  })
  
  it("should verify a contractor as contract owner", () => {
    mockClarity.contracts.contractorVerification.registerContractor(
        "cont123",
        "ABC Construction",
        ["plumbing", "electrical"],
        "LIC12345",
    )
    
    mockClarity.tx.setSender(CONTRACT_OWNER)
    const result = mockClarity.contracts.contractorVerification.verifyContractor("cont123", true)
    
    expect(result).toEqual({ ok: true })
    expect(mockClarity.contracts.contractorVerification.contractors["cont123"].verified).toBe(true)
    expect(mockClarity.contracts.contractorVerification.contractors["cont123"].insuranceVerified).toBe(true)
  })
  
  it("should assign a verified contractor to a project", () => {
    mockClarity.contracts.contractorVerification.registerContractor(
        "cont123",
        "ABC Construction",
        ["plumbing", "electrical"],
        "LIC12345",
    )
    
    mockClarity.tx.setSender(CONTRACT_OWNER)
    mockClarity.contracts.contractorVerification.verifyContractor("cont123", true)
    
    const result = mockClarity.contracts.contractorVerification.assignContractor("cont123", "proj123")
    
    expect(result).toEqual({ ok: true })
    expect(mockClarity.contracts.contractorVerification.contractorProjects["cont123-proj123"]).toBeDefined()
    expect(mockClarity.contracts.contractorVerification.contractorProjects["cont123-proj123"].assigned).toBe(true)
  })
  
  it("should complete a project and rate a contractor", () => {
    mockClarity.contracts.contractorVerification.registerContractor(
        "cont123",
        "ABC Construction",
        ["plumbing", "electrical"],
        "LIC12345",
    )
    
    mockClarity.tx.setSender(CONTRACT_OWNER)
    mockClarity.contracts.contractorVerification.verifyContractor("cont123", true)
    mockClarity.contracts.contractorVerification.assignContractor("cont123", "proj123")
    
    const result = mockClarity.contracts.contractorVerification.completeProject("cont123", "proj123", 4)
    
    expect(result).toEqual({ ok: true })
    expect(mockClarity.contracts.contractorVerification.contractorProjects["cont123-proj123"].completed).toBe(true)
    expect(mockClarity.contracts.contractorVerification.contractorProjects["cont123-proj123"].performanceRating).toBe(4)
    expect(mockClarity.contracts.contractorVerification.contractors["cont123"].rating).toBe(4)
  })
  
  it("should check if contractor is verified", () => {
    mockClarity.contracts.contractorVerification.registerContractor(
        "cont123",
        "ABC Construction",
        ["plumbing", "electrical"],
        "LIC12345",
    )
    
    let result = mockClarity.contracts.contractorVerification.isContractorVerified("cont123")
    expect(result).toEqual({ ok: false })
    
    mockClarity.tx.setSender(CONTRACT_OWNER)
    mockClarity.contracts.contractorVerification.verifyContractor("cont123", true)
    
    result = mockClarity.contracts.contractorVerification.isContractorVerified("cont123")
    expect(result).toEqual({ ok: true })
  })
})
