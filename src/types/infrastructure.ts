// TypeScript types for Infrastructure View

export interface InfrastructureNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: {
    label: string
    type: string
    [key: string]: any
  }
}

export interface InfrastructureEdge {
  id: string
  source: string
  target: string
  type?: string
  data?: {
    relationship: string
    [key: string]: any
  }
}

export interface InfrastructureData {
  nodes: InfrastructureNode[]
  edges: InfrastructureEdge[]
}

// Database types
export interface DBInfrastructureNode {
  id: string
  organization_id: string
  type: string
  label: string
  position_x: number
  position_y: number
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface DBInfrastructureEdge {
  id: string
  organization_id: string
  source: string
  target: string
  relationship: string
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

// API Response types
export interface InfrastructureAPIResponse {
  nodes: InfrastructureNode[]
  edges: InfrastructureEdge[]
}

export interface InfrastructureSaveResponse {
  success: boolean
  message: string
}