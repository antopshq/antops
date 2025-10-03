import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-enhanced'
import { createSupabaseServerClient } from '@/lib/supabase'

// Define subscription plans
const SUBSCRIPTION_PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Perfect for small teams getting started',
    price: 0,
    interval: null,
    features: [
      'Up to 5 team members',
      'Up to 100 incidents per month',
      '1GB storage',
      'Basic integrations',
      'Email support'
    ],
    limits: {
      seats: 5,
      incidents: 100,
      storage: 1,
      integrations: ['pagerduty', 'grafana', 'email']
    }
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'Great for growing teams',
    price: 29,
    interval: 'month',
    features: [
      'Up to 25 team members',
      'Unlimited incidents',
      '10GB storage',
      'All integrations',
      'Priority support',
      'Advanced reporting'
    ],
    limits: {
      seats: 25,
      incidents: -1, // unlimited
      storage: 10,
      integrations: 'all'
    },
    stripe_price_id: 'price_starter_monthly' // placeholder
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    description: 'Perfect for established teams',
    price: 99,
    interval: 'month',
    features: [
      'Unlimited team members',
      'Unlimited incidents',
      '100GB storage',
      'All integrations',
      'Priority support',
      'Advanced reporting',
      'SSO authentication',
      'API access'
    ],
    limits: {
      seats: -1, // unlimited
      incidents: -1, // unlimited
      storage: 100,
      integrations: 'all'
    },
    stripe_price_id: 'price_professional_monthly' // placeholder
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations with advanced needs',
    price: 299,
    interval: 'month',
    features: [
      'Unlimited everything',
      'Unlimited storage',
      'All integrations',
      'Dedicated support',
      'Advanced reporting',
      'SSO authentication',
      'API access',
      'Custom workflows',
      'On-premise deployment',
      'SLA guarantees'
    ],
    limits: {
      seats: -1, // unlimited
      incidents: -1, // unlimited
      storage: -1, // unlimited
      integrations: 'all'
    },
    stripe_price_id: 'price_enterprise_monthly' // placeholder
  }
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

    // Get current billing configuration
    const { data: integration, error: integrationError } = await supabase
      .from('billing_integrations')
      .select('current_plan, subscription_status')
      .eq('organization_id', user.organizationId)
      .single()

    const currentPlan = integration?.current_plan || 'free'
    const subscriptionStatus = integration?.subscription_status || null

    return NextResponse.json({ 
      plans: SUBSCRIPTION_PLANS,
      currentPlan,
      subscriptionStatus,
      canUpgrade: ['owner', 'admin'].includes(user.role)
    })
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
    const { plan_id, interval } = body

    // Validate plan
    if (!plan_id || !SUBSCRIPTION_PLANS[plan_id as keyof typeof SUBSCRIPTION_PLANS]) {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 })
    }

    const selectedPlan = SUBSCRIPTION_PLANS[plan_id as keyof typeof SUBSCRIPTION_PLANS]

    // For free plan, just update the database
    if (plan_id === 'free') {
      const { data: integration, error: updateError } = await supabase
        .from('billing_integrations')
        .upsert({
          organization_id: user.organizationId,
          enabled: false,
          current_plan: 'free',
          subscription_status: null,
          stripe_customer_id: null,
          subscription_id: null,
          price_id: null
        }, { 
          onConflict: 'organization_id',
          ignoreDuplicates: false 
        })
        .select()
        .single()

      if (updateError) {
        console.error('Database update error:', updateError)
        return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 })
      }

      return NextResponse.json({ 
        integration,
        message: 'Plan updated to Free successfully' 
      })
    }

    // For paid plans, return a placeholder checkout URL
    // In a real implementation, you would create a Stripe checkout session here
    const mockCheckoutUrl = `https://checkout.stripe.com/pay/cs_test_${plan_id}_${Date.now()}`
    
    return NextResponse.json({ 
      checkout_url: mockCheckoutUrl,
      message: 'Checkout URL generated. This is a placeholder until Stripe is configured.' 
    })

    // Real Stripe implementation would look like this:
    /*
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
    
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: selectedPlan.stripe_price_id,
        quantity: 1,
      }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=integrations&success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=integrations&canceled=true`,
      metadata: {
        organization_id: userProfile.organization_id,
        plan_id: plan_id
      }
    })

    return NextResponse.json({ checkout_url: session.url })
    */
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}