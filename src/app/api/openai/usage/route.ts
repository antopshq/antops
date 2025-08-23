import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { openaiClient } from '@/lib/openai-client'

export async function GET(request: NextRequest) {
  try {
    // Verify user authentication
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')

    if (days < 1 || days > 365) {
      return NextResponse.json({
        error: 'days parameter must be between 1 and 365'
      }, { status: 400 })
    }

    // Get cost summary for the organization
    const costSummary = await openaiClient.getCostSummary(user.organizationId, days)

    return NextResponse.json({
      status: 'success',
      message: `OpenAI usage summary for last ${days} days`,
      organizationId: user.organizationId,
      period: {
        days,
        startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString()
      },
      summary: {
        totalCost: costSummary.totalCost,
        totalCostFormatted: `$${costSummary.totalCost.toFixed(4)}`,
        totalTokens: costSummary.totalTokens,
        requestCount: costSummary.requestCount,
        averageCostPerRequest: costSummary.averageCostPerRequest,
        averageCostPerRequestFormatted: `$${costSummary.averageCostPerRequest.toFixed(6)}`,
        costByModel: Object.entries(costSummary.costByModel).map(([model, cost]) => ({
          model,
          cost,
          costFormatted: `$${cost.toFixed(6)}`
        })),
        costByEndpoint: Object.entries(costSummary.costByEndpoint).map(([endpoint, cost]) => ({
          endpoint,
          cost,
          costFormatted: `$${cost.toFixed(6)}`
        }))
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('OpenAI usage endpoint error:', error)
    
    return NextResponse.json({
      status: 'error',
      message: 'Failed to fetch OpenAI usage data',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}