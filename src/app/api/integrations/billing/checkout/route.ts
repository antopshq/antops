import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-enhanced'
import { createClient } from '@supabase/supabase-js'
import { stripe, calculateBillingCycleAnchor } from '@/lib/stripe'

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

    // Check if user has permission to modify billing (owners and admins only)
    if (!['owner', 'admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions. Only owners and admins can modify billing.' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { plan_id, currency = 'usd' } = body

    if (!plan_id || plan_id !== 'pro') {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 })
    }

    // Get organization creation date for billing cycle calculation
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('created_at')
      .eq('id', user.organizationId)
      .single()

    if (orgError || !orgData) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get or create Stripe customer
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
          enabled: true,
          current_plan: 'free'
        }, { 
          onConflict: 'organization_id',
          ignoreDuplicates: false 
        })
    }

    // Calculate billing cycle based on organization creation date
    const billingCycleAnchor = calculateBillingCycleAnchor(orgData.created_at)

    // Create checkout session for Pro plan subscription
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: currency.toLowerCase(),
          product_data: {
            name: 'Pro Plan',
            description: 'Professional features for growing teams',
            images: [`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/logo.png`],
          },
          unit_amount: 999, // $9.99 in cents
          recurring: {
            interval: 'month',
          },
        } as any, // Type assertion to avoid Stripe type issues
      }],
      billing_address_collection: 'required',
      customer_update: {
        address: 'auto',
        name: 'auto',
      },
      subscription_data: {
        billing_cycle_anchor: billingCycleAnchor,
        metadata: {
          organization_id: user.organizationId,
          plan_id: 'pro',
          billing_frequency: 'monthly',
          org_created_at: orgData.created_at
        }
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?tab=integrations&success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?tab=integrations&canceled=true`,
      metadata: {
        organization_id: user.organizationId,
        plan_id: 'pro',
        billing_frequency: 'monthly'
      }
    })

    return NextResponse.json({ 
      checkout_url: session.url,
      session_id: session.id
    })
    
  } catch (error) {
    console.error('Checkout session creation error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Stripe checkout endpoint. Use POST to create checkout session.',
    description: 'Creates a Stripe checkout session for Pro plan subscription.'
  })
}