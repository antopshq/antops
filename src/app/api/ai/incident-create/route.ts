import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { ITILPromptTemplates } from '@/lib/itil-prompts'
import { ITILDataFetcher } from '@/lib/itil-data-fetcher'
import { AICache } from '@/lib/ai-cache'
import { parseAIResponse } from '@/lib/ai-json-parser'

interface AIIncidentCreateRequest {
  description: string
  urgencyHint?: 'low' | 'medium' | 'high' | 'critical'
  skipCache?: boolean
}

interface StructuredIncidentAnalysis {
  // Basic incident data
  title: string
  description: string
  criticality: 'low' | 'medium' | 'high' | 'critical'
  urgency: 'low' | 'medium' | 'high' | 'critical'
  priority: 'low' | 'medium' | 'high' | 'critical'
  category: string
  affectedComponents: string[]
  
  // Structured analysis sections
  analysis: {
    problem: {
      description: string
      symptoms: string[]
      scope: string
    }
    impact: {
      businessImpact: string
      userImpact: string
      affectedSystems: string[]
      estimatedDowntime: string
      riskLevel: 'low' | 'medium' | 'high' | 'critical'
    }
    investigation: {
      immediateSteps: string[]
      dataToCollect: string[]
      teamsToNotify: string[]
      escalationTriggers: string[]
    }
    questions: {
      troubleshooting: string[]
      stakeholder: string[]
      technical: string[]
    }
  }
  
  // Metadata
  confidence: number
  suggestedActions: string[]
  estimatedResolutionTime: string
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: AIIncidentCreateRequest = await request.json()
    const { description, urgencyHint, skipCache } = body

    if (!description || description.trim().length < 10) {
      return NextResponse.json({
        error: 'Description must be at least 10 characters long'
      }, { status: 400 })
    }

    // Generate cache parameters
    const cacheParams = {
      description: description.trim(),
      urgencyHint: urgencyHint || 'medium',
      organizationId: user.organizationId
    }

    // Try to get cached response
    if (!skipCache) {
      const cached = await AICache.get(
        user.organizationId,
        'incident_create',
        cacheParams,
        { ttlHours: 24 }
      )

      if (cached) {
        return NextResponse.json({
          status: 'success',
          message: 'AI incident analysis completed (cached)',
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

    // Fetch infrastructure and historical data
    const [components, recentIncidents, problems] = await Promise.all([
      ITILDataFetcher.getInfrastructureComponents(user.organizationId, 50),
      ITILDataFetcher.getRecentIncidents(user.organizationId, 30, 10),
      ITILDataFetcher.getHistoricalProblems(user.organizationId, undefined, 5)
    ])

    // Create enhanced prompt for structured incident analysis
    const prompt = `Analyze this incident description and create a comprehensive structured analysis:

"${description}"

Infrastructure context: ${components.map(c => `${c.name}:${c.type}:${c.environment}`).join(' ')}
Recent incident patterns: ${recentIncidents.map(i => `${i.priority}:${i.title}`).slice(0, 5).join(' | ')}
Known problems: ${problems.map(p => `${p.title}:${p.status}`).slice(0, 3).join(' | ')}
Urgency hint: ${urgencyHint || 'assess based on description'}

Return JSON with this exact structure:
{
  "title": "Clear, actionable title (max 100 chars)",
  "description": "Technical description (max 500 chars)",
  "criticality": "low|medium|high|critical",
  "urgency": "low|medium|high|critical", 
  "priority": "calculated using ITIL matrix",
  "category": "category based on type of issue",
  "affectedComponents": ["exact component names from infrastructure"],
  "analysis": {
    "problem": {
      "description": "What exactly is wrong",
      "symptoms": ["Observable symptoms", "User reports"],
      "scope": "Who/what is affected"
    },
    "impact": {
      "businessImpact": "Effect on business operations",
      "userImpact": "Effect on end users", 
      "affectedSystems": ["Systems involved"],
      "estimatedDowntime": "Estimated duration",
      "riskLevel": "low|medium|high|critical"
    },
    "investigation": {
      "immediateSteps": ["First actions to take", "Quick checks"],
      "dataToCollect": ["Logs to check", "Metrics to review"],
      "teamsToNotify": ["Relevant teams"],
      "escalationTriggers": ["When to escalate"]
    },
    "questions": {
      "troubleshooting": ["Technical questions to investigate"],
      "stakeholder": ["Questions for users/business"],
      "technical": ["Questions for technical teams"]
    }
  },
  "confidence": 0.85,
  "suggestedActions": ["Immediate actions", "Next steps"],
  "estimatedResolutionTime": "time estimate"
}

Focus on actionable insights and use exact component names from infrastructure.`

    // Generate AI analysis
    const result = await ITILPromptTemplates.generateCompletion(
      prompt,
      user.organizationId,
      'incident-create-analysis',
      1200
    )

    // Parse and validate response
    let analysisResult: StructuredIncidentAnalysis
    try {
      analysisResult = parseAIResponse(result.content)
    } catch (error) {
      console.error('Failed to parse AI response:', result.content)
      return NextResponse.json({
        status: 'error',
        message: 'Failed to parse AI analysis',
        fallback: {
          title: description.slice(0, 100),
          description: description,
          criticality: urgencyHint || 'medium',
          urgency: urgencyHint || 'medium',
          priority: urgencyHint || 'medium',
          category: 'system',
          affectedComponents: [],
          confidence: 0.3
        }
      }, { status: 500 })
    }

    // Validate and filter affected components against actual infrastructure
    const validComponents = analysisResult.affectedComponents.filter(comp =>
      components.some(c => c.name === comp)
    )
    analysisResult.affectedComponents = validComponents

    // Cache the successful response
    if (!skipCache) {
      await AICache.set(
        user.organizationId,
        'incident_create',
        cacheParams,
        analysisResult,
        {
          confidenceScore: analysisResult.confidence,
          tokenUsage: result.usage,
          cost: result.cost
        },
        { ttlHours: 24 }
      )
    }

    return NextResponse.json({
      status: 'success',
      message: 'AI incident analysis completed',
      cached: false,
      result: analysisResult,
      metadata: {
        inputTokens: result.usage?.prompt_tokens || 0,
        outputTokens: result.usage?.completion_tokens || 0,
        totalTokens: result.usage?.total_tokens || 0,
        cost: result.cost,
        costFormatted: `$${result.cost.toFixed(6)}`,
        confidence: analysisResult.confidence,
        componentsFound: validComponents.length,
        model: 'gpt-4o-mini'
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('AI incident create error:', error)
    
    // Provide fallback response
    const fallbackTitle = request.url?.includes('description') 
      ? (await request.json()).description?.slice(0, 100) || 'System Issue'
      : 'System Issue'
    
    return NextResponse.json({
      status: 'error',
      message: 'AI analysis failed, providing fallback',
      fallback: {
        title: fallbackTitle,
        description: 'AI analysis temporarily unavailable. Please fill in details manually.',
        criticality: 'medium',
        urgency: 'medium', 
        priority: 'medium',
        category: 'system',
        affectedComponents: [],
        analysis: {
          problem: {
            description: 'Issue requires manual analysis',
            symptoms: ['Reported by user'],
            scope: 'To be determined'
          },
          impact: {
            businessImpact: 'To be assessed',
            userImpact: 'To be assessed',
            affectedSystems: [],
            estimatedDowntime: 'Unknown',
            riskLevel: 'medium'
          },
          investigation: {
            immediateSteps: ['Gather more information', 'Check system status'],
            dataToCollect: ['System logs', 'User reports'],
            teamsToNotify: ['Technical team'],
            escalationTriggers: ['If issue persists beyond 1 hour']
          },
          questions: {
            troubleshooting: ['What are the exact symptoms?', 'When did this start?'],
            stakeholder: ['How many users are affected?'],
            technical: ['Are there any recent changes?']
          }
        },
        confidence: 0.1,
        suggestedActions: ['Manual investigation required'],
        estimatedResolutionTime: 'To be determined'
      },
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 200 }) // Return 200 with fallback to allow UI to handle gracefully
  }
}