import { describe, it, expect, beforeEach } from "vitest"

// Mock the Clarity environment
const mockClarity = {
  tx: {
    sender: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", // Mock tenant
    setSender: function (address) {
      this.sender = address
    },
  },
  contracts: {
    projectScope: {
      // Mock contract functions
      createProject: function (projectId, propertyId, landlord, description, startDate, endDate) {
        if (this.projects[projectId]) {
          return { err: 201 } // Project already exists
        }
        
        this.projects[projectId] = {
          propertyId: propertyId,
          tenant: mockClarity.tx.sender,
          landlord: landlord,
          description: description,
          status: "pending",
          startDate: startDate,
          endDate: endDate,
          approved: false,
        }
        
        return { ok: true }
      },
      
      approveProject: function (projectId) {
        if (!this.projects[projectId]) {
          return { err: 202 } // Project not found
        }
        
        if (this.projects[projectId].landlord !== mockClarity.tx.sender) {
          return { err: 203 } // Not landlord
        }
        
        this.projects[projectId].status = "approved"
        this.projects[projectId].approved = true
        
        return { ok: true }
      },
      
      addModification: function (projectId, modificationId, description) {
        if (!this.projects[projectId]) {
          return { err: 202 } // Project not found
        }
        
        if (this.projects[projectId].tenant !== mockClarity.tx.sender) {
          return { err: 204 } // Not tenant
        }
        
        const key = `${projectId}-${modificationId}`
        if (this.modifications[key]) {
          return { err: 205 } // Modification already exists
        }
        
        this.modifications[key] = {
          description: description,
          approved: false,
          completed: false,
        }
        
        return { ok: true }
      },
      
      approveModification: function (projectId, modificationId) {
        if (!this.projects[projectId]) {
          return { err: 202 } // Project not found
        }
        
        if (this.projects[projectId].landlord !== mockClarity.tx.sender) {
          return { err: 203 } // Not landlord
        }
        
        const key = `${projectId}-${modificationId}`
        if (!this.modifications[key]) {
          return { err: 206 } // Modification not found
        }
        
        this.modifications[key].approved = true
        
        return { ok: true }
      },
      
      completeModification: function (projectId, modificationId) {
        if (!this.projects[projectId]) {
          return { err: 202 } // Project not found
        }
        
        const key = `${projectId}-${modificationId}`
        if (!this.modifications[key]) {
          return { err: 206 } // Modification not found
        }
        
        if (
            this.projects[projectId].tenant !== mockClarity.tx.sender &&
            this.projects[projectId].landlord !== mockClarity.tx.sender
        ) {
          return { err: 207 } // Not tenant or landlord
        }
        
        if (!this.modifications[key].approved) {
          return { err: 208 } // Modification not approved
        }
        
        this.modifications[key].completed = true
        
        return { ok: true }
      },
      
      getProject: function (projectId) {
        return this.projects[projectId] || null
      },
      
      getModification: function (projectId, modificationId) {
        const key = `${projectId}-${modificationId}`
        return this.modifications[key] || null
      },
      
      // Mock storage
      projects: {},
      modifications: {},
    },
  },
}

describe("Project Scope Contract", () => {
  const TENANT = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
  const LANDLORD = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
  
  beforeEach(() => {
    // Reset the mock storage before each test
    mockClarity.contracts.projectScope.projects = {}
    mockClarity.contracts.projectScope.modifications = {}
    mockClarity.tx.setSender(TENANT) // Reset to tenant
  })
  
  it("should create a new project", () => {
    const result = mockClarity.contracts.projectScope.createProject(
        "proj123",
        "prop123",
        LANDLORD,
        "Office renovation",
        1000,
        2000,
    )
    
    expect(result).toEqual({ ok: true })
    expect(mockClarity.contracts.projectScope.projects["proj123"]).toBeDefined()
    expect(mockClarity.contracts.projectScope.projects["proj123"].description).toBe("Office renovation")
  })
  
  it("should approve a project as landlord", () => {
    mockClarity.contracts.projectScope.createProject("proj123", "prop123", LANDLORD, "Office renovation", 1000, 2000)
    
    mockClarity.tx.setSender(LANDLORD)
    const result = mockClarity.contracts.projectScope.approveProject("proj123")
    
    expect(result).toEqual({ ok: true })
    expect(mockClarity.contracts.projectScope.projects["proj123"].approved).toBe(true)
    expect(mockClarity.contracts.projectScope.projects["proj123"].status).toBe("approved")
  })
  
  it("should add a modification to a project", () => {
    mockClarity.contracts.projectScope.createProject("proj123", "prop123", LANDLORD, "Office renovation", 1000, 2000)
    
    const result = mockClarity.contracts.projectScope.addModification("proj123", "mod123", "Add partition wall")
    
    expect(result).toEqual({ ok: true })
    expect(mockClarity.contracts.projectScope.modifications["proj123-mod123"]).toBeDefined()
    expect(mockClarity.contracts.projectScope.modifications["proj123-mod123"].description).toBe("Add partition wall")
  })
  
  it("should approve a modification as landlord", () => {
    mockClarity.contracts.projectScope.createProject("proj123", "prop123", LANDLORD, "Office renovation", 1000, 2000)
    
    mockClarity.contracts.projectScope.addModification("proj123", "mod123", "Add partition wall")
    
    mockClarity.tx.setSender(LANDLORD)
    const result = mockClarity.contracts.projectScope.approveModification("proj123", "mod123")
    
    expect(result).toEqual({ ok: true })
    expect(mockClarity.contracts.projectScope.modifications["proj123-mod123"].approved).toBe(true)
  })
  
  it("should complete an approved modification", () => {
    mockClarity.contracts.projectScope.createProject("proj123", "prop123", LANDLORD, "Office renovation", 1000, 2000)
    
    mockClarity.contracts.projectScope.addModification("proj123", "mod123", "Add partition wall")
    
    mockClarity.tx.setSender(LANDLORD)
    mockClarity.contracts.projectScope.approveModification("proj123", "mod123")
    
    mockClarity.tx.setSender(TENANT)
    const result = mockClarity.contracts.projectScope.completeModification("proj123", "mod123")
    
    expect(result).toEqual({ ok: true })
    expect(mockClarity.contracts.projectScope.modifications["proj123-mod123"].completed).toBe(true)
  })
})
