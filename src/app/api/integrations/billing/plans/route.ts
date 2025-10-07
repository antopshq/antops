import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-enhanced'
import { createSupabaseServerClient } from '@/lib/supabase'
import { STRIPE_CONFIG, formatPrice } from '@/lib/stripe'

// Build subscription plans with real Stripe pricing
const buildSubscriptionPlans = () => {
  return {
    free: {
      id: 'free',
      name: 'Free',
      description: 'Perfect for small teams getting started',
      price: 0,
      yearlyPrice: 0,
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
      price: STRIPE_CONFIG.prices.starter_monthly.amount,
      yearlyPrice: STRIPE_CONFIG.prices.starter_yearly.amount,
      interval: 'month',
      formattedPrice: formatPrice(STRIPE_CONFIG.prices.starter_monthly.amount),
      formattedYearlyPrice: formatPrice(STRIPE_CONFIG.prices.starter_yearly.amount),
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
        incidents: -1,
        storage: 10,
        integrations: 'all'
      }
    },
    professional: {
      id: 'professional',
      name: 'Professional',
      description: 'Perfect for established teams',
      price: STRIPE_CONFIG.prices.professional_monthly.amount,
      yearlyPrice: STRIPE_CONFIG.prices.professional_yearly.amount,
      interval: 'month',
      formattedPrice: formatPrice(STRIPE_CONFIG.prices.professional_monthly.amount),
      formattedYearlyPrice: formatPrice(STRIPE_CONFIG.prices.professional_yearly.amount),
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
        seats: -1,
        incidents: -1,
        storage: 100,
        integrations: 'all'
      }
    },
    enterprise: {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'For large organizations with advanced needs',
      price: STRIPE_CONFIG.prices.enterprise_monthly.amount,
      yearlyPrice: STRIPE_CONFIG.prices.enterprise_yearly.amount,
      interval: 'month',
      formattedPrice: formatPrice(STRIPE_CONFIG.prices.enterprise_monthly.amount),
      formattedYearlyPrice: formatPrice(STRIPE_CONFIG.prices.enterprise_yearly.amount),
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
        seats: -1,
        incidents: -1,
        storage: -1,
        integrations: 'all'
      }
    }
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
      plans: buildSubscriptionPlans(),
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
    const plans = buildSubscriptionPlans()
    if (!plan_id || !plans[plan_id as keyof typeof plans]) {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 })
    }

    const selectedPlan = plans[plan_id as keyof typeof plans]

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

    // Create Stripe checkout session for paid plans
    const { stripe, STRIPE_CONFIG } = await import('@/lib/stripe')
    
    // Find the appropriate price ID
    const priceKey = `${plan_id}_${interval || 'monthly'}`
    const priceConfig = STRIPE_CONFIG.prices[priceKey as keyof typeof STRIPE_CONFIG.prices]
    
    if (!priceConfig) {
      return NextResponse.json({ error: 'Invalid plan or interval' }, { status: 400 })
    }

    // Create or get Stripe customer
    let customerId = null
    const { data: existingIntegration } = await supabase
      .from('billing_integrations')
      .select('stripe_customer_id')
      .eq('organization_id', user.organizationId)
      .single()

    if (existingIntegration?.stripe_customer_id) {
      customerId = existingIntegration.stripe_customer_id
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          organization_id: user.organizationId,
          user_id: user.id
        }
      })
      customerId = customer.id

      // Save customer ID to database
      await supabase
        .from('billing_integrations')
        .upsert({
          organization_id: user.organizationId,
          stripe_customer_id: customerId,
          enabled: true
        }, { 
          onConflict: 'organization_id',
          ignoreDuplicates: false 
        })
    }

    // Create checkout session  
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: priceConfig.currency,
          product_data: {
            name: STRIPE_CONFIG.products[priceConfig.product as keyof typeof STRIPE_CONFIG.products].name,
            description: STRIPE_CONFIG.products[priceConfig.product as keyof typeof STRIPE_CONFIG.products].description,
          },
          unit_amount: priceConfig.amount,
          recurring: {
            interval: priceConfig.interval as 'month' | 'year',
          },
        },
        quantity: 1,
      }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?tab=integrations&success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?tab=integrations&canceled=true`,
      metadata: {
        organization_id: user.organizationId,
        plan_id: plan_id,
        interval: interval || 'month'
      },
      subscription_data: {
        metadata: {
          organization_id: user.organizationId,
          plan_id: plan_id
        }
      }
    })

    return NextResponse.json({ checkout_url: session.url })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}