import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-enhanced'
import { createSupabaseServerClient } from '@/lib/supabase'

interface PagerDutyIntegration {
  id?: string
  organization_id: string
  enabled: boolean
  webhook_url: string
  api_key: string
  routing_key?: string
  created_at?: string
  updated_at?: string
}

// Get PagerDuty integration configuration
export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(request)
    if (!authContext.isAuthenticated || !authContext.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = authContext.user

    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase
      .from('pagerduty_integrations')
      .select('*')
      .eq('organization_id', user.organizationId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error fetching PagerDuty integration:', error)
      return NextResponse.json({ error: 'Failed to fetch configuration' }, { status: 500 })
    }

    if (data) {
      // Don't return the full API key for security
      const integration = {
        id: data.id,
        enabled: data.enabled,
        webhookUrl: data.webhook_url,
        apiKey: data.api_key ? '***HIDDEN***' : '',
        routingKey: data.routing_key || '',
        organizationId: data.organization_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
      return NextResponse.json({ integration })
    }

    return NextResponse.json({ integration: null })
  } catch (error) {
    console.error('GET PagerDuty integration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Save PagerDuty integration configuration
export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(request)
    if (!authContext.isAuthenticated || !authContext.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = authContext.user

    const body = await request.json()
    const { enabled, webhookUrl, apiKey, routingKey } = body

    // Validate required fields when enabled
    if (enabled) {
      if (!webhookUrl) {
        return NextResponse.json({ error: 'Webhook URL is required when integration is enabled' }, { status: 400 })
      }
      if (!apiKey || apiKey === '***HIDDEN***') {
        return NextResponse.json({ error: 'API Key is required when integration is enabled' }, { status: 400 })
      }
    }

    const supabase = await createSupabaseServerClient()

    // Check if integration already exists
    const { data: existing } = await supabase
      .from('pagerduty_integrations')
      .select('id, api_key')
      .eq('organization_id', user.organizationId)
      .single()

    const integrationData: Partial<PagerDutyIntegration> = {
      organization_id: user.organizationId,
      enabled,
      webhook_url: webhookUrl,
      routing_key: routingKey || null,
      updated_at: new Date().toISOString()
    }

    // Only update API key if it's not the hidden placeholder
    if (apiKey && apiKey !== '***HIDDEN***') {
      integrationData.api_key = apiKey
    }

    let result
    if (existing) {
      // Update existing integration
      const { data, error } = await supabase
        .from('pagerduty_integrations')
        .update(integrationData)
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating PagerDuty integration:', error)
        return NextResponse.json({ error: 'Failed to update configuration' }, { status: 500 })
      }
      result = data
    } else {
      // Create new integration
      integrationData.created_at = new Date().toISOString()
      const { data, error } = await supabase
        .from('pagerduty_integrations')
        .insert(integrationData)
        .select()
        .single()

      if (error) {
        console.error('Error creating PagerDuty integration:', error)
        return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 })
      }
      result = data
    }

    // Return the integration data (with hidden API key for security)
    const integration = {
      id: result.id,
      enabled: result.enabled,
      webhookUrl: result.webhook_url,
      apiKey: result.api_key ? '***HIDDEN***' : '',
      routingKey: result.routing_key || '',
      organizationId: result.organization_id,
      createdAt: result.created_at,
      updatedAt: result.updated_at
    }

    return NextResponse.json({ integration })
  } catch (error) {
    console.error('POST PagerDuty integration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}