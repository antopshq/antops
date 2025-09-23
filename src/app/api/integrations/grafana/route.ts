import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-enhanced'
import { createSupabaseServerClient } from '@/lib/supabase'

interface GrafanaIntegration {
  id?: string
  organization_id: string
  enabled: boolean
  webhook_url: string
  api_key?: string
  auto_create_incidents: boolean
  created_at?: string
  updated_at?: string
}

// Get Grafana integration configuration
export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(request)
    if (!authContext.isAuthenticated || !authContext.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = authContext.user

    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase
      .from('grafana_integrations')
      .select('*')
      .eq('organization_id', user.organizationId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error fetching Grafana integration:', error)
      return NextResponse.json({ error: 'Failed to fetch configuration' }, { status: 500 })
    }

    if (data) {
      // Don't return the full API key for security
      const integration = {
        id: data.id,
        enabled: data.enabled,
        webhookUrl: data.webhook_url,
        apiKey: data.api_key ? '***HIDDEN***' : '',
        autoCreateIncidents: data.auto_create_incidents,
        organizationId: data.organization_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
      return NextResponse.json({ integration })
    }

    return NextResponse.json({ integration: null })
  } catch (error) {
    console.error('GET Grafana integration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Save Grafana integration configuration
export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(request)
    if (!authContext.isAuthenticated || !authContext.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = authContext.user

    const body = await request.json()
    const { enabled, webhookUrl, apiKey, autoCreateIncidents } = body

    // Validate required fields when enabled
    if (enabled) {
      if (!webhookUrl) {
        return NextResponse.json({ error: 'Webhook URL is required when integration is enabled' }, { status: 400 })
      }
    }

    const supabase = await createSupabaseServerClient()

    // Check if integration already exists
    const { data: existing } = await supabase
      .from('grafana_integrations')
      .select('id, api_key')
      .eq('organization_id', user.organizationId)
      .single()

    const integrationData: Partial<GrafanaIntegration> = {
      organization_id: user.organizationId,
      enabled,
      webhook_url: webhookUrl,
      auto_create_incidents: autoCreateIncidents !== undefined ? autoCreateIncidents : true,
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
        .from('grafana_integrations')
        .update(integrationData)
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating Grafana integration:', error)
        return NextResponse.json({ error: 'Failed to update configuration' }, { status: 500 })
      }
      result = data
    } else {
      // Create new integration
      integrationData.created_at = new Date().toISOString()
      const { data, error } = await supabase
        .from('grafana_integrations')
        .insert(integrationData)
        .select()
        .single()

      if (error) {
        console.error('Error creating Grafana integration:', error)
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
      autoCreateIncidents: result.auto_create_incidents,
      organizationId: result.organization_id,
      createdAt: result.created_at,
      updatedAt: result.updated_at
    }

    return NextResponse.json({ integration })
  } catch (error) {
    console.error('POST Grafana integration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}