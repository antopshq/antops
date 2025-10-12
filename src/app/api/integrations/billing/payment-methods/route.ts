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
    const { payment_method_id, currency = 'usd' } = body

    if (!payment_method_id) {
      return NextResponse.json({ error: 'Payment method ID is required' }, { status: 400 })
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

    // Attach payment method to customer
    await stripe.paymentMethods.attach(payment_method_id, {
      customer: customerId,
    })

    // Set as default payment method
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: payment_method_id,
      },
    })

    // Create monthly subscription for Pro plan based on organization creation date
    const billingCycleAnchor = calculateBillingCycleAnchor(orgData.created_at)
    
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{
        price_data: {
          currency: currency.toLowerCase(),
          product_data: {
            name: 'Pro Plan',
            description: 'Professional features for growing teams',
          },
          unit_amount: 999, // 9.99 in cents
          recurring: {
            interval: 'month',
            interval_count: 1,
          },
        } as any, // Type assertion to avoid Stripe type issues
      }],
      default_payment_method: payment_method_id,
      billing_cycle_anchor: billingCycleAnchor,
      metadata: {
        organization_id: user.organizationId,
        plan_id: 'pro',
        billing_frequency: 'monthly',
        org_created_at: orgData.created_at
      }
    })

    // Type assertion for subscription object to handle Stripe API response types
    const sub = subscription as any

    // Update organization billing tier
    const { error: orgUpdateError } = await supabase
      .from('organizations')
      .update({
        billing_tier: 'pro',
        updated_at: new Date().toISOString()
      })
      .eq('id', user.organizationId)

    if (orgUpdateError) {
      console.error('Failed to update organization billing tier:', orgUpdateError)
      // Continue anyway, as the Stripe subscription was created
    }

    // Update billing integration with subscription info
    const { data: integration, error: updateError } = await supabase
      .from('billing_integrations')
      .upsert({
        organization_id: user.organizationId,
        enabled: true,
        current_plan: 'pro',
        subscription_status: sub.status,
        stripe_customer_id: customerId,
        subscription_id: sub.id,
        price_id: sub.items.data[0].price.id,
        billing_interval: 'month',
        current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      }, { 
        onConflict: 'organization_id',
        ignoreDuplicates: false 
      })
      .select()
      .single()

    if (updateError) {
      console.error('Database update error:', updateError)
      return NextResponse.json({ error: 'Failed to update billing configuration' }, { status: 500 })
    }

    return NextResponse.json({ 
      integration,
      subscription: {
        id: sub.id,
        status: sub.status,
        current_period_start: sub.current_period_start,
        current_period_end: sub.current_period_end
      },
      message: 'Payment method added and subscription created successfully' 
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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

    // Check if user has permission to view billing (owners and admins only)
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
      return NextResponse.json({ paymentMethods: [] })
    }

    // Get payment methods from Stripe
    const paymentMethods = await stripe.paymentMethods.list({
      customer: integration.stripe_customer_id,
      type: 'card',
    })

    return NextResponse.json({ 
      paymentMethods: paymentMethods.data.map(pm => ({
        id: pm.id,
        brand: pm.card?.brand,
        last4: pm.card?.last4,
        exp_month: pm.card?.exp_month,
        exp_year: pm.card?.exp_year,
        created: pm.created
      }))
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

