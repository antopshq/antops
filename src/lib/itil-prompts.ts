import { openaiClient } from './openai-client'

// JSON Schema definitions for structured responses
export const RESPONSE_SCHEMAS = {
  incidentAnalysis: {
    type: 'object',
    properties: {
      title: { type: 'string', maxLength: 100 },
      description: { type: 'string', maxLength: 500 },
      criticality: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
      urgency: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
      priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
      category: { type: 'string', maxLength: 50 },
      affectedComponents: { type: 'array', items: { type: 'string' } },
      estimatedImpact: { type: 'string', maxLength: 200 },
      suggestedActions: { type: 'array', items: { type: 'string', maxLength: 100 } },
      confidence: { type: 'number', minimum: 0, maximum: 1 }
    },
    required: ['title', 'description', 'criticality', 'urgency', 'priority', 'confidence']
  },
  impactAnalysis: {
    type: 'object',
    properties: {
      directlyAffected: { type: 'array', items: { type: 'string' } },
      indirectlyAffected: { type: 'array', items: { type: 'string' } },
      businessImpact: { type: 'string', maxLength: 300 },
      userImpact: { type: 'string', maxLength: 300 },
      estimatedDowntime: { type: 'string', maxLength: 50 },
      riskLevel: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
      mitigation: { type: 'array', items: { type: 'string', maxLength: 100 } },
      dependencies: { type: 'array', items: { type: 'string' } }
    },
    required: ['directlyAffected', 'businessImpact', 'riskLevel']
  },
  rootCauseAnalysis: {
    type: 'object',
    properties: {
      likelyRootCauses: { 
        type: 'array', 
        items: {
          type: 'object',
          properties: {
            cause: { type: 'string', maxLength: 150 },
            probability: { type: 'number', minimum: 0, maximum: 1 },
            evidence: { type: 'array', items: { type: 'string', maxLength: 100 } }
          }
        }
      },
      investigationSteps: { type: 'array', items: { type: 'string', maxLength: 100 } },
      preventiveMeasures: { type: 'array', items: { type: 'string', maxLength: 100 } },
      patterns: { type: 'array', items: { type: 'string', maxLength: 100 } },
      confidence: { type: 'number', minimum: 0, maximum: 1 }
    },
    required: ['likelyRootCauses', 'investigationSteps', 'confidence']
  },
  dependencyAnalysis: {
    type: 'object',
    properties: {
      upstream: { type: 'array', items: { type: 'string' } },
      downstream: { type: 'array', items: { type: 'string' } },
      criticalPaths: { type: 'array', items: { type: 'string' } },
      riskAssessment: { type: 'string', maxLength: 300 },
      changeImpact: { type: 'string', maxLength: 300 },
      recommendations: { type: 'array', items: { type: 'string', maxLength: 100 } }
    },
    required: ['upstream', 'downstream', 'riskAssessment']
  }
}

// Token-optimized prompt templates
export class ITILPromptTemplates {
  
  /**
   * Compress infrastructure data for token efficiency
   */
  private static compressInfrastructureData(components: any[]): string {
    if (!components || components.length === 0) return 'No components'
    
    // Group by type and environment for compression
    const grouped = components.reduce((acc, comp) => {
      const key = `${comp.type}_${comp.environment || 'unknown'}`
      if (!acc[key]) acc[key] = []
      acc[key].push(comp.name)
      return acc
    }, {})
    
    // Create compressed representation
    return Object.entries(grouped)
      .map(([key, names]) => `${key}:[${(names as string[]).join(',')}]`)
      .join(' ')
  }

  /**
   * Compress incident patterns for context
   */
  private static compressIncidentPatterns(incidents: any[]): string {
    if (!incidents || incidents.length === 0) return 'No patterns'
    
    // Extract key patterns: priority + affected components
    const patterns = incidents.slice(0, 5).map(inc => 
      `${inc.priority}:${inc.affected_services?.slice(0, 3).join(',') || 'unknown'}`
    )
    
    return patterns.join(' | ')
  }

  /**
   * Create incident from description with minimal tokens
   */
  static createIncidentAnalysisPrompt(
    description: string, 
    components: any[], 
    recentIncidents: any[] = []
  ): string {
    const compressedComponents = this.compressInfrastructureData(components)
    const recentPatterns = this.compressIncidentPatterns(recentIncidents)
    
    return `Analyze incident: "${description}"

Infrastructure: ${compressedComponents}
Recent patterns: ${recentPatterns}

Output JSON with: title, description, criticality, urgency, priority (ITIL matrix), category, affectedComponents (from Infrastructure), estimatedImpact, suggestedActions (max 3), confidence (0-1).

Rules:
- Title: concise, actionable (max 100 chars)
- Description: technical details (max 500 chars)  
- Use ITIL criticality/urgency matrix for priority
- affectedComponents: exact names from Infrastructure
- confidence: based on description clarity and pattern match

JSON:`
  }

  /**
   * Impact analysis with component relationships
   */
  static createImpactAnalysisPrompt(
    componentNames: string[], 
    components: any[], 
    relationships: any[] = []
  ): string {
    const targetComponents = components.filter(c => componentNames.includes(c.name))
    const compressedInfra = this.compressInfrastructureData(components)
    
    // Compress relationships
    const relData = relationships.length > 0 
      ? relationships.slice(0, 10).map(r => `${r.source}->${r.target}`).join(' ')
      : 'No relationships'
    
    return `Impact analysis for: ${componentNames.join(', ')}

Target details: ${targetComponents.map(c => `${c.name}:${c.type}:${c.environment}`).join(' ')}
Infrastructure: ${compressedInfra}
Dependencies: ${relData}

Output JSON with: directlyAffected (exact names), indirectlyAffected (from dependencies), businessImpact, userImpact, estimatedDowntime, riskLevel, mitigation (max 3 actions), dependencies.

Focus on cascade effects and business continuity.

JSON:`
  }

  /**
   * Root cause analysis using incident patterns
   */
  static createRootCauseAnalysisPrompt(
    incidentDescription: string,
    affectedComponents: string[],
    historicalIncidents: any[] = [],
    recentChanges: any[] = []
  ): string {
    const patterns = this.compressIncidentPatterns(historicalIncidents)
    const changes = recentChanges.slice(0, 3).map(c => 
      `${c.title}:${c.status}:${c.scheduled_for || c.created_at}`
    ).join(' | ')
    
    return `Root cause analysis for: "${incidentDescription}"

Affected: ${affectedComponents.join(', ')}
Historical patterns: ${patterns}
Recent changes: ${changes || 'None'}

Output JSON with: likelyRootCauses (array of {cause, probability 0-1, evidence array}), investigationSteps (max 5), preventiveMeasures (max 3), patterns (commonalities with historical), confidence (0-1).

Prioritize causes by probability and available evidence.

JSON:`
  }

  /**
   * Infrastructure dependency analysis
   */
  static createDependencyAnalysisPrompt(
    componentName: string,
    components: any[],
    relationships: any[] = [],
    changeDescription?: string
  ): string {
    const target = components.find(c => c.name === componentName)
    const compressedInfra = this.compressInfrastructureData(components)
    
    // Find direct relationships
    const upstream = relationships.filter(r => r.target === componentName).map(r => r.source)
    const downstream = relationships.filter(r => r.source === componentName).map(r => r.target)
    
    const context = changeDescription ? `\nChange context: "${changeDescription}"` : ''
    
    return `Dependency analysis for: ${componentName} (${target?.type}:${target?.environment})

Current dependencies: Up[${upstream.join(',')}] Down[${downstream.join(',')}]
Infrastructure: ${compressedInfra}${context}

Output JSON with: upstream (all dependencies), downstream (all dependents), criticalPaths (high-risk chains), riskAssessment, changeImpact${changeDescription ? ' (specific to change)' : ''}, recommendations (max 3).

Focus on critical paths and cascade risks.

JSON:`
  }

  /**
   * Generate completion with specific template
   */
  static async generateCompletion(
    prompt: string,
    organizationId: string,
    endpoint: string,
    maxTokens: number = 800
  ) {
    return await openaiClient.generateCompletion(
      [
        {
          role: 'system',
          content: 'You are an ITIL expert assistant. Always respond with valid JSON only. Be concise and accurate.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      organizationId,
      endpoint,
      {
        maxTokens,
        temperature: 0.3, // Lower temperature for more consistent JSON
      }
    )
  }
}

// Utility functions for token estimation
export class TokenOptimizer {
  
  /**
   * Estimate token count (rough approximation: 1 token ≈ 4 characters)
   */
  static estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }

  /**
   * Truncate text to fit token limit
   */
  static truncateToTokens(text: string, maxTokens: number): string {
    const maxChars = maxTokens * 4
    if (text.length <= maxChars) return text
    return text.substring(0, maxChars - 3) + '...'
  }

  /**
   * Compress array data for prompts
   */
  static compressArray<T>(
    items: T[], 
    keyExtractor: (item: T) => string,
    maxItems: number = 10
  ): string {
    if (!items || items.length === 0) return 'None'
    return items
      .slice(0, maxItems)
      .map(keyExtractor)
      .join(', ')
  }

  /**
   * Get token-optimized data subset
   */
  static optimizeDataForPrompt<T>(
    data: T[],
    tokenBudget: number,
    serializer: (item: T) => string
  ): T[] {
    const result: T[] = []
    let currentTokens = 0
    
    for (const item of data) {
      const itemTokens = this.estimateTokens(serializer(item))
      if (currentTokens + itemTokens > tokenBudget) break
      
      result.push(item)
      currentTokens += itemTokens
    }
    
    return result
  }
}

// Export types for validation
export type IncidentAnalysis = {
  title: string
  description: string
  criticality: 'low' | 'medium' | 'high' | 'critical'
  urgency: 'low' | 'medium' | 'high' | 'critical'
  priority: 'low' | 'medium' | 'high' | 'critical'
  category: string
  affectedComponents: string[]
  estimatedImpact: string
  suggestedActions: string[]
  confidence: number
}

export type ImpactAnalysis = {
  directlyAffected: string[]
  indirectlyAffected: string[]
  businessImpact: string
  userImpact: string
  estimatedDowntime: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  mitigation: string[]
  dependencies: string[]
}

export type RootCauseAnalysis = {
  likelyRootCauses: Array<{
    cause: string
    probability: number
    evidence: string[]
  }>
  investigationSteps: string[]
  preventiveMeasures: string[]
  patterns: string[]
  confidence: number
}

export type DependencyAnalysis = {
  upstream: string[]
  downstream: string[]
  criticalPaths: string[]
  riskAssessment: string
  changeImpact: string
  recommendations: string[]
}