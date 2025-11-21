import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { openaiClient } from '@/lib/openai-client'

export async function GET() {
  try {
    // Verify user authentication
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Perform OpenAI health check
    const healthCheck = await openaiClient.healthCheck()
    
    return NextResponse.json({
      status: 'success',
      message: 'OpenAI integration test completed',
      organizationId: user.organizationId,
      openai: healthCheck,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('OpenAI test endpoint error:', error)
    
    return NextResponse.json({
      status: 'error',
      message: 'OpenAI integration test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { prompt, maxTokens = 150, temperature = 0.7 } = body

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({
        error: 'prompt is required and must be a string'
      }, { status: 400 })
    }

    // Test OpenAI completion
    const result = await openaiClient.generateCompletion(
      [{ role: 'user', content: prompt }],
      user.organizationId,
      'test-endpoint',
      { maxTokens, temperature }
    )

    return NextResponse.json({
      status: 'success',
      message: 'OpenAI completion generated successfully',
      organizationId: user.organizationId,
      result: {
        content: result.content,
        usage: result.usage,
        cost: result.cost,
        costFormatted: `$${result.cost.toFixed(6)}`
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('OpenAI test completion error:', error)
    
    return NextResponse.json({
      status: 'error',
      message: 'OpenAI completion test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}