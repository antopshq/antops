import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe, getPlanFromPriceId } from '@/lib/stripe'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error: any) {
    console.error('Webhook signature verification failed:', error.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createSupabaseServerClient()

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as any // Type as any to avoid Stripe type issues
        const customerId = subscription.customer as string
        const organizationId = subscription.metadata?.organization_id
        const planId = subscription.metadata?.plan_id || getPlanFromPriceId(subscription.items?.data?.[0]?.price?.id)

        if (!organizationId) {
          console.error('No organization_id in subscription metadata')
          break
        }

        // Determine billing interval based on subscription
        const interval = subscription.items?.data?.[0]?.price?.recurring?.interval || 'month'
        const priceId = subscription.items?.data?.[0]?.price?.id

        // Update billing integration
        // Update organization billing tier
        await supabase
          .from('organizations')
          .update({
            billing_tier: planId === 'pro' ? 'pro' : 'free',
            updated_at: new Date().toISOString()
          })
          .eq('id', organizationId)

        // Update billing integration
        await supabase
          .from('billing_integrations')
          .upsert({
            organization_id: organizationId,
            stripe_customer_id: customerId,
            subscription_id: subscription.id,
            subscription_status: subscription.status,
            current_plan: planId || 'free',
            billing_interval: interval,
            price_id: priceId,
            current_period_start: subscription.current_period_start ? new Date(subscription.current_period_start * 1000).toISOString() : null,
            current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
            trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
            canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
            enabled: subscription.status === 'active',
            metadata: {
              stripe_subscription: subscription
            }
          }, { 
            onConflict: 'organization_id',
            ignoreDuplicates: false 
          })

        console.log(`✅ Updated subscription for organization ${organizationId}, plan: ${planId}, interval: ${interval}`)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any
        const organizationId = subscription.metadata?.organization_id

        if (!organizationId) {
          console.error('No organization_id in subscription metadata')
          break
        }

        // Downgrade to free plan
        await supabase
          .from('organizations')
          .update({
            billing_tier: 'free',
            updated_at: new Date().toISOString()
          })
          .eq('id', organizationId)

        await supabase
          .from('billing_integrations')
          .update({
            subscription_status: 'canceled',
            current_plan: 'free',
            canceled_at: new Date().toISOString(),
            enabled: false
          })
          .eq('organization_id', organizationId)

        console.log(`✅ Downgraded organization ${organizationId} to free plan`)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any
        const customerId = invoice.customer as string
        const subscriptionId = invoice.subscription as string

        console.log(`✅ Payment succeeded for customer ${customerId}, subscription ${subscriptionId}`)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any
        const customerId = invoice.customer as string
        const subscriptionId = invoice.subscription as string

        console.log(`❌ Payment failed for customer ${customerId}, subscription ${subscriptionId}`)
        
        // You might want to send notifications to the organization here
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Stripe webhook endpoint' })
}