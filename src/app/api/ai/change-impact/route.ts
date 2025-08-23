import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { ITILPromptTemplates } from '@/lib/itil-prompts'
import { ITILDataFetcher } from '@/lib/itil-data-fetcher'
import { AICache } from '@/lib/ai-cache'
import { createSupabaseServerClient } from '@/lib/supabase'

interface ChangeImpactRequest {
  changeId?: string // For existing change
  components: string[] // Affected components
  changeDescription: string
  changeType?: 'standard' | 'emergency' | 'normal'
  scheduledTime?: string
  skipCache?: boolean
}

interface InfrastructureRelationship {
  id: string
  source: string
  target: string
  type: string
  metadata?: any
}

interface ZoneInfo {
  id: string
  name: string
  environment: string
  description?: string
}

interface ChangeImpactAnalysis {
  summary: {
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
    totalComponentsAffected: number
    estimatedDowntime: string
    rollbackComplexity: 'simple' | 'moderate' | 'complex'
    approvalRequired: boolean
  }
  
  impact: {
    directlyAffected: string[]
    indirectlyAffected: string[]
    dependencyChains: Array<{
      path: string[]
      riskScore: number
      criticalPath: boolean
    }>
    zoneImpact: Array<{
      zone: string
      environment: string
      impactLevel: 'low' | 'medium' | 'high'
      affectedComponents: string[]
    }>
  }
  
  risks: {
    technical: Array<{
      risk: string
      probability: number
      impact: string
      mitigation: string
    }>
    business: Array<{
      risk: string
      businessFunction: string
      impact: string
      mitigation: string
    }>
    operational: Array<{
      risk: string
      effect: string
      prevention: string
    }>
  }
  
  recommendations: {
    timing: {
      optimalWindow: string
      reasoning: string
      alternatives: string[]
    }
    precautions: string[]
    monitoringPoints: string[]
    rollbackPlan: string[]
    communicationPlan: string[]
  }
  
  historicalContext: {
    similarChanges: Array<{
      description: string
      outcome: 'success' | 'partial' | 'failure'
      lessonsLearned: string
    }>
    relatedIncidents: Array<{
      title: string
      impact: string
      resolution: string
    }>
  }
  
  confidence: number
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: ChangeImpactRequest = await request.json()
    const { changeId, components, changeDescription, changeType, scheduledTime, skipCache } = body

    if (!components || components.length === 0) {
      return NextResponse.json({
        error: 'At least one component must be specified'
      }, { status: 400 })
    }

    if (!changeDescription || changeDescription.trim().length < 20) {
      return NextResponse.json({
        error: 'Change description must be at least 20 characters long'
      }, { status: 400 })
    }

    // Generate cache parameters
    const cacheParams = {
      components: components.sort(),
      changeDescription: changeDescription.trim(),
      changeType: changeType || 'normal',
      organizationId: user.organizationId
    }

    // Try to get cached response
    if (!skipCache) {
      const cached = await AICache.get(
        user.organizationId,
        'change_impact',
        cacheParams,
        { ttlHours: 12 }
      )

      if (cached) {
        return NextResponse.json({
          status: 'success',
          message: 'Change impact analysis completed (cached)',
          cached: true,
          result: cached.aiResponse,
          metadata: {
            confidence: cached.confidenceScore,
            cacheAge: Date.now() - new Date(cached.createdAt).getTime(),
            cost: cached.cost || 0
          },
          timestamp: new Date().toISOString()
        })
      }
    }

    // Fetch comprehensive infrastructure data
    const [allComponents, relationships, zones, recentChanges, relatedIncidents] = await Promise.all([
      ITILDataFetcher.getInfrastructureComponents(user.organizationId, 200),
      ITILDataFetcher.getInfrastructureRelationships(user.organizationId, components, 100),
      fetchInfrastructureZones(user.organizationId),
      ITILDataFetcher.getRecentChanges(user.organizationId, 30, 20),
      ITILDataFetcher.getIncidentsByComponents(user.organizationId, components, 15)
    ])

    // Filter and validate affected components
    const validComponents = components.filter(comp =>
      allComponents.some(c => c.name === comp)
    )

    if (validComponents.length === 0) {
      return NextResponse.json({
        error: 'No valid components found in infrastructure'
      }, { status: 400 })
    }

    // Build dependency maps
    const dependencyMap = buildDependencyMap(relationships)
    const zoneMap = buildZoneMap(allComponents, zones)

    // Create comprehensive analysis prompt
    const prompt = createChangeImpactPrompt(
      validComponents,
      changeDescription,
      changeType || 'normal',
      allComponents,
      relationships,
      zoneMap,
      recentChanges,
      relatedIncidents,
      scheduledTime
    )

    // Generate AI analysis
    const result = await ITILPromptTemplates.generateCompletion(
      prompt,
      user.organizationId,
      'change-impact-analysis',
      1500
    )

    // Parse and validate response
    let analysisResult: ChangeImpactAnalysis
    try {
      analysisResult = JSON.parse(result.content)
    } catch (error) {
      console.error('Failed to parse AI response:', result.content)
      return NextResponse.json({
        status: 'error',
        message: 'Failed to parse AI analysis',
        fallback: createFallbackAnalysis(validComponents, changeDescription)
      }, { status: 500 })
    }

    // Enhance analysis with real dependency data
    analysisResult = enhanceWithRealData(analysisResult, allComponents, relationships, zoneMap)

    // Cache the successful response
    if (!skipCache) {
      await AICache.set(
        user.organizationId,
        'change_impact',
        cacheParams,
        analysisResult,
        {
          confidenceScore: analysisResult.confidence,
          tokenUsage: result.usage,
          cost: result.cost
        },
        { ttlHours: 12 }
      )
    }

    return NextResponse.json({
      status: 'success',
      message: 'Change impact analysis completed',
      cached: false,
      result: analysisResult,
      metadata: {
        inputTokens: result.usage?.prompt_tokens || 0,
        outputTokens: result.usage?.completion_tokens || 0,
        totalTokens: result.usage?.total_tokens || 0,
        cost: result.cost,
        costFormatted: `$${result.cost.toFixed(6)}`,
        confidence: analysisResult.confidence,
        componentsAnalyzed: validComponents.length,
        dependenciesFound: relationships.length,
        model: 'gpt-4o-mini'
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Change impact analysis error:', error)
    
    return NextResponse.json({
      status: 'error',
      message: 'Change impact analysis failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Helper functions

async function fetchInfrastructureZones(organizationId: string): Promise<ZoneInfo[]> {
  try {
    const supabase = await createSupabaseServerClient()
    
    const { data, error } = await supabase
      .from('infrastructure_zones')
      .select('id, name, environment, description')
      .eq('organization_id', organizationId)

    if (error) {
      console.error('Error fetching zones:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Failed to fetch zones:', error)
    return []
  }
}

function buildDependencyMap(relationships: any[]): Map<string, string[]> {
  const map = new Map<string, string[]>()
  
  relationships.forEach(rel => {
    // Forward dependencies (what this component depends on)
    if (!map.has(rel.source)) {
      map.set(rel.source, [])
    }
    map.get(rel.source)!.push(rel.target)
    
    // Reverse dependencies (what depends on this component)
    if (!map.has(rel.target)) {
      map.set(rel.target, [])
    }
  })
  
  return map
}

function buildZoneMap(components: any[], zones: ZoneInfo[]): Map<string, ZoneInfo> {
  const map = new Map<string, ZoneInfo>()
  
  components.forEach(comp => {
    if (comp.zone_id) {
      const zone = zones.find(z => z.id === comp.zone_id)
      if (zone) {
        map.set(comp.name, zone)
      }
    }
  })
  
  return map
}

function createChangeImpactPrompt(
  components: string[],
  description: string,
  changeType: string,
  allComponents: any[],
  relationships: any[],
  zoneMap: Map<string, ZoneInfo>,
  recentChanges: any[],
  incidents: any[],
  scheduledTime?: string
): string {
  const componentData = components.map(name => {
    const comp = allComponents.find(c => c.name === name)
    const zone = zoneMap.get(name)
    return `${name}:${comp?.type || 'unknown'}:${comp?.environment || 'unknown'}:${zone?.name || 'no-zone'}`
  }).join(' ')

  const dependencies = relationships.map(r => `${r.source}->${r.target}:${r.type}`).join(' ')
  const zoneInfo = Array.from(zoneMap.values()).map(z => `${z.name}:${z.environment}`).join(' ')
  const changeHistory = recentChanges.slice(0, 5).map(c => `${c.title}:${c.status}`).join(' | ')
  const incidentHistory = incidents.slice(0, 3).map(i => `${i.title}:${i.priority}`).join(' | ')

  return `Analyze the impact of this change on infrastructure components:

Change: "${description}"
Type: ${changeType}
Components: ${componentData}
${scheduledTime ? `Scheduled: ${scheduledTime}` : ''}

Infrastructure context:
Dependencies: ${dependencies || 'None mapped'}
Zones: ${zoneInfo || 'No zones'}
Recent changes: ${changeHistory || 'None'}
Related incidents: ${incidentHistory || 'None'}

Return comprehensive JSON analysis:
{
  "summary": {
    "riskLevel": "low|medium|high|critical",
    "totalComponentsAffected": number,
    "estimatedDowntime": "duration estimate",
    "rollbackComplexity": "simple|moderate|complex",
    "approvalRequired": boolean
  },
  "impact": {
    "directlyAffected": ["components being changed"],
    "indirectlyAffected": ["downstream dependencies"],
    "dependencyChains": [{"path": ["comp1", "comp2"], "riskScore": 0.7, "criticalPath": true}],
    "zoneImpact": [{"zone": "zone-name", "environment": "prod", "impactLevel": "high", "affectedComponents": ["list"]}]
  },
  "risks": {
    "technical": [{"risk": "description", "probability": 0.3, "impact": "effect", "mitigation": "how to prevent"}],
    "business": [{"risk": "description", "businessFunction": "affected area", "impact": "effect", "mitigation": "prevention"}],
    "operational": [{"risk": "description", "effect": "operational impact", "prevention": "how to prevent"}]
  },
  "recommendations": {
    "timing": {"optimalWindow": "suggested time", "reasoning": "why", "alternatives": ["other options"]},
    "precautions": ["safety measures"],
    "monitoringPoints": ["what to watch"],
    "rollbackPlan": ["rollback steps"],
    "communicationPlan": ["who to notify"]
  },
  "historicalContext": {
    "similarChanges": [{"description": "past change", "outcome": "success", "lessonsLearned": "insight"}],
    "relatedIncidents": [{"title": "incident", "impact": "effect", "resolution": "how fixed"}]
  },
  "confidence": 0.85
}

Focus on real dependencies and provide actionable recommendations.`
}

function enhanceWithRealData(
  analysis: ChangeImpactAnalysis,
  components: any[],
  relationships: any[],
  zoneMap: Map<string, ZoneInfo>
): ChangeImpactAnalysis {
  // Validate and correct component lists
  const allComponentNames = components.map(c => c.name)
  
  analysis.impact.directlyAffected = analysis.impact.directlyAffected.filter(name =>
    allComponentNames.includes(name)
  )
  
  analysis.impact.indirectlyAffected = analysis.impact.indirectlyAffected.filter(name =>
    allComponentNames.includes(name)
  )

  // Enhance zone impact with real zone data
  analysis.impact.zoneImpact = analysis.impact.zoneImpact.map(zoneImpact => {
    const realZone = Array.from(zoneMap.values()).find(z => z.name === zoneImpact.zone)
    if (realZone) {
      zoneImpact.environment = realZone.environment
    }
    zoneImpact.affectedComponents = zoneImpact.affectedComponents.filter(name =>
      allComponentNames.includes(name)
    )
    return zoneImpact
  })

  return analysis
}

function createFallbackAnalysis(components: string[], description: string): ChangeImpactAnalysis {
  return {
    summary: {
      riskLevel: 'medium',
      totalComponentsAffected: components.length,
      estimatedDowntime: 'To be determined',
      rollbackComplexity: 'moderate',
      approvalRequired: true
    },
    impact: {
      directlyAffected: components,
      indirectlyAffected: [],
      dependencyChains: [],
      zoneImpact: []
    },
    risks: {
      technical: [{
        risk: 'Change may cause unexpected system behavior',
        probability: 0.3,
        impact: 'Service disruption possible',
        mitigation: 'Thorough testing and gradual rollout'
      }],
      business: [{
        risk: 'Potential service interruption',
        businessFunction: 'Operations',
        impact: 'User experience degradation',
        mitigation: 'Schedule during low-usage periods'
      }],
      operational: [{
        risk: 'Manual intervention may be required',
        effect: 'Increased operational overhead',
        prevention: 'Prepare detailed runbooks'
      }]
    },
    recommendations: {
      timing: {
        optimalWindow: 'Off-peak hours',
        reasoning: 'Minimize user impact',
        alternatives: ['Weekend maintenance window']
      },
      precautions: ['Full system backup', 'Rollback plan ready'],
      monitoringPoints: ['System performance', 'Error rates'],
      rollbackPlan: ['Restore from backup', 'Verify system state'],
      communicationPlan: ['Notify stakeholders', 'Update status page']
    },
    historicalContext: {
      similarChanges: [],
      relatedIncidents: []
    },
    confidence: 0.2
  }
}