import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { ITILPromptTemplates } from '@/lib/itil-prompts'
import { ITILDataFetcher } from '@/lib/itil-data-fetcher'
import { AICache } from '@/lib/ai-cache'
import { createSupabaseServerClient } from '@/lib/supabase'

interface IncidentAnalysisRequest {
  incidentId?: string // Existing incident ID
  title: string
  description: string
  currentCriticality?: 'low' | 'medium' | 'high' | 'critical'
  currentUrgency?: 'low' | 'medium' | 'high' | 'critical'
  affectedComponents?: string[]
  updateIncident?: boolean // Whether to update the incident with AI recommendations
  skipCache?: boolean
}

interface IncidentClassification {
  assessment: {
    recommendedCriticality: 'low' | 'medium' | 'high' | 'critical'
    recommendedUrgency: 'low' | 'medium' | 'high' | 'critical'
    calculatedPriority: 'low' | 'medium' | 'high' | 'critical'
    confidence: number
    reasoning: {
      criticalityJustification: string
      urgencyJustification: string
      priorityExplanation: string
    }
  }
  
  categorization: {
    primaryCategory: string
    subCategory: string
    serviceType: string
    impactScope: 'single-user' | 'multiple-users' | 'department' | 'organization' | 'external'
    complexity: 'simple' | 'moderate' | 'complex'
  }
  
  escalation: {
    shouldEscalate: boolean
    escalationLevel: 'l1' | 'l2' | 'l3' | 'management' | 'external'
    escalationReason: string
    suggestedAssignee?: string
    escalationTimeframe: string
  }
  
  resolution: {
    estimatedResolutionTime: string
    suggestedSkills: string[]
    requiredResources: string[]
    resolutionApproach: string[]
    knowledgeBaseReferences: string[]
  }
  
  monitoring: {
    keyMetrics: string[]
    alertThresholds: Array<{
      metric: string
      threshold: string
      action: string
    }>
    communicationPlan: {
      stakeholders: string[]
      updateFrequency: string
      escalationCriteria: string[]
    }
  }
  
  aiInsights: {
    similarIncidents: Array<{
      id: string
      title: string
      resolution: string
      resolutionTime: string
      lessonsLearned: string
    }>
    relatedProblems: Array<{
      id: string
      title: string
      status: string
      rootCause: string
    }>
    suggestedActions: string[]
    riskFactors: string[]
    preventionMeasures: string[]
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: IncidentAnalysisRequest = await request.json()
    const { 
      incidentId, 
      title, 
      description, 
      currentCriticality, 
      currentUrgency, 
      affectedComponents, 
      updateIncident,
      skipCache 
    } = body

    if (!title || !description) {
      return NextResponse.json({
        error: 'Title and description are required'
      }, { status: 400 })
    }

    // Generate cache parameters
    const cacheParams = {
      title: title.trim(),
      description: description.trim(),
      affectedComponents: affectedComponents?.sort() || [],
      organizationId: user.organizationId
    }

    // Try to get cached response
    if (!skipCache) {
      const cached = await AICache.get(
        user.organizationId,
        'incident_analysis',
        cacheParams,
        { ttlHours: 6 }
      )

      if (cached) {
        return NextResponse.json({
          status: 'success',
          message: 'Incident analysis completed (cached)',
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

    // Fetch contextual data
    const [components, similarIncidents, relatedProblems, teamMembers] = await Promise.all([
      ITILDataFetcher.getInfrastructureComponents(user.organizationId, 100),
      fetchSimilarIncidents(user.organizationId, title, description),
      ITILDataFetcher.getHistoricalProblems(user.organizationId, affectedComponents),
      fetchTeamMembers(user.organizationId)
    ])

    // Create comprehensive analysis prompt
    const prompt = createIncidentAnalysisPrompt(
      title,
      description,
      currentCriticality,
      currentUrgency,
      affectedComponents || [],
      components,
      similarIncidents,
      relatedProblems,
      teamMembers
    )

    // Generate AI analysis
    const result = await ITILPromptTemplates.generateCompletion(
      prompt,
      user.organizationId,
      'incident-classification',
      1400
    )

    // Parse and validate response
    let analysisResult: IncidentClassification
    try {
      analysisResult = JSON.parse(result.content)
    } catch (error) {
      console.error('Failed to parse AI response:', result.content)
      return NextResponse.json({
        status: 'error',
        message: 'Failed to parse AI analysis',
        fallback: createFallbackClassification(title, description, currentCriticality, currentUrgency)
      }, { status: 500 })
    }

    // Validate affected components
    if (affectedComponents) {
      const validComponents = affectedComponents.filter(comp =>
        components.some(c => c.name === comp)
      )
      analysisResult.aiInsights.suggestedActions.unshift(
        `Verified ${validComponents.length}/${affectedComponents.length} affected components exist in infrastructure`
      )
    }

    // Update incident with AI recommendations if requested
    let updateResult = null
    if (updateIncident && incidentId) {
      updateResult = await updateIncidentWithAIInsights(
        incidentId,
        analysisResult,
        user.organizationId
      )
    }

    // Cache the successful response
    if (!skipCache) {
      await AICache.set(
        user.organizationId,
        'incident_analysis',
        cacheParams,
        analysisResult,
        {
          confidenceScore: analysisResult.assessment.confidence,
          tokenUsage: result.usage,
          cost: result.cost
        },
        { ttlHours: 6 }
      )
    }

    return NextResponse.json({
      status: 'success',
      message: 'Incident analysis completed',
      cached: false,
      result: analysisResult,
      updateResult,
      metadata: {
        inputTokens: result.usage?.prompt_tokens || 0,
        outputTokens: result.usage?.completion_tokens || 0,
        totalTokens: result.usage?.total_tokens || 0,
        cost: result.cost,
        costFormatted: `$${result.cost.toFixed(6)}`,
        confidence: analysisResult.assessment.confidence,
        incidentUpdated: !!updateResult,
        model: 'gpt-4o-mini'
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Incident analysis error:', error)
    
    return NextResponse.json({
      status: 'error',
      message: 'Incident analysis failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Helper functions

async function fetchSimilarIncidents(
  organizationId: string,
  title: string,
  description: string
): Promise<any[]> {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Simple text similarity search (can be enhanced with vector search)
    const titleWords = title.toLowerCase().split(/\s+/).filter(word => word.length > 3)
    const descWords = description.toLowerCase().split(/\s+/).filter(word => word.length > 4).slice(0, 5)
    
    const searchTerms = [...titleWords, ...descWords].slice(0, 8)
    
    const { data, error } = await supabase
      .from('incidents')
      .select('id, title, description, priority, status, resolution_summary, resolved_at, created_at')
      .eq('organization_id', organizationId)
      .in('status', ['resolved', 'closed'])
      .limit(10)

    if (error || !data) return []

    // Simple relevance scoring based on common words
    const scoredIncidents = data.map(incident => {
      const incidentText = `${incident.title} ${incident.description}`.toLowerCase()
      const score = searchTerms.reduce((acc, term) => {
        return acc + (incidentText.includes(term) ? 1 : 0)
      }, 0)
      
      return { ...incident, relevanceScore: score }
    })

    return scoredIncidents
      .filter(incident => incident.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5)
  } catch (error) {
    console.error('Error fetching similar incidents:', error)
    return []
  }
}

async function fetchTeamMembers(organizationId: string): Promise<any[]> {
  try {
    const supabase = await createSupabaseServerClient()
    
    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        user_id,
        role,
        profiles:user_id (
          full_name,
          email
        )
      `)
      .eq('organization_id', organizationId)

    if (error || !data) return []

    return data.map((member: any) => ({
      id: member.user_id,
      name: member.profiles?.full_name || 'Unknown',
      email: member.profiles?.email || '',
      role: member.role
    }))
  } catch (error) {
    console.error('Error fetching team members:', error)
    return []
  }
}

function createIncidentAnalysisPrompt(
  title: string,
  description: string,
  currentCriticality?: string,
  currentUrgency?: string,
  affectedComponents: string[] = [],
  components: any[] = [],
  similarIncidents: any[] = [],
  problems: any[] = [],
  teamMembers: any[] = []
): string {
  const componentData = affectedComponents.map(name => {
    const comp = components.find(c => c.name === name)
    return `${name}:${comp?.type || 'unknown'}:${comp?.environment || 'unknown'}`
  }).join(' ')

  const similarData = similarIncidents.map(inc => 
    `${inc.title}:${inc.priority}:${inc.resolution_summary || 'resolved'}`
  ).slice(0, 3).join(' | ')

  const problemData = problems.map(p => 
    `${p.title}:${p.status}:${p.root_cause || 'investigating'}`
  ).slice(0, 3).join(' | ')

  const teamData = teamMembers.filter(m => m.role === 'admin' || m.role === 'technician')
    .map(m => `${m.name}:${m.role}`).slice(0, 5).join(' ')

  return `Analyze this incident and provide comprehensive classification and recommendations:

Title: "${title}"
Description: "${description}"
Current Assessment: Criticality=${currentCriticality || 'unset'}, Urgency=${currentUrgency || 'unset'}
Affected Components: ${componentData || 'None specified'}

Context:
Similar incidents: ${similarData || 'None found'}
Related problems: ${problemData || 'None found'}
Available team: ${teamData || 'Standard team'}

Return detailed JSON analysis:
{
  "assessment": {
    "recommendedCriticality": "low|medium|high|critical",
    "recommendedUrgency": "low|medium|high|critical", 
    "calculatedPriority": "calculated using ITIL matrix",
    "confidence": 0.85,
    "reasoning": {
      "criticalityJustification": "why this criticality level",
      "urgencyJustification": "why this urgency level",
      "priorityExplanation": "ITIL priority matrix explanation"
    }
  },
  "categorization": {
    "primaryCategory": "hardware|software|network|security|access",
    "subCategory": "specific type",
    "serviceType": "application|infrastructure|platform",
    "impactScope": "single-user|multiple-users|department|organization|external",
    "complexity": "simple|moderate|complex"
  },
  "escalation": {
    "shouldEscalate": boolean,
    "escalationLevel": "l1|l2|l3|management|external",
    "escalationReason": "reason if escalation needed",
    "suggestedAssignee": "team member name or role",
    "escalationTimeframe": "time before escalation"
  },
  "resolution": {
    "estimatedResolutionTime": "time estimate",
    "suggestedSkills": ["required skills"],
    "requiredResources": ["needed resources"],
    "resolutionApproach": ["step by step approach"],
    "knowledgeBaseReferences": ["relevant documentation"]
  },
  "monitoring": {
    "keyMetrics": ["metrics to watch"],
    "alertThresholds": [{"metric": "cpu", "threshold": ">80%", "action": "investigate"}],
    "communicationPlan": {
      "stakeholders": ["who to notify"],
      "updateFrequency": "how often to update",
      "escalationCriteria": ["when to escalate communication"]
    }
  },
  "aiInsights": {
    "similarIncidents": [{"id": "inc-123", "title": "similar", "resolution": "how fixed", "resolutionTime": "2h", "lessonsLearned": "insight"}],
    "relatedProblems": [{"id": "prb-456", "title": "related", "status": "investigating", "rootCause": "cause"}],
    "suggestedActions": ["immediate actions", "investigation steps"],
    "riskFactors": ["potential risks"],
    "preventionMeasures": ["how to prevent recurrence"]
  }
}

Base recommendations on ITIL best practices and actual infrastructure context.`
}

async function updateIncidentWithAIInsights(
  incidentId: string,
  analysis: IncidentClassification,
  organizationId: string
): Promise<any> {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Prepare AI insights metadata
    const aiMetadata = {
      ai_analysis: {
        assessment: analysis.assessment,
        categorization: analysis.categorization,
        escalation: analysis.escalation,
        ai_insights: analysis.aiInsights,
        analyzed_at: new Date().toISOString(),
        confidence: analysis.assessment.confidence
      }
    }

    // Update incident with AI recommendations
    const { data, error } = await supabase
      .from('incidents')
      .update({
        criticality: analysis.assessment.recommendedCriticality,
        urgency: analysis.assessment.recommendedUrgency,
        priority: analysis.assessment.calculatedPriority,
        ai_metadata: aiMetadata
      })
      .eq('id', incidentId)
      .eq('organization_id', organizationId)
      .select()
      .single()

    if (error) {
      console.error('Error updating incident:', error)
      return { success: false, error: error.message }
    }

    return { success: true, updated: data }
  } catch (error) {
    console.error('Error updating incident with AI insights:', error)
    return { success: false, error: 'Failed to update incident' }
  }
}

function createFallbackClassification(
  title: string,
  description: string,
  currentCriticality?: string,
  currentUrgency?: string
): IncidentClassification {
  return {
    assessment: {
      recommendedCriticality: (currentCriticality as any) || 'medium',
      recommendedUrgency: (currentUrgency as any) || 'medium',
      calculatedPriority: 'medium',
      confidence: 0.1,
      reasoning: {
        criticalityJustification: 'AI analysis unavailable, using provided or default values',
        urgencyJustification: 'AI analysis unavailable, using provided or default values',
        priorityExplanation: 'Using medium priority as fallback when AI is unavailable'
      }
    },
    categorization: {
      primaryCategory: 'system',
      subCategory: 'general',
      serviceType: 'application',
      impactScope: 'multiple-users',
      complexity: 'moderate'
    },
    escalation: {
      shouldEscalate: false,
      escalationLevel: 'l1',
      escalationReason: 'Manual assessment required',
      escalationTimeframe: '1 hour if unresolved'
    },
    resolution: {
      estimatedResolutionTime: 'To be determined',
      suggestedSkills: ['General IT support'],
      requiredResources: ['Standard tools'],
      resolutionApproach: ['Manual investigation required'],
      knowledgeBaseReferences: []
    },
    monitoring: {
      keyMetrics: ['System availability'],
      alertThresholds: [],
      communicationPlan: {
        stakeholders: ['Technical team'],
        updateFrequency: 'Hourly',
        escalationCriteria: ['No progress after 4 hours']
      }
    },
    aiInsights: {
      similarIncidents: [],
      relatedProblems: [],
      suggestedActions: ['Manual analysis required due to AI unavailability'],
      riskFactors: ['Unknown without AI analysis'],
      preventionMeasures: ['To be determined']
    }
  }
}