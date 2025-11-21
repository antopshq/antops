import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient()

    // Check for organizations with expired free trials and update them to pro
    const { data: expiredOrgs, error: fetchError } = await supabase
      .from('organizations')
      .select('id, name, billing_tier, billing_expires_at')
      .eq('billing_tier', 'free')
      .lt('billing_expires_at', new Date().toISOString())

    if (fetchError) {
      console.error('Error fetching expired organizations:', fetchError)
      return NextResponse.json({ error: 'Failed to check expiration' }, { status: 500 })
    }

    if (!expiredOrgs || expiredOrgs.length === 0) {
      return NextResponse.json({ 
        message: 'No expired organizations found',
        updated: 0 
      })
    }

    // Update expired organizations to pro tier
    const { data: updatedOrgs, error: updateError } = await supabase
      .from('organizations')
      .update({ 
        billing_tier: 'pro',
        updated_at: new Date().toISOString()
      })
      .in('id', expiredOrgs.map(org => org.id))
      .select('id, name, billing_tier')

    if (updateError) {
      console.error('Error updating expired organizations:', updateError)
      return NextResponse.json({ error: 'Failed to update organizations' }, { status: 500 })
    }

    console.log(`Updated ${updatedOrgs?.length || 0} organizations from free to pro tier:`, 
      updatedOrgs?.map(org => org.name).join(', '))

    return NextResponse.json({
      message: 'Billing tiers updated successfully',
      updated: updatedOrgs?.length || 0,
      organizations: updatedOrgs?.map(org => ({
        id: org.id,
        name: org.name,
        newTier: org.billing_tier
      }))
    })
  } catch (error) {
    console.error('Billing expiration check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()

    // Get billing status for all organizations
    const { data: organizations, error } = await supabase
      .from('organizations')
      .select('id, name, billing_tier, billing_expires_at, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching organizations:', error)
      return NextResponse.json({ error: 'Failed to fetch billing status' }, { status: 500 })
    }

    const now = new Date()
    const billingStatus = organizations?.map(org => {
      const expiresAt = org.billing_expires_at ? new Date(org.billing_expires_at) : null
      const isExpired = expiresAt ? expiresAt < now : false
      const daysRemaining = expiresAt ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null

      return {
        id: org.id,
        name: org.name,
        tier: org.billing_tier,
        expiresAt: org.billing_expires_at,
        isExpired,
        daysRemaining,
        needsUpdate: org.billing_tier === 'free' && isExpired
      }
    })

    return NextResponse.json({
      organizations: billingStatus,
      expiredCount: billingStatus?.filter(org => org.needsUpdate).length || 0
    })
  } catch (error) {
    console.error('Billing status check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}