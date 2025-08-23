import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

// GET /api/services/labels - Get service labels and environments for given service IDs
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Get current user and their organization
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: orgMember, error: orgError } = await supabase
      .from('organization_memberships')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (orgError || !orgMember) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const organizationId = orgMember.organization_id

    // Get service IDs from query params
    const { searchParams } = new URL(request.url)
    const serviceIdsParam = searchParams.get('ids')
    
    if (!serviceIdsParam) {
      return NextResponse.json({ services: [] })
    }

    const serviceIds = serviceIdsParam.split(',').filter(id => id.trim())

    if (serviceIds.length === 0) {
      return NextResponse.json({ services: [] })
    }

    // Fetch service information from infrastructure_nodes
    const { data: nodes, error: nodesError } = await supabase
      .from('infrastructure_nodes')
      .select(`
        id,
        label,
        infrastructure_environments!inner(name)
      `)
      .eq('organization_id', organizationId)
      .in('id', serviceIds)

    if (nodesError) {
      console.error('Error fetching service nodes:', nodesError)
      return NextResponse.json({ error: 'Failed to fetch service information' }, { status: 500 })
    }

    // Also fetch from infrastructure_zones if needed
    const { data: zones, error: zonesError } = await supabase
      .from('infrastructure_zones')
      .select(`
        id,
        name as label,
        infrastructure_environments!inner(name)
      `)
      .eq('organization_id', organizationId)
      .in('id', serviceIds)

    if (zonesError) {
      console.error('Error fetching service zones:', zonesError)
      return NextResponse.json({ error: 'Failed to fetch zone information' }, { status: 500 })
    }

    // Combine and format the results
    const services = [
      ...(nodes || []).map(node => ({
        id: node.id,
        label: node.label,
        environment: node.infrastructure_environments.name
      })),
      ...(zones || []).map(zone => ({
        id: zone.id,
        label: zone.label,
        environment: zone.infrastructure_environments.name
      }))
    ]

    return NextResponse.json({ services })
  } catch (error) {
    console.error('Service labels API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}