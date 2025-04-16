import { describe, it, expect, beforeEach } from "vitest"

// Mock the Clarity environment
const mockClarity = {
  tx: {
    sender: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", // Mock landlord
    setSender: function (address) {
      this.sender = address
    },
  },
  contracts: {
    improvementAllowance: {
      // Mock contract functions
      createAllowance: function (projectId, tenant, totalAmount) {
        if (this.allowances[projectId]) {
          return { err: 401 } // Allowance already exists
        }
        
        this.allowances[projectId] = {
          landlord: mockClarity.tx.sender,
          tenant: tenant,
          totalAmount: totalAmount,
          releasedAmount: 0,
          remainingAmount: totalAmount,
          status: "active",
        }
        
        return { ok: true }
      },
      
      addMilestone: function (projectId, milestoneId, description, amount) {
        if (!this.allowances[projectId]) {
          return { err: 402 } // Allowance not found
        }
        
        if (this.allowances[projectId].landlord !== mockClarity.tx.sender) {
          return { err: 403 } // Not landlord
        }
        
        const key = `${projectId}-${milestoneId}`
        if (this.milestones[key]) {
          return { err: 404 } // Milestone already exists
        }
        
        if (amount > this.allowances[projectId].remainingAmount) {
          return { err: 405 } // Amount exceeds remaining allowance
        }
        
        this.milestones[key] = {
          description: description,
          amount: amount,
          completed: false,
          paid: false,
        }
        
        return { ok: true }
      },
      
      completeMilestone: function (projectId, milestoneId) {
        if (!this.allowances[projectId]) {
          return { err: 402 } // Allowance not found
        }
        
        if (this.allowances[projectId].tenant !== mockClarity.tx.sender) {
          return { err: 407 } // Not tenant
        }
        
        const key = `${projectId}-${milestoneId}`
        if (!this.milestones[key]) {
          return { err: 406 } // Milestone not found
        }
        
        if (this.milestones[key].completed) {
          return { err: 408 } // Already completed
        }
        
        this.milestones[key].completed = true
        
        return { ok: true }
      },
      
      releaseFunds: function (projectId, milestoneId) {
        if (!this.allowances[projectId]) {
          return { err: 402 } // Allowance not found
        }
        
        if (this.allowances[projectId].landlord !== mockClarity.tx.sender) {
          return { err: 403 } // Not landlord
        }
        
        const key = `${projectId}-${milestoneId}`
        if (!this.milestones[key]) {
          return { err: 406 } // Milestone not found
        }
        
        if (!this.milestones[key].completed) {
          return { err: 409 } // Not completed
        }
        
        if (this.milestones[key].paid) {
          return { err: 410 } // Already paid
        }
        
        this.milestones[key].paid = true
        
        const amount = this.milestones[key].amount
        this.allowances[projectId].releasedAmount += amount
        this.allowances[projectId].remainingAmount -= amount
        
        return { ok: true }
      },
      
      closeAllowance: function (projectId) {
        if (!this.allowances[projectId]) {
          return { err: 402 } // Allowance not found
        }
        
        if (this.allowances[projectId].landlord !== mockClarity.tx.sender) {
          return { err: 403 } // Not landlord
        }
        
        this.allowances[projectId].status = "closed"
        
        return { ok: true }
      },
      
      getAllowance: function (projectId) {
        return this.allowances[projectId] || null
      },
      
      getMilestone: function (projectId, milestoneId) {
        const key = `${projectId}-${milestoneId}`
        return this.milestones[key] || null
      },
      
      // Mock storage
      allowances: {},
      milestones: {},
    },
  },
}

describe("Improvement Allowance Contract", () => {
  const LANDLORD = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
  const TENANT = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
  
  beforeEach(() => {
    // Reset the mock storage before each test
    mockClarity.contracts.improvementAllowance.allowances = {}
    mockClarity.contracts.improvementAllowance.milestones = {}
    mockClarity.tx.setSender(LANDLORD) // Set to landlord
  })
  
  it("should create a new allowance", () => {
    const result = mockClarity.contracts.improvementAllowance.createAllowance("proj123", TENANT, 10000)
    
    expect(result).toEqual({ ok: true })
    expect(mockClarity.contracts.improvementAllowance.allowances["proj123"]).toBeDefined()
    expect(mockClarity.contracts.improvementAllowance.allowances["proj123"].totalAmount).toBe(10000)
    expect(mockClarity.contracts.improvementAllowance.allowances["proj123"].remainingAmount).toBe(10000)
  })
  
  it("should add a milestone to an allowance", () => {
    mockClarity.contracts.improvementAllowance.createAllowance("proj123", TENANT, 10000)
    
    const result = mockClarity.contracts.improvementAllowance.addMilestone(
        "proj123",
        "mile123",
        "Demolition phase",
        2000,
    )
    
    expect(result).toEqual({ ok: true })
    expect(mockClarity.contracts.improvementAllowance.milestones["proj123-mile123"]).toBeDefined()
    expect(mockClarity.contracts.improvementAllowance.milestones["proj123-mile123"].amount).toBe(2000)
  })
  
  it("should mark a milestone as completed by tenant", () => {
    mockClarity.contracts.improvementAllowance.createAllowance("proj123", TENANT, 10000)
    
    mockClarity.contracts.improvementAllowance.addMilestone("proj123", "mile123", "Demolition phase", 2000)
    
    mockClarity.tx.setSender(TENANT)
    const result = mockClarity.contracts.improvementAllowance.completeMilestone("proj123", "mile123")
    
    expect(result).toEqual({ ok: true })
    expect(mockClarity.contracts.improvementAllowance.milestones["proj123-mile123"].completed).toBe(true)
  })
  
  it("should release funds for a completed milestone", () => {
    mockClarity.contracts.improvementAllowance.createAllowance("proj123", TENANT, 10000)
    
    mockClarity.contracts.improvementAllowance.addMilestone("proj123", "mile123", "Demolition phase", 2000)
    
    mockClarity.tx.setSender(TENANT)
    mockClarity.contracts.improvementAllowance.completeMilestone("proj123", "mile123")
    
    mockClarity.tx.setSender(LANDLORD)
    const result = mockClarity.contracts.improvementAllowance.releaseFunds("proj123", "mile123")
    
    expect(result).toEqual({ ok: true })
    expect(mockClarity.contracts.improvementAllowance.milestones["proj123-mile123"].paid).toBe(true)
    expect(mockClarity.contracts.improvementAllowance.allowances["proj123"].releasedAmount).toBe(2000)
    expect(mockClarity.contracts.improvementAllowance.allowances["proj123"].remainingAmount).toBe(8000)
  })
  
  it("should close an allowance", () => {
    mockClarity.contracts.improvementAllowance.createAllowance("proj123", TENANT, 10000)
    
    const result = mockClarity.contracts.improvementAllowance.closeAllowance("proj123")
    
    expect(result).toEqual({ ok: true })
    expect(mockClarity.contracts.improvementAllowance.allowances["proj123"].status).toBe("closed")
  })
})
