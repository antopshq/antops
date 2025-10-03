import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-enhanced'
import { createSupabaseServerClient } from '@/lib/supabase'

interface BillingIntegration {
  id?: string
  organization_id: string
  enabled: boolean
  stripe_customer_id?: string
  subscription_id?: string
  subscription_status?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'unpaid' | null
  current_plan: 'free' | 'starter' | 'professional' | 'enterprise'
  billing_email?: string
  billing_interval?: 'month' | 'year'
  price_id?: string
  seats_limit?: number
  incidents_limit?: number
  storage_limit?: number
  current_period_start?: string
  current_period_end?: string
  trial_end?: string
  cancel_at?: string
  canceled_at?: string
  metadata?: Record<string, any>
  created_at?: string
  updated_at?: string
}

export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user and organization
    const authContext = await getAuthenticatedUser(request)
    if (!authContext.isAuthenticated || !authContext.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user } = authContext
    const supabase = await createSupabaseServerClient()

    // Check if user has permission to view billing (owners and admins only)
    if (!['owner', 'admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions. Only owners and admins can access billing.' }, { status: 403 })
    }

    // Get billing integration configuration
    const { data: integration, error: integrationError } = await supabase
      .from('billing_integrations')
      .select('*')
      .eq('organization_id', user.organizationId)
      .single()

    if (integrationError && integrationError.code !== 'PGRST116') {
      console.error('Database error:', integrationError)
      return NextResponse.json({ error: 'Failed to fetch billing configuration' }, { status: 500 })
    }

    // If no integration exists, return default configuration
    if (!integration) {
      const defaultConfig: BillingIntegration = {
        organization_id: user.organizationId,
        enabled: false,
        current_plan: 'free',
        subscription_status: null,
        seats_limit: 5,
        incidents_limit: 100,
        storage_limit: 1
      }
      return NextResponse.json({ integration: defaultConfig })
    }

    return NextResponse.json({ integration })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user and organization
    const authContext = await getAuthenticatedUser(request)
    if (!authContext.isAuthenticated || !authContext.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user } = authContext
    const supabase = await createSupabaseServerClient()

    // Check if user has permission to modify billing (owners and admins only)
    if (!['owner', 'admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions. Only owners and admins can modify billing.' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const {
      enabled,
      billing_email,
      current_plan,
      subscription_status,
      stripe_customer_id,
      subscription_id,
      price_id,
      billing_interval,
      seats_limit,
      incidents_limit,
      storage_limit,
      metadata
    } = body

    // Validate required fields
    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled field is required and must be boolean' }, { status: 400 })
    }

    // Validate current_plan if provided
    if (current_plan && !['free', 'starter', 'professional', 'enterprise'].includes(current_plan)) {
      return NextResponse.json({ error: 'Invalid current_plan value' }, { status: 400 })
    }

    // Validate subscription_status if provided
    if (subscription_status && !['active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid'].includes(subscription_status)) {
      return NextResponse.json({ error: 'Invalid subscription_status value' }, { status: 400 })
    }

    // Validate billing_interval if provided
    if (billing_interval && !['month', 'year'].includes(billing_interval)) {
      return NextResponse.json({ error: 'Invalid billing_interval value' }, { status: 400 })
    }

    // Prepare data for upsert
    const integrationData: Partial<BillingIntegration> = {
      organization_id: user.organizationId,
      enabled,
      billing_email: billing_email || null,
      current_plan: current_plan || 'free',
      subscription_status: subscription_status || null,
      stripe_customer_id: stripe_customer_id || null,
      subscription_id: subscription_id || null,
      price_id: price_id || null,
      billing_interval: billing_interval || null,
      seats_limit: seats_limit || 5,
      incidents_limit: incidents_limit || 100,
      storage_limit: storage_limit || 1,
      metadata: metadata || {}
    }

    // Upsert billing integration configuration
    const { data: integration, error: upsertError } = await supabase
      .from('billing_integrations')
      .upsert(integrationData, { 
        onConflict: 'organization_id',
        ignoreDuplicates: false 
      })
      .select()
      .single()

    if (upsertError) {
      console.error('Database upsert error:', upsertError)
      return NextResponse.json({ error: 'Failed to save billing configuration' }, { status: 500 })
    }

    return NextResponse.json({ 
      integration,
      message: 'Billing configuration saved successfully' 
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}