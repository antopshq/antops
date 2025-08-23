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
    // Get all valid infrastructure component IDs for this organization
    const { data: validComponents, error } = await supabase
      .from('infrastructure_nodes')
      .select('id')
      .eq('organization_id', organizationId)
      .in('id', componentIds)

    if (error) {
      console.error('Error validating infrastructure components:', error)
      // In case of error, return empty array to be safe
      return []
    }

    const validIds = validComponents?.map(c => c.id) || []
    
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
    const { data, error } = await supabase
      .from('infrastructure_nodes')
      .select('id')
      .eq('organization_id', organizationId)
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error checking infrastructure components:', error)
      return false
    }

    return !!data
    
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
    const { data: components, error } = await supabase
      .from('infrastructure_nodes')
      .select('id')
      .eq('organization_id', organizationId)

    if (error) {
      console.error('Error fetching infrastructure component IDs:', error)
      return []
    }

    return components?.map(c => c.id) || []
    
  } catch (error) {
    console.error('Error during infrastructure component ID fetch:', error)
    return []
  }
}