import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase'
import { Priority } from '@/lib/types'

export async function GET() {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createSupabaseServerClient()
    
    // Get user's organization ID from their profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'User not associated with an organization' }, { status: 400 })
    }
    
    const { data: sloConfigs, error } = await supabase
      .from('slo_configurations')
      .select('priority, resolution_time_hours')
      .eq('organization_id', profile.organization_id)
      .order('priority')

    if (error) {
      console.error('Error fetching SLO configurations:', error)
      return NextResponse.json({ error: 'Failed to fetch SLO configurations' }, { status: 500 })
    }

    return NextResponse.json(sloConfigs || [])
  } catch (error) {
    console.error('SLO configurations API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { configurations } = body

    if (!configurations || !Array.isArray(configurations)) {
      return NextResponse.json({ error: 'Invalid configurations format' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()
    
    // Get user's organization ID from their profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'User not associated with an organization' }, { status: 400 })
    }
    
    // Update each SLO configuration for the user's organization
    const updatePromises = configurations.map(async (config: { priority: Priority; resolution_time_hours: number }) => {
      const { error } = await supabase
        .from('slo_configurations')
        .update({ 
          resolution_time_hours: config.resolution_time_hours,
          updated_at: new Date().toISOString()
        })
        .eq('priority', config.priority)
        .eq('organization_id', profile.organization_id)

      if (error) {
        console.error(`Error updating SLO for ${config.priority}:`, error)
        throw error
      }
    })

    await Promise.all(updatePromises)

    // Return updated configurations
    const { data: updatedConfigs, error: fetchError } = await supabase
      .from('slo_configurations')
      .select('priority, resolution_time_hours')
      .eq('organization_id', profile.organization_id)
      .order('priority')

    if (fetchError) {
      console.error('Error fetching updated SLO configurations:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch updated configurations' }, { status: 500 })
    }

    return NextResponse.json(updatedConfigs || [])
  } catch (error) {
    console.error('SLO configurations update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}