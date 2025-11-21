import { createSupabaseServerClient } from './supabase'

/**
 * Validate that all provided infrastructure component IDs exist in the organization
 * Returns only the valid component IDs
 */
export async function validateInfrastructureComponents(
  componentIds: string[], 
  organizationId: string
): Promise<string[]> {
  if (!componentIds || componentIds.length === 0) {
    return []
  }

  const supabase = await createSupabaseServerClient()
  
  try {
    // Get all valid infrastructure component IDs from both nodes and zones
    const [nodesResult, zonesResult] = await Promise.all([
      supabase
        .from('infrastructure_nodes')
        .select('id')
        .eq('organization_id', organizationId)
        .in('id', componentIds),
      supabase
        .from('infrastructure_zones')
        .select('id')
        .eq('organization_id', organizationId)
        .in('id', componentIds)
    ])

    if (nodesResult.error && zonesResult.error) {
      console.error('Error validating infrastructure components:', nodesResult.error, zonesResult.error)
      // In case of error, return empty array to be safe
      return []
    }

    const validNodeIds = nodesResult.data?.map(c => c.id) || []
    const validZoneIds = zonesResult.data?.map(c => c.id) || []
    const validIds = [...validNodeIds, ...validZoneIds]
    
    // Log if any components were filtered out
    const removedIds = componentIds.filter(id => !validIds.includes(id))
    if (removedIds.length > 0) {
      console.log(`Filtered out ${removedIds.length} invalid infrastructure component IDs:`, removedIds)
    }

    return validIds
    
  } catch (error) {
    console.error('Error during infrastructure component validation:', error)
    // In case of error, return empty array to be safe
    return []
  }
}

/**
 * Check if any infrastructure components exist for an organization
 * Useful for validating if infrastructure is set up
 */
export async function hasInfrastructureComponents(organizationId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient()
  
  try {
    // Check both nodes and zones
    const [nodesResult, zonesResult] = await Promise.all([
      supabase
        .from('infrastructure_nodes')
        .select('id')
        .eq('organization_id', organizationId)
        .limit(1)
        .maybeSingle(),
      supabase
        .from('infrastructure_zones')
        .select('id')
        .eq('organization_id', organizationId)
        .limit(1)
        .maybeSingle()
    ])

    return !!(nodesResult.data || zonesResult.data)
    
  } catch (error) {
    console.error('Error during infrastructure existence check:', error)
    return false
  }
}

/**
 * Get all infrastructure component IDs for an organization
 * Useful for bulk operations
 */
export async function getAllInfrastructureComponentIds(organizationId: string): Promise<string[]> {
  const supabase = await createSupabaseServerClient()
  
  try {
    // Get IDs from both nodes and zones
    const [nodesResult, zonesResult] = await Promise.all([
      supabase
        .from('infrastructure_nodes')
        .select('id')
        .eq('organization_id', organizationId),
      supabase
        .from('infrastructure_zones')
        .select('id')
        .eq('organization_id', organizationId)
    ])

    const nodeIds = nodesResult.data?.map(c => c.id) || []
    const zoneIds = zonesResult.data?.map(c => c.id) || []

    return [...nodeIds, ...zoneIds]
    
  } catch (error) {
    console.error('Error during infrastructure component ID fetch:', error)
    return []
  }
}