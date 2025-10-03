import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-enhanced'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user and organization
    const authContext = await getAuthenticatedUser(request)
    if (!authContext.isAuthenticated || !authContext.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user } = authContext
    const supabase = await createSupabaseServerClient()

    // Check if user has permission to access billing (owners and admins only)
    if (!['owner', 'admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions. Only owners and admins can access billing.' }, { status: 403 })
    }

    // Get billing integration configuration
    const { data: integration, error: integrationError } = await supabase
      .from('billing_integrations')
      .select('stripe_customer_id')
      .eq('organization_id', user.organizationId)
      .single()

    if (integrationError || !integration?.stripe_customer_id) {
      return NextResponse.json({ error: 'No Stripe customer found. Please set up billing first.' }, { status: 404 })
    }

    // Parse request body for return URL
    const body = await request.json()
    const { return_url } = body

    // For now, return a placeholder response since we don't have Stripe configured yet
    // In a real implementation, you would create a Stripe customer portal session here
    const mockPortalUrl = `https://billing.stripe.com/p/login/test_${integration.stripe_customer_id}`
    
    return NextResponse.json({ 
      url: mockPortalUrl,
      message: 'Customer portal URL generated. This is a placeholder until Stripe is configured.' 
    })

    // Real Stripe implementation would look like this:
    /*
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
    
    const session = await stripe.billingPortal.sessions.create({
      customer: integration.stripe_customer_id,
      return_url: return_url || `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=integrations`,
    })

    return NextResponse.json({ url: session.url })
    */
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}