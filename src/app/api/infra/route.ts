import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { cleanupOrphanedInfrastructureReferences } from '@/lib/infrastructure-cleanup'

// TypeScript interfaces for the data structures
interface InfraNode {
  id: string
  type: string
  label: string
  position_x: number
  position_y: number
  zone_id: string | null
  zone_constraint: string
  metadata: Record<string, any>
}

interface InfraEdge {
  id: string
  source: string
  target: string
  relationship: string
  metadata: Record<string, any>
}

interface InfraData {
  nodes: InfraNode[]
  edges: InfraEdge[]
}

// GET /api/infra?environment=<id> - Fetch all nodes and edges for a specific environment
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

    // Get environment ID from query params or use default
    const { searchParams } = new URL(request.url)
    let environmentId = searchParams.get('environment')

    // If no environment specified, get the default one
    if (!environmentId) {
      const { data: defaultEnv, error: defaultEnvError } = await supabase
        .from('infrastructure_environments')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('is_default', true)
        .single()

      if (defaultEnvError || !defaultEnv) {
        // No default environment exists, return empty data
        return NextResponse.json({ 
          nodes: [], 
          edges: [],
          environment: null,
          message: 'No default environment found'
        })
      }

      environmentId = defaultEnv.id
    }

    // Verify the environment belongs to the user's organization
    const { data: environment, error: envError } = await supabase
      .from('infrastructure_environments')
      .select('*')
      .eq('id', environmentId)
      .eq('organization_id', organizationId)
      .single()

    if (envError || !environment) {
      return NextResponse.json({ error: 'Environment not found' }, { status: 404 })
    }

    // Fetch nodes for this environment
    const { data: nodes, error: nodesError } = await supabase
      .from('infrastructure_nodes')
      .select('*')
      .eq('environment_id', environmentId)
      .order('created_at', { ascending: true })

    if (nodesError) {
      console.error('Error fetching nodes:', nodesError)
      return NextResponse.json({ error: 'Failed to fetch nodes' }, { status: 500 })
    }

    // Fetch edges for this environment
    const { data: edges, error: edgesError } = await supabase
      .from('infrastructure_edges')
      .select('*')
      .eq('environment_id', environmentId)
      .order('created_at', { ascending: true })

    if (edgesError) {
      console.error('Error fetching edges:', edgesError)
      return NextResponse.json({ error: 'Failed to fetch edges' }, { status: 500 })
    }

    // Fetch zones for this environment
    const { data: zones, error: zonesError } = await supabase
      .from('infrastructure_zones')
      .select('*')
      .eq('environment_id', environmentId)
      .order('created_at', { ascending: true })

    if (zonesError) {
      console.error('Error fetching zones:', zonesError)
      return NextResponse.json({ error: 'Failed to fetch zones' }, { status: 500 })
    }

    // Transform data to React Flow format
    const reactFlowNodes = (nodes || []).map(node => ({
      id: node.id,
      type: 'infrastructure',
      position: { x: node.position_x, y: node.position_y },
      parentId: node.zone_id || undefined,
      extent: node.zone_constraint === 'parent' ? 'parent' as const : undefined,
      data: {
        label: node.label,
        type: node.type,
        customTitle: node.metadata?.customTitle,
        ...node.metadata
      }
    }))

    // Transform zones to React Flow nodes
    const reactFlowZones = (zones || []).map(zone => ({
      id: zone.id,
      type: 'zone',
      position: { x: zone.position_x, y: zone.position_y },
      style: {
        width: zone.width || 300,
        height: zone.height || 200,
      },
      parentId: zone.parent_zone_id || undefined,
      data: {
        name: zone.name,
        zoneType: zone.zone_type,
        description: zone.description,
        isCollapsed: zone.is_collapsed || false,
        isLocked: zone.is_locked || false,
        nodeCount: (nodes || []).filter(n => n.zone_id === zone.id).length,
        zoneConfig: zone.zone_config || {},
        styleConfig: zone.style_config || {},
      }
    }))

    // Combine nodes and zones
    const allNodes = [...reactFlowNodes, ...reactFlowZones]

    const reactFlowEdges = (edges || []).map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.metadata?.sourceHandle,
      targetHandle: edge.metadata?.targetHandle,
      type: 'smoothstep',
      data: {
        relationship: edge.relationship,
        ...edge.metadata
      }
    }))

    return NextResponse.json({
      nodes: allNodes,
      edges: reactFlowEdges,
      environment
    })

  } catch (error) {
    console.error('GET /api/infra error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/infra - Save nodes and edges (upsert operation)
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json()
    const { nodes, edges, environmentId }: { nodes: any[], edges: any[], environmentId?: string } = body

    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 })
    }

    // Get environment ID - use provided or default
    let targetEnvironmentId = environmentId

    if (!targetEnvironmentId) {
      const { data: defaultEnv, error: defaultEnvError } = await supabase
        .from('infrastructure_environments')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('is_default', true)
        .single()

      if (defaultEnvError || !defaultEnv) {
        return NextResponse.json({ error: 'No default environment found' }, { status: 404 })
      }

      targetEnvironmentId = defaultEnv.id
    }

    // Verify the environment belongs to the user's organization
    const { data: environment, error: envError } = await supabase
      .from('infrastructure_environments')
      .select('id')
      .eq('id', targetEnvironmentId)
      .eq('organization_id', organizationId)
      .single()

    if (envError || !environment) {
      return NextResponse.json({ error: 'Environment not found' }, { status: 404 })
    }

    // Separate zone nodes from infrastructure nodes
    const infrastructureNodes = nodes.filter(node => node.type === 'infrastructure')
    const zoneNodes = nodes.filter(node => node.type === 'zone')

    // Transform React Flow data to database format
    const dbNodes: InfraNode[] = infrastructureNodes.map(node => {
      // Check if the referenced zone actually exists in the zones being saved
      const referencedZoneExists = node.parentId ? 
        zoneNodes.some(zone => zone.id === node.parentId) : false
      
      // Extract node data safely, handling the enhanced Terraform data structure
      const nodeData = node.data || {}
      
      return {
        id: node.id,
        type: node.type || 'infrastructure',
        label: nodeData.customTitle || nodeData.label || node.id,
        position_x: Math.round(node.position?.x || 0),
        position_y: Math.round(node.position?.y || 0),
        // Set zone_id to parentId if it exists (nodes should lock to their parent zones)
        zone_id: node.parentId || null,
        zone_constraint: node.extent === 'parent' ? 'parent' : 'none',
        metadata: {
          // Core node data
          type: nodeData.type,
          customTitle: nodeData.customTitle,
          environment: nodeData.environment,
          status: nodeData.status,
          linkedCount: nodeData.linkedCount,
          isLocked: nodeData.isLocked,
          parentZoneName: nodeData.parentZoneName,
          // Terraform-specific data
          terraformType: nodeData.terraformType,
          terraformConfig: nodeData.terraformConfig,
          terraformResource: nodeData.terraformResource,
          // Remove duplicated fields
          label: undefined
        }
      }
    })

    // Transform zone nodes to database format
    const dbZones = zoneNodes.map(zone => {
      // Check if the parent zone actually exists in the zones being saved
      const parentZoneExists = zone.parentId ? 
        zoneNodes.some(parentZone => parentZone.id === zone.parentId) : false
      
      // Extract zone data safely, handling the enhanced Terraform data structure
      const zoneData = zone.data || {}
      
      return {
        id: zone.id, // Use client-generated ID for now
        name: zoneData.name || zoneData.customTitle || zone.id,
        description: zoneData.description || '',
        zone_type: zoneData.zoneType || zoneData.type || 'custom',
        // Only set parent_zone_id if the parent zone actually exists in our save set
        parent_zone_id: (zone.parentId && parentZoneExists) ? zone.parentId : null,
        zone_depth: 0, // Will be calculated properly by database trigger
        zone_path: [], // Will be calculated properly by database trigger
        position_x: Math.round(zone.position?.x || 0),
        position_y: Math.round(zone.position?.y || 0),
        width: Math.round(zone.style?.width || 400),
        height: Math.round(zone.style?.height || 300),
        zone_config: {
          terraformType: zoneData.terraformType,
          terraformConfig: zoneData.terraformConfig,
          hierarchy: zoneData.hierarchy,
          expectedChildren: zoneData.expectedChildren,
          potentialComponents: zoneData.potentialComponents,
          childZones: zoneData.childZones,
          ...zoneData.zoneConfig
        },
        style_config: {
          backgroundColor: zone.style?.backgroundColor,
          border: zone.style?.border,
          borderRadius: zone.style?.borderRadius,
          zIndex: zone.style?.zIndex,
          ...zoneData.styleConfig
        },
        tags: zoneData.tags || [], // Support tags from Terraform
        is_collapsed: zoneData.isCollapsed || false,
        is_locked: typeof zoneData.isLocked === 'boolean' ? zoneData.isLocked : false,
      }
    })

    const dbEdges: InfraEdge[] = edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      relationship: edge.data?.relationship || 'connected',
      metadata: {
        ...edge.data,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        relationship: undefined // Remove relationship from metadata since it's a separate field
      }
    }))

    // Start transaction - first delete existing data for this environment, then insert new
    // Delete existing edges first (due to foreign key constraints)
    const { error: deleteEdgesError } = await supabase
      .from('infrastructure_edges')
      .delete()
      .eq('environment_id', targetEnvironmentId)

    if (deleteEdgesError) {
      console.error('Error deleting edges:', deleteEdgesError)
      return NextResponse.json({ error: 'Failed to delete existing edges' }, { status: 500 })
    }

    // Delete existing nodes for this environment
    const { error: deleteNodesError } = await supabase
      .from('infrastructure_nodes')
      .delete()
      .eq('environment_id', targetEnvironmentId)

    if (deleteNodesError) {
      console.error('Error deleting nodes:', deleteNodesError)
      return NextResponse.json({ error: 'Failed to delete existing nodes' }, { status: 500 })
    }

    // Delete existing zones for this environment
    const { error: deleteZonesError } = await supabase
      .from('infrastructure_zones')
      .delete()
      .eq('environment_id', targetEnvironmentId)

    if (deleteZonesError) {
      console.error('Error deleting zones:', deleteZonesError)
      return NextResponse.json({ error: 'Failed to delete existing zones' }, { status: 500 })
    }

    // Insert new zones first (since nodes reference zones)
    if (dbZones.length > 0) {
      // Validate zone data before insertion
      const validatedZones = dbZones.map((zone, index) => {
        // Ensure all required fields are present and valid
        const validatedZone = {
          ...zone,
          organization_id: organizationId,
          environment_id: targetEnvironmentId,
          // Ensure zone_config and style_config are proper JSON objects
          zone_config: zone.zone_config || {},
          style_config: zone.style_config || {},
          // Ensure arrays are properly formatted
          tags: Array.isArray(zone.tags) ? zone.tags : [],
          zone_path: Array.isArray(zone.zone_path) ? zone.zone_path : [],
          // Ensure numeric values are valid
          position_x: isFinite(zone.position_x) ? zone.position_x : 0,
          position_y: isFinite(zone.position_y) ? zone.position_y : 0,
          width: isFinite(zone.width) ? zone.width : 400,
          height: isFinite(zone.height) ? zone.height : 300,
          zone_depth: isFinite(zone.zone_depth) ? zone.zone_depth : 0
        }
        
        // Validate zone ID format
        if (!validatedZone.id || typeof validatedZone.id !== 'string') {
          console.warn(`Zone ${index} has invalid ID:`, validatedZone.id)
          validatedZone.id = `zone-${Date.now()}-${index}`
        }
        
        return validatedZone
      })

      console.log('About to upsert validated zones:', JSON.stringify(validatedZones, null, 2))
      const { error: insertZonesError } = await supabase
        .from('infrastructure_zones')
        .upsert(validatedZones, { onConflict: 'id' })

      if (insertZonesError) {
        console.error('Error inserting zones:', insertZonesError)
        console.error('Zone data that failed:', JSON.stringify(validatedZones, null, 2))
        console.error('Supabase error details:', insertZonesError)
        return NextResponse.json({ 
          error: 'Failed to insert zones', 
          details: insertZonesError.message,
          hint: insertZonesError.hint,
          code: insertZonesError.code,
          data: validatedZones 
        }, { status: 500 })
      }
    }

    // Insert new nodes if any
    if (dbNodes.length > 0) {
      const nodesWithEnvId = dbNodes.map(node => ({
        ...node,
        organization_id: organizationId,
        environment_id: targetEnvironmentId
      }))

      console.log('About to upsert nodes:', JSON.stringify(nodesWithEnvId, null, 2))
      const { error: insertNodesError } = await supabase
        .from('infrastructure_nodes')
        .upsert(nodesWithEnvId, { onConflict: 'id' })

      if (insertNodesError) {
        console.error('Error inserting nodes:', insertNodesError)
        console.error('Node data that failed:', JSON.stringify(nodesWithEnvId, null, 2))
        
        // Check for duplicate key errors (likely duplicate names)
        if (insertNodesError.code === '23505' || insertNodesError.message.includes('duplicate')) {
          // Find which nodes have duplicate labels
          const nodeLabels = nodesWithEnvId.map(n => n.label)
          const duplicateLabels = nodeLabels.filter((label, index) => nodeLabels.indexOf(label) !== index)
          
          return NextResponse.json({ 
            error: 'Component names must be unique', 
            details: duplicateLabels.length > 0 
              ? `Duplicate component names found: ${[...new Set(duplicateLabels)].join(', ')}`
              : 'Two or more components have the same name. Please use unique names for each component.',
            code: 'DUPLICATE_NAMES',
            duplicates: [...new Set(duplicateLabels)]
          }, { status: 409 })
        }
        
        return NextResponse.json({ 
          error: 'Failed to save infrastructure components', 
          details: insertNodesError.message,
          data: nodesWithEnvId 
        }, { status: 500 })
      }
    }

    // Insert new edges if any
    if (dbEdges.length > 0) {
      const edgesWithEnvId = dbEdges.map(edge => ({
        ...edge,
        organization_id: organizationId,
        environment_id: targetEnvironmentId
      }))

      const { error: insertEdgesError } = await supabase
        .from('infrastructure_edges')
        .insert(edgesWithEnvId)

      if (insertEdgesError) {
        console.error('Error inserting edges:', insertEdgesError)
        return NextResponse.json({ error: 'Failed to insert edges' }, { status: 500 })
      }
    }

    // After successful save, clean up orphaned infrastructure references
    if (targetEnvironmentId) {
      try {
        await cleanupOrphanedInfrastructureReferences(organizationId, targetEnvironmentId)
        // Cleanup completed silently - only log if there are actual errors
      } catch (cleanupError) {
        console.error('Infrastructure cleanup failed (but save was successful):', cleanupError)
        // Don't fail the entire request if cleanup fails, just log the error
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Saved ${dbZones.length} zones, ${dbNodes.length} nodes and ${dbEdges.length} edges` 
    })

  } catch (error) {
    console.error('POST /api/infra error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}