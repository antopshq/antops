import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

// GET /api/infrastructure/components - Fetch infrastructure components for linking in ITSM
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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const searchTerm = searchParams.get('search') || ''
    const environmentId = searchParams.get('environment')

    // Fetch environments for this organization
    const { data: environments, error: envsError } = await supabase
      .from('infrastructure_environments')
      .select('id, name, description, is_default')
      .eq('organization_id', organizationId)
      .order('is_default', { ascending: false })
      .order('name')

    if (envsError) {
      console.error('Error fetching environments:', envsError)
      return NextResponse.json({ error: 'Failed to fetch environments' }, { status: 500 })
    }

    // Build query for infrastructure nodes
    let nodesQuery = supabase
      .from('infrastructure_nodes')
      .select(`
        id,
        label,
        type,
        metadata,
        environment_id,
        infrastructure_environments!inner(name, description)
      `)
      .eq('organization_id', organizationId)

    // Apply environment filter if specified
    if (environmentId && environmentId !== 'all') {
      nodesQuery = nodesQuery.eq('environment_id', environmentId)
    }

    // Apply search filter if provided
    if (searchTerm.trim()) {
      nodesQuery = nodesQuery.or(`label.ilike.%${searchTerm}%,type.ilike.%${searchTerm}%`)
    }

    const { data: nodes, error: nodesError } = await nodesQuery
      .order('label')
      .limit(100) // Reasonable limit for selector

    if (nodesError) {
      console.error('Error fetching infrastructure nodes:', nodesError)
      return NextResponse.json({ error: 'Failed to fetch infrastructure nodes' }, { status: 500 })
    }

    // Also fetch infrastructure zones
    let zonesQuery = supabase
      .from('infrastructure_zones')
      .select(`
        id,
        name,
        zone_type,
        description,
        environment_id,
        infrastructure_environments!inner(name, description)
      `)
      .eq('organization_id', organizationId)

    // Apply same filters to zones
    if (environmentId && environmentId !== 'all') {
      zonesQuery = zonesQuery.eq('environment_id', environmentId)
    }

    if (searchTerm.trim()) {
      zonesQuery = zonesQuery.or(`name.ilike.%${searchTerm}%,zone_type.ilike.%${searchTerm}%`)
    }

    const { data: zones, error: zonesError } = await zonesQuery
      .order('name')
      .limit(100)

    if (zonesError) {
      console.error('Error fetching infrastructure zones:', zonesError)
      // Don't fail the entire request, just log the error
    }

    // Transform nodes to expected format for the selector
    const nodeComponents = (nodes || []).map(node => ({
      id: node.id,
      name: node.metadata?.customTitle || node.label,
      type: node.metadata?.type || node.type, // Use metadata.type (server, loadbalancer) instead of node.type (infrastructure)
      description: `${node.metadata?.type || node.type} component in ${node.infrastructure_environments.name}`,
      environment: {
        id: node.environment_id,
        name: node.infrastructure_environments.name
      }
    }))

    // Transform zones to expected format for the selector
    const zoneComponents = (zones || []).map(zone => ({
      id: zone.id,
      name: zone.name,
      type: zone.zone_type,
      description: `${zone.zone_type} zone in ${zone.infrastructure_environments.name}`,
      environment: {
        id: zone.environment_id,
        name: zone.infrastructure_environments.name
      }
    }))

    // Combine nodes and zones
    const components = [...nodeComponents, ...zoneComponents]

    return NextResponse.json({
      components,
      environments: environments || []
    })

  } catch (error) {
    console.error('GET /api/infrastructure/components error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}