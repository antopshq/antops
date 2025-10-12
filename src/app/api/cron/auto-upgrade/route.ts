import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stripe, hasFreePeriodExpired, calculateBillingCycleAnchor, getUserCurrency } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request (you might want to add authentication)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    // Get all organizations where billing has expired and they're still on free tier
    const now = new Date().toISOString()
    const { data: organizations, error: orgsError } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        created_at,
        billing_tier,
        billing_expires_at,
        billing_integrations (
          id,
          current_plan,
          subscription_status,
          stripe_customer_id
        )
      `)
      .eq('billing_tier', 'free')
      .lt('billing_expires_at', now)

    if (orgsError) {
      console.error('Error fetching organizations:', orgsError)
      return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 })
    }

    const upgradedOrganizations = []
    const errors = []

    for (const org of organizations || []) {
      try {
        // Skip if already on pro tier (shouldn't happen due to query filter, but safety check)
        if (org.billing_tier !== 'free') {
          continue
        }

        // Check if billing has truly expired
        const billingExpiresAt = new Date(org.billing_expires_at)
        const now = new Date()
        if (billingExpiresAt > now) {
          continue
        }

        console.log(`Processing auto-upgrade for organization: ${org.name} (${org.id}) - billing expired at ${org.billing_expires_at}`)

        // Get organization owner to create customer if needed
        const { data: ownerMembership, error: ownerError } = await supabase
          .from('organization_memberships')
          .select('user_id')
          .eq('organization_id', org.id)
          .eq('role', 'owner')
          .not('joined_at', 'is', null)
          .single()

        if (ownerError || !ownerMembership) {
          console.error(`No owner found for organization ${org.id}`)
          errors.push(`No owner found for organization ${org.id}`)
          continue
        }

        // Get owner's profile for email
        const { data: ownerProfile, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', ownerMembership.user_id)
          .single()

        if (profileError || !ownerProfile) {
          console.error(`No profile found for owner of organization ${org.id}`)
          errors.push(`No profile found for owner of organization ${org.id}`)
          continue
        }

        // Count active members for pricing
        const { count: userCount, error: userCountError } = await supabase
          .from('organization_memberships')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', org.id)
          .not('joined_at', 'is', null)

        if (userCountError) {
          console.error(`Failed to count users for organization ${org.id}`)
          errors.push(`Failed to count users for organization ${org.id}`)
          continue
        }

        const numberOfUsers = userCount || 1
        const totalAmount = 999 * numberOfUsers // €9.99 per user in cents

        // Create or get Stripe customer
        const billing = org.billing_integrations?.[0]
        let customerId = billing?.stripe_customer_id
        if (!customerId) {
          const customer = await stripe.customers.create({
            email: ownerProfile.email,
            metadata: {
              organization_id: org.id,
              user_id: ownerMembership.user_id,
              auto_upgrade: 'true'
            }
          })
          customerId = customer.id
        }

        // Determine currency (default to USD for auto-upgrade)
        const currency = 'usd' // You could enhance this to store user preference

        // Calculate billing cycle based on organization creation date
        const billingCycleAnchor = calculateBillingCycleAnchor(org.created_at)

        // Create subscription with trial period (so first payment is on the anniversary)
        const subscription = await stripe.subscriptions.create({
          customer: customerId,
          items: [{
            price_data: {
              currency: currency,
              product_data: {
                name: 'Pro Plan',
                description: 'Professional features for growing teams',
              },
              unit_amount: totalAmount, // €9.99 per user in cents
              recurring: {
                interval: 'month',
                interval_count: 1,
              },
            } as any, // Type assertion to avoid Stripe type issues
            quantity: 1,
          }],
          billing_cycle_anchor: billingCycleAnchor,
          trial_end: billingCycleAnchor, // Trial until first billing date
          metadata: {
            organization_id: org.id,
            plan_id: 'pro',
            billing_frequency: 'monthly',
            org_created_at: org.created_at,
            auto_upgraded: 'true',
            user_count: numberOfUsers.toString()
          }
        })

        // Type assertion for subscription object
        const sub = subscription as any

        // Update organization billing tier
        const { error: orgUpdateError } = await supabase
          .from('organizations')
          .update({
            billing_tier: 'pro',
            updated_at: new Date().toISOString()
          })
          .eq('id', org.id)

        if (orgUpdateError) {
          console.error(`Failed to update organization billing tier for ${org.id}:`, orgUpdateError)
          errors.push(`Failed to update organization billing tier for ${org.id}`)
          continue
        }

        // Update billing integration
        const { error: updateError } = await supabase
          .from('billing_integrations')
          .upsert({
            organization_id: org.id,
            enabled: true,
            current_plan: 'pro',
            subscription_status: sub.status,
            stripe_customer_id: customerId,
            subscription_id: sub.id,
            price_id: sub.items.data[0].price.id,
            billing_interval: 'month',
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
          }, { 
            onConflict: 'organization_id',
            ignoreDuplicates: false 
          })

        if (updateError) {
          console.error(`Failed to update billing for organization ${org.id}:`, updateError)
          errors.push(`Failed to update billing for organization ${org.id}`)
          continue
        }

        // Create notification for organization owner about auto-upgrade
        await supabase
          .from('notifications')
          .insert({
            user_id: ownerMembership.user_id,
            organization_id: org.id,
            type: 'billing_upgrade',
            title: 'Automatically Upgraded to Pro Plan',
            message: `Your organization "${org.name}" has been automatically upgraded to the Pro plan after your free month expired. Your first payment will be charged on your organization anniversary date.`,
            data: {
              plan: 'pro',
              billing_date: new Date(billingCycleAnchor * 1000).toISOString()
            }
          })

        upgradedOrganizations.push({
          organizationId: org.id,
          organizationName: org.name,
          subscriptionId: sub.id,
          nextBillingDate: new Date(billingCycleAnchor * 1000).toISOString()
        })

        console.log(`✅ Successfully auto-upgraded organization: ${org.name} (${org.id})`)

      } catch (orgError) {
        console.error(`Error processing organization ${org.id}:`, orgError)
        errors.push(`Error processing organization ${org.id}: ${orgError}`)
      }
    }

    return NextResponse.json({
      success: true,
      upgraded_count: upgradedOrganizations.length,
      upgraded_organizations: upgradedOrganizations,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('Auto-upgrade cron job failed:', error)
    return NextResponse.json({ error: 'Auto-upgrade cron job failed' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Auto-upgrade cron endpoint. Use POST to trigger auto-upgrade process.',
    description: 'This endpoint automatically upgrades organizations from Free to Pro plan after their free month expires.'
  })
}