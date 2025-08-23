import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { ITILPromptTemplates } from '@/lib/itil-prompts'
import { ITILDataFetcher } from '@/lib/itil-data-fetcher'

export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      type, 
      description, 
      components, 
      changeDescription,
      maxTokens = 800 
    } = body

    if (!type) {
      return NextResponse.json({
        error: 'type is required (incident, impact, rootcause, dependency)'
      }, { status: 400 })
    }

    let prompt: string
    let endpoint: string

    switch (type) {
      case 'incident':
        if (!description) {
          return NextResponse.json({
            error: 'description is required for incident analysis'
          }, { status: 400 })
        }

        // Fetch real infrastructure and incident data
        const [infraComponents, recentIncidents] = await Promise.all([
          ITILDataFetcher.getInfrastructureComponents(user.organizationId, 50),
          ITILDataFetcher.getRecentIncidents(user.organizationId, 30, 10)
        ])

        prompt = ITILPromptTemplates.createIncidentAnalysisPrompt(
          description, 
          infraComponents, 
          recentIncidents
        )
        endpoint = 'incident-analysis'
        break

      case 'impact':
        if (!components || !Array.isArray(components)) {
          return NextResponse.json({
            error: 'components array is required for impact analysis'
          }, { status: 400 })
        }

        // Fetch infrastructure and relationships
        const [allComponents, relationships] = await Promise.all([
          ITILDataFetcher.getInfrastructureComponents(user.organizationId, 100),
          ITILDataFetcher.getInfrastructureRelationships(user.organizationId, components, 50)
        ])

        prompt = ITILPromptTemplates.createImpactAnalysisPrompt(
          components,
          allComponents,
          relationships
        )
        endpoint = 'impact-analysis'
        break

      case 'rootcause':
        if (!description || !components) {
          return NextResponse.json({
            error: 'description and components are required for root cause analysis'
          }, { status: 400 })
        }

        const affectedComponents = Array.isArray(components) ? components : [components]

        // Fetch historical data for pattern analysis
        const [historicalIncidents, recentChanges] = await Promise.all([
          ITILDataFetcher.getIncidentsByComponents(user.organizationId, affectedComponents, 10),
          ITILDataFetcher.getRecentChanges(user.organizationId, 7, 5)
        ])

        prompt = ITILPromptTemplates.createRootCauseAnalysisPrompt(
          description,
          affectedComponents,
          historicalIncidents,
          recentChanges
        )
        endpoint = 'root-cause-analysis'
        break

      case 'dependency':
        if (!components || typeof components !== 'string') {
          return NextResponse.json({
            error: 'component name (string) is required for dependency analysis'
          }, { status: 400 })
        }

        // Fetch infrastructure and relationships for the specific component
        const [compData, depRelationships] = await Promise.all([
          ITILDataFetcher.getInfrastructureComponents(user.organizationId, 100),
          ITILDataFetcher.getInfrastructureRelationships(user.organizationId, [components], 100)
        ])

        prompt = ITILPromptTemplates.createDependencyAnalysisPrompt(
          components,
          compData,
          depRelationships,
          changeDescription
        )
        endpoint = 'dependency-analysis'
        break

      default:
        return NextResponse.json({
          error: 'Invalid type. Use: incident, impact, rootcause, dependency'
        }, { status: 400 })
    }

    // Generate completion using OpenAI
    const result = await ITILPromptTemplates.generateCompletion(
      prompt,
      user.organizationId,
      endpoint,
      maxTokens
    )

    // Parse and validate response
    let analysisResult: any = null
    try {
      analysisResult = JSON.parse(result.content)
    } catch (error) {
      return NextResponse.json({
        status: 'error',
        message: 'Failed to parse AI response as JSON',
        rawResponse: result.content,
        error: 'Invalid JSON response from AI'
      }, { status: 500 })
    }

    return NextResponse.json({
      status: 'success',
      message: `ITIL ${type} analysis completed successfully`,
      organizationId: user.organizationId,
      analysisType: type,
      result: analysisResult,
      metadata: {
        inputTokens: result.usage?.prompt_tokens || 0,
        outputTokens: result.usage?.completion_tokens || 0,
        totalTokens: result.usage?.total_tokens || 0,
        cost: result.cost,
        costFormatted: `$${result.cost.toFixed(6)}`,
        model: 'gpt-4o-mini'
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('ITIL analyze endpoint error:', error)
    
    return NextResponse.json({
      status: 'error',
      message: 'ITIL analysis failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}