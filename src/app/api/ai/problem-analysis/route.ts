import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { ITILPromptTemplates } from '@/lib/itil-prompts'
import { ITILDataFetcher } from '@/lib/itil-data-fetcher'
import { AICache } from '@/lib/ai-cache'
import { createSupabaseServerClient } from '@/lib/supabase'

interface ProblemAnalysisRequest {
  problemId?: string // Existing problem ID
  title: string
  description: string
  affectedComponents: string[]
  relatedIncidentIds?: string[]
  timeframe?: number // Days to look back for related incidents
  skipCache?: boolean
  updateProblem?: boolean // Whether to update problem with analysis
}

interface RootCauseAnalysis {
  summary: {
    primaryRootCause: string
    confidence: number
    analysisType: 'pattern-based' | 'component-based' | 'timeline-based' | 'hybrid'
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
  }
  
  rootCauses: Array<{
    cause: string
    probability: number
    category: 'technical' | 'process' | 'human' | 'environmental' | 'external'
    evidence: string[]
    supportingIncidents: Array<{
      id: string
      title: string
      date: string
      relevance: number
    }>
    investigationSteps: string[]
  }>
  
  patterns: {
    temporalPatterns: Array<{
      pattern: string
      occurrences: number
      timeframes: string[]
      significance: number
    }>
    componentPatterns: Array<{
      component: string
      failureType: string
      frequency: number
      impact: string
    }>
    environmentalFactors: Array<{
      factor: string
      correlation: number
      description: string
    }>
  }
  
  impact: {
    businessImpact: {
      affectedProcesses: string[]
      financialImpact: string
      reputationalRisk: string
      complianceRisk: string
    }
    technicalImpact: {
      systemsAffected: string[]
      performanceDegradation: string
      securityImplications: string
      dataIntegrity: string
    }
    operationalImpact: {
      workflowDisruption: string
      resourceRequirements: string
      skillsNeeded: string[]
      timeToResolve: string
    }
  }
  
  solutions: {
    immediateActions: Array<{
      action: string
      priority: 'high' | 'medium' | 'low'
      owner: string
      timeframe: string
      resources: string[]
    }>
    shortTermFixes: Array<{
      solution: string
      effort: 'low' | 'medium' | 'high'
      impact: string
      dependencies: string[]
      risks: string[]
    }>
    longTermSolutions: Array<{
      solution: string
      strategicValue: string
      investmentRequired: string
      timeline: string
      benefits: string[]
    }>
  }
  
  prevention: {
    processImprovements: Array<{
      process: string
      currentGap: string
      recommendation: string
      implementation: string
    }>
    technologyEnhancements: Array<{
      technology: string
      enhancement: string
      benefit: string
      cost: string
    }>
    trainingNeeds: Array<{
      audience: string
      topic: string
      urgency: 'high' | 'medium' | 'low'
      format: string
    }>
    monitoringImprovements: Array<{
      system: string
      metric: string
      threshold: string
      alerting: string
    }>
  }
  
  knowledgeBase: {
    documentationNeeds: string[]
    proceduralGaps: string[]
    bestPractices: string[]
    lessonsLearned: string[]
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: ProblemAnalysisRequest = await request.json()
    const { 
      problemId, 
      title, 
      description, 
      affectedComponents, 
      relatedIncidentIds,
      timeframe = 90,
      skipCache,
      updateProblem
    } = body

    if (!title || !description || !affectedComponents || affectedComponents.length === 0) {
      return NextResponse.json({
        error: 'Title, description, and affected components are required'
      }, { status: 400 })
    }

    // Generate cache parameters
    const cacheParams = {
      title: title.trim(),
      description: description.trim(),
      affectedComponents: affectedComponents.sort(),
      timeframe,
      organizationId: user.organizationId
    }

    // Try to get cached response
    if (!skipCache) {
      const cached = await AICache.get(
        user.organizationId,
        'problem_analysis',
        cacheParams,
        { ttlHours: 48 }
      )

      if (cached) {
        return NextResponse.json({
          status: 'success',
          message: 'Problem root cause analysis completed (cached)',
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

    // Fetch comprehensive analysis data
    const [
      components,
      relatedIncidents,
      historicalProblems,
      recentChanges,
      infrastructureRelationships,
      specificIncidents
    ] = await Promise.all([
      ITILDataFetcher.getInfrastructureComponents(user.organizationId, 100),
      ITILDataFetcher.getIncidentsByComponents(user.organizationId, affectedComponents, 50),
      ITILDataFetcher.getHistoricalProblems(user.organizationId, affectedComponents, 20),
      ITILDataFetcher.getRecentChanges(user.organizationId, timeframe, 30),
      ITILDataFetcher.getInfrastructureRelationships(user.organizationId, affectedComponents, 50),
      relatedIncidentIds ? fetchSpecificIncidents(user.organizationId, relatedIncidentIds) : []
    ])

    // Analyze incident patterns
    const incidentAnalysis = analyzeIncidentPatterns(relatedIncidents, timeframe)
    const changeCorrelation = analyzeChangeCorrelation(relatedIncidents, recentChanges)

    // Create comprehensive analysis prompt
    const prompt = createProblemAnalysisPrompt(
      title,
      description,
      affectedComponents,
      components,
      relatedIncidents,
      specificIncidents,
      historicalProblems,
      recentChanges,
      infrastructureRelationships,
      incidentAnalysis,
      changeCorrelation,
      timeframe
    )

    // Generate AI analysis
    const result = await ITILPromptTemplates.generateCompletion(
      prompt,
      user.organizationId,
      'problem-root-cause-analysis',
      1800
    )

    // Parse and validate response
    let analysisResult: RootCauseAnalysis
    try {
      analysisResult = JSON.parse(result.content)
    } catch (error) {
      console.error('Failed to parse AI response:', result.content)
      return NextResponse.json({
        status: 'error',
        message: 'Failed to parse AI analysis',
        fallback: createFallbackAnalysis(title, description, affectedComponents)
      }, { status: 500 })
    }

    // Enhance analysis with real data validation
    analysisResult = enhanceWithIncidentData(analysisResult, relatedIncidents, components)

    // Update problem with analysis if requested
    let updateResult = null
    if (updateProblem && problemId) {
      updateResult = await updateProblemWithAnalysis(
        problemId,
        analysisResult,
        user.organizationId
      )
    }

    // Cache the successful response
    if (!skipCache) {
      await AICache.set(
        user.organizationId,
        'problem_analysis',
        cacheParams,
        analysisResult,
        {
          confidenceScore: analysisResult.summary.confidence,
          tokenUsage: result.usage,
          cost: result.cost
        },
        { ttlHours: 48 }
      )
    }

    return NextResponse.json({
      status: 'success',
      message: 'Problem root cause analysis completed',
      cached: false,
      result: analysisResult,
      updateResult,
      metadata: {
        inputTokens: result.usage?.prompt_tokens || 0,
        outputTokens: result.usage?.completion_tokens || 0,
        totalTokens: result.usage?.total_tokens || 0,
        cost: result.cost,
        costFormatted: `$${result.cost.toFixed(6)}`,
        confidence: analysisResult.summary.confidence,
        incidentsAnalyzed: relatedIncidents.length,
        problemsAnalyzed: historicalProblems.length,
        problemUpdated: !!updateResult,
        model: 'gpt-4o-mini'
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Problem analysis error:', error)
    
    return NextResponse.json({
      status: 'error',
      message: 'Problem root cause analysis failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Helper functions

async function fetchSpecificIncidents(organizationId: string, incidentIds: string[]): Promise<any[]> {
  try {
    const supabase = await createSupabaseServerClient()
    
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .eq('organization_id', organizationId)
      .in('id', incidentIds)

    if (error) {
      console.error('Error fetching specific incidents:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Failed to fetch specific incidents:', error)
    return []
  }
}

function analyzeIncidentPatterns(incidents: any[], timeframeDays: number): any {
  if (incidents.length === 0) return { patterns: [], frequency: 0 }

  // Group incidents by time periods
  const now = new Date()
  const timeBlocks = {
    recent: 0,    // Last 7 days
    weekly: 0,    // 8-30 days
    monthly: 0,   // 31-90 days
    older: 0      // 90+ days
  }

  const priorityDistribution = { low: 0, medium: 0, high: 0, critical: 0 }
  const statusDistribution = { open: 0, investigating: 0, resolved: 0, closed: 0 }

  incidents.forEach(incident => {
    const incidentDate = new Date(incident.created_at)
    const daysDiff = Math.floor((now.getTime() - incidentDate.getTime()) / (1000 * 60 * 60 * 24))

    if (daysDiff <= 7) timeBlocks.recent++
    else if (daysDiff <= 30) timeBlocks.weekly++
    else if (daysDiff <= 90) timeBlocks.monthly++
    else timeBlocks.older++

    priorityDistribution[incident.priority as keyof typeof priorityDistribution]++
    statusDistribution[incident.status as keyof typeof statusDistribution]++
  })

  return {
    timeBlocks,
    priorityDistribution,
    statusDistribution,
    totalIncidents: incidents.length,
    frequency: incidents.length / timeframeDays * 30 // incidents per month
  }
}

function analyzeChangeCorrelation(incidents: any[], changes: any[]): any {
  if (incidents.length === 0 || changes.length === 0) {
    return { correlatedChanges: [], correlationStrength: 0 }
  }

  const correlatedChanges = []
  
  for (const change of changes) {
    const changeDate = new Date(change.scheduled_for || change.created_at)
    
    // Find incidents within 48 hours after change
    const relatedIncidents = incidents.filter(incident => {
      const incidentDate = new Date(incident.created_at)
      const timeDiff = incidentDate.getTime() - changeDate.getTime()
      return timeDiff >= 0 && timeDiff <= (48 * 60 * 60 * 1000) // 48 hours
    })

    if (relatedIncidents.length > 0) {
      correlatedChanges.push({
        change: change.title,
        changeDate: change.scheduled_for || change.created_at,
        relatedIncidents: relatedIncidents.map(i => ({ id: i.id, title: i.title })),
        timeGap: relatedIncidents.map(i => 
          Math.floor((new Date(i.created_at).getTime() - changeDate.getTime()) / (1000 * 60 * 60))
        )
      })
    }
  }

  const correlationStrength = correlatedChanges.length / Math.max(changes.length, 1)

  return { correlatedChanges, correlationStrength }
}

function createProblemAnalysisPrompt(
  title: string,
  description: string,
  affectedComponents: string[],
  components: any[],
  relatedIncidents: any[],
  specificIncidents: any[],
  historicalProblems: any[],
  recentChanges: any[],
  relationships: any[],
  incidentAnalysis: any,
  changeCorrelation: any,
  timeframe: number
): string {
  const componentData = affectedComponents.map(name => {
    const comp = components.find(c => c.name === name)
    return `${name}:${comp?.type || 'unknown'}:${comp?.environment || 'unknown'}`
  }).join(' ')

  const incidentData = relatedIncidents.slice(0, 10).map(inc => 
    `${inc.title}:${inc.priority}:${inc.status}:${inc.created_at}`
  ).join(' | ')

  const problemData = historicalProblems.slice(0, 5).map(p => 
    `${p.title}:${p.status}:${p.root_cause || 'unknown'}`
  ).join(' | ')

  const changeData = recentChanges.slice(0, 8).map(c => 
    `${c.title}:${c.status}:${c.scheduled_for || c.created_at}`
  ).join(' | ')

  const relationshipData = relationships.map(r => `${r.source}->${r.target}`).join(' ')

  return `Perform comprehensive root cause analysis for this problem:

Problem: "${title}"
Description: "${description}"
Affected Components: ${componentData}
Analysis Period: ${timeframe} days

Incident Analysis:
- Total incidents: ${incidentAnalysis.totalIncidents}
- Frequency: ${incidentAnalysis.frequency.toFixed(2)} incidents/month
- Recent patterns: ${JSON.stringify(incidentAnalysis.timeBlocks)}
- Priority distribution: ${JSON.stringify(incidentAnalysis.priorityDistribution)}

Change Correlation:
- Correlation strength: ${(changeCorrelation.correlationStrength * 100).toFixed(1)}%
- Correlated changes: ${changeCorrelation.correlatedChanges.length}

Data Context:
Related incidents: ${incidentData || 'None'}
Historical problems: ${problemData || 'None'}
Recent changes: ${changeData || 'None'}
Dependencies: ${relationshipData || 'None'}

Return comprehensive JSON analysis:
{
  "summary": {
    "primaryRootCause": "most likely root cause",
    "confidence": 0.85,
    "analysisType": "pattern-based|component-based|timeline-based|hybrid",
    "riskLevel": "low|medium|high|critical"
  },
  "rootCauses": [
    {
      "cause": "specific root cause",
      "probability": 0.7,
      "category": "technical|process|human|environmental|external",
      "evidence": ["supporting evidence"],
      "supportingIncidents": [{"id": "inc-123", "title": "title", "date": "2024-01-01", "relevance": 0.8}],
      "investigationSteps": ["detailed investigation steps"]
    }
  ],
  "patterns": {
    "temporalPatterns": [{"pattern": "description", "occurrences": 5, "timeframes": ["timeframe"], "significance": 0.8}],
    "componentPatterns": [{"component": "name", "failureType": "type", "frequency": 3, "impact": "description"}],
    "environmentalFactors": [{"factor": "factor", "correlation": 0.6, "description": "explanation"}]
  },
  "impact": {
    "businessImpact": {
      "affectedProcesses": ["processes"],
      "financialImpact": "impact description",
      "reputationalRisk": "risk description",
      "complianceRisk": "compliance impact"
    },
    "technicalImpact": {
      "systemsAffected": ["systems"],
      "performanceDegradation": "performance impact",
      "securityImplications": "security risks",
      "dataIntegrity": "data impact"
    },
    "operationalImpact": {
      "workflowDisruption": "workflow impact",
      "resourceRequirements": "resources needed",
      "skillsNeeded": ["required skills"],
      "timeToResolve": "estimated time"
    }
  },
  "solutions": {
    "immediateActions": [{"action": "action", "priority": "high", "owner": "role", "timeframe": "time", "resources": ["resources"]}],
    "shortTermFixes": [{"solution": "solution", "effort": "medium", "impact": "impact", "dependencies": ["deps"], "risks": ["risks"]}],
    "longTermSolutions": [{"solution": "solution", "strategicValue": "value", "investmentRequired": "investment", "timeline": "timeline", "benefits": ["benefits"]}]
  },
  "prevention": {
    "processImprovements": [{"process": "process", "currentGap": "gap", "recommendation": "improvement", "implementation": "how to implement"}],
    "technologyEnhancements": [{"technology": "tech", "enhancement": "improvement", "benefit": "benefit", "cost": "cost estimate"}],
    "trainingNeeds": [{"audience": "who", "topic": "what", "urgency": "high", "format": "format"}],
    "monitoringImprovements": [{"system": "system", "metric": "metric", "threshold": "threshold", "alerting": "alert setup"}]
  },
  "knowledgeBase": {
    "documentationNeeds": ["documentation gaps"],
    "proceduralGaps": ["procedure gaps"],
    "bestPractices": ["recommended practices"],
    "lessonsLearned": ["key lessons"]
  }
}

Focus on actionable insights, real patterns from data, and practical solutions.`
}

function enhanceWithIncidentData(
  analysis: RootCauseAnalysis,
  incidents: any[],
  components: any[]
): RootCauseAnalysis {
  // Validate component references
  const validComponents = components.map(c => c.name)
  
  // Update component patterns with validated components
  analysis.patterns.componentPatterns = analysis.patterns.componentPatterns.filter(pattern =>
    validComponents.includes(pattern.component)
  )

  // Enhance supporting incidents with real data
  analysis.rootCauses.forEach(rootCause => {
    rootCause.supportingIncidents = rootCause.supportingIncidents.filter(ref =>
      incidents.some(inc => inc.id === ref.id)
    ).map(ref => {
      const incident = incidents.find(inc => inc.id === ref.id)
      return {
        ...ref,
        title: incident?.title || ref.title,
        date: incident?.created_at || ref.date
      }
    })
  })

  return analysis
}

async function updateProblemWithAnalysis(
  problemId: string,
  analysis: RootCauseAnalysis,
  organizationId: string
): Promise<any> {
  try {
    const supabase = await createSupabaseServerClient()
    
    const aiMetadata = {
      root_cause_analysis: {
        summary: analysis.summary,
        primary_root_cause: analysis.summary.primaryRootCause,
        confidence: analysis.summary.confidence,
        solutions: analysis.solutions,
        prevention: analysis.prevention,
        analyzed_at: new Date().toISOString()
      }
    }

    const { data, error } = await supabase
      .from('problems')
      .update({
        root_cause: analysis.summary.primaryRootCause,
        ai_metadata: aiMetadata
      })
      .eq('id', problemId)
      .eq('organization_id', organizationId)
      .select()
      .single()

    if (error) {
      console.error('Error updating problem:', error)
      return { success: false, error: error.message }
    }

    return { success: true, updated: data }
  } catch (error) {
    console.error('Error updating problem with analysis:', error)
    return { success: false, error: 'Failed to update problem' }
  }
}

function createFallbackAnalysis(
  title: string,
  description: string,
  affectedComponents: string[]
): RootCauseAnalysis {
  return {
    summary: {
      primaryRootCause: 'Manual investigation required - AI analysis unavailable',
      confidence: 0.1,
      analysisType: 'hybrid',
      riskLevel: 'medium'
    },
    rootCauses: [{
      cause: 'Unknown - requires manual investigation',
      probability: 0.5,
      category: 'technical',
      evidence: ['AI analysis temporarily unavailable'],
      supportingIncidents: [],
      investigationSteps: [
        'Gather detailed incident information',
        'Analyze system logs',
        'Interview stakeholders',
        'Review recent changes'
      ]
    }],
    patterns: {
      temporalPatterns: [],
      componentPatterns: [],
      environmentalFactors: []
    },
    impact: {
      businessImpact: {
        affectedProcesses: ['To be determined'],
        financialImpact: 'To be assessed',
        reputationalRisk: 'To be evaluated',
        complianceRisk: 'To be reviewed'
      },
      technicalImpact: {
        systemsAffected: affectedComponents,
        performanceDegradation: 'To be measured',
        securityImplications: 'To be assessed',
        dataIntegrity: 'To be verified'
      },
      operationalImpact: {
        workflowDisruption: 'To be determined',
        resourceRequirements: 'Standard investigation team',
        skillsNeeded: ['General troubleshooting'],
        timeToResolve: 'To be estimated'
      }
    },
    solutions: {
      immediateActions: [{
        action: 'Begin manual root cause investigation',
        priority: 'high',
        owner: 'Technical lead',
        timeframe: 'Immediate',
        resources: ['Investigation team', 'Access to systems']
      }],
      shortTermFixes: [],
      longTermSolutions: []
    },
    prevention: {
      processImprovements: [],
      technologyEnhancements: [],
      trainingNeeds: [],
      monitoringImprovements: []
    },
    knowledgeBase: {
      documentationNeeds: ['Root cause analysis documentation'],
      proceduralGaps: ['AI-assisted analysis procedures'],
      bestPractices: [],
      lessonsLearned: []
    }
  }
}