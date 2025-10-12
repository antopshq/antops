import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-enhanced'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user and organization
    const authContext = await getAuthenticatedUser(request)
    if (!authContext.isAuthenticated || !authContext.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user } = authContext
    
    // Use service role client to bypass RLS for server-side operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

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

    // Create Stripe customer portal session
    const { stripe } = await import('@/lib/stripe')
    
    const session = await stripe.billingPortal.sessions.create({
      customer: integration.stripe_customer_id,
      return_url: return_url || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?tab=integrations`,
    })

    return NextResponse.json({ url: session.url })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}