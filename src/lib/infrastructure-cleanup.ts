import { createSupabaseServerClient } from './supabase'

/**
 * Clean up orphaned infrastructure component references from incidents, problems, and changes
 * This function should be called after infrastructure components are deleted
 */
export async function cleanupOrphanedInfrastructureReferences(organizationId: string, environmentId: string) {
  const supabase = await createSupabaseServerClient()
  
  try {
    // Get all current infrastructure component IDs for this environment
    const { data: currentComponents, error: componentsError } = await supabase
      .from('infrastructure_nodes')
      .select('id')
      .eq('environment_id', environmentId)

    if (componentsError) {
      console.error('Error fetching current components:', componentsError)
      throw componentsError
    }

    const currentComponentIds = new Set(currentComponents?.map(c => c.id) || [])

    // Clean up incidents
    const { data: incidents, error: incidentsError } = await supabase
      .from('incidents')
      .select('id, affected_services')
      .eq('organization_id', organizationId)
      .not('affected_services', 'is', null)

    if (incidentsError) {
      console.error('Error fetching incidents:', incidentsError)
      throw incidentsError
    }

    // Process incidents
    const incidentUpdates: Array<{id: string, affected_services: string[]}> = []
    
    for (const incident of incidents || []) {
      const affectedServices = incident.affected_services || []
      const cleanedServices = affectedServices.filter(serviceId => currentComponentIds.has(serviceId))
      
      if (cleanedServices.length !== affectedServices.length) {
        incidentUpdates.push({
          id: incident.id,
          affected_services: cleanedServices
        })
      }
    }

    // Update incidents with cleaned affected services
    for (const update of incidentUpdates) {
      const { error: updateError } = await supabase
        .from('incidents')
        .update({ affected_services: update.affected_services })
        .eq('id', update.id)

      if (updateError) {
        console.error(`Error updating incident ${update.id}:`, updateError)
      }
    }

    // Clean up problems
    const { data: problems, error: problemsError } = await supabase
      .from('problems')
      .select('id, affected_services')
      .eq('organization_id', organizationId)
      .not('affected_services', 'is', null)

    if (problemsError) {
      console.error('Error fetching problems:', problemsError)
      throw problemsError
    }

    // Process problems
    const problemUpdates: Array<{id: string, affected_services: string[]}> = []
    
    for (const problem of problems || []) {
      const affectedServices = problem.affected_services || []
      const cleanedServices = affectedServices.filter(serviceId => currentComponentIds.has(serviceId))
      
      if (cleanedServices.length !== affectedServices.length) {
        problemUpdates.push({
          id: problem.id,
          affected_services: cleanedServices
        })
      }
    }

    // Update problems with cleaned affected services
    for (const update of problemUpdates) {
      const { error: updateError } = await supabase
        .from('problems')
        .update({ affected_services: update.affected_services })
        .eq('id', update.id)

      if (updateError) {
        console.error(`Error updating problem ${update.id}:`, updateError)
      }
    }

    // Clean up changes
    const { data: changes, error: changesError } = await supabase
      .from('changes')
      .select('id, affected_services')
      .eq('organization_id', organizationId)
      .not('affected_services', 'is', null)

    if (changesError) {
      console.error('Error fetching changes:', changesError)
      throw changesError
    }

    // Process changes
    const changeUpdates: Array<{id: string, affected_services: string[]}> = []
    
    for (const change of changes || []) {
      const affectedServices = change.affected_services || []
      const cleanedServices = affectedServices.filter(serviceId => currentComponentIds.has(serviceId))
      
      if (cleanedServices.length !== affectedServices.length) {
        changeUpdates.push({
          id: change.id,
          affected_services: cleanedServices
        })
      }
    }

    // Update changes with cleaned affected services
    for (const update of changeUpdates) {
      const { error: updateError } = await supabase
        .from('changes')
        .update({ affected_services: update.affected_services })
        .eq('id', update.id)

      if (updateError) {
        console.error(`Error updating change ${update.id}:`, updateError)
      }
    }

    const totalUpdates = incidentUpdates.length + problemUpdates.length + changeUpdates.length
    // Only log if there were actually updates made
    if (totalUpdates > 0) {
      console.log(`Cleanup completed. Updated ${totalUpdates} items (${incidentUpdates.length} incidents, ${problemUpdates.length} problems, ${changeUpdates.length} changes)`)
    }
    
    return {
      success: true,
      updatedIncidents: incidentUpdates.length,
      updatedProblems: problemUpdates.length,
      updatedChanges: changeUpdates.length,
      totalUpdated: totalUpdates
    }

  } catch (error) {
    console.error('Error during infrastructure cleanup:', error)
    throw error
  }
}

/**
 * Clean up orphaned infrastructure references for all environments in an organization
 * This is a more comprehensive cleanup that checks all environments
 */
export async function cleanupAllOrphanedInfrastructureReferences(organizationId: string) {
  const supabase = await createSupabaseServerClient()
  
  try {
    console.log('Starting comprehensive cleanup of orphaned infrastructure references...')

    // Get all infrastructure component IDs for this organization (across all environments)
    const { data: allComponents, error: componentsError } = await supabase
      .from('infrastructure_nodes')
      .select('id')
      .eq('organization_id', organizationId)

    if (componentsError) {
      console.error('Error fetching all components:', componentsError)
      throw componentsError
    }

    const validComponentIds = new Set(allComponents?.map(c => c.id) || [])
    console.log(`Found ${validComponentIds.size} valid infrastructure components`)

    // Clean up incidents
    const { data: incidents, error: incidentsError } = await supabase
      .from('incidents')
      .select('id, affected_services')
      .eq('organization_id', organizationId)
      .not('affected_services', 'is', null)

    if (incidentsError) {
      console.error('Error fetching incidents:', incidentsError)
      throw incidentsError
    }

    let totalIncidentUpdates = 0
    for (const incident of incidents || []) {
      const affectedServices = incident.affected_services || []
      const cleanedServices = affectedServices.filter(serviceId => validComponentIds.has(serviceId))
      
      if (cleanedServices.length !== affectedServices.length) {
        const { error: updateError } = await supabase
          .from('incidents')
          .update({ affected_services: cleanedServices })
          .eq('id', incident.id)

        if (updateError) {
          console.error(`Error updating incident ${incident.id}:`, updateError)
        } else {
          totalIncidentUpdates++
          const removedCount = affectedServices.length - cleanedServices.length
          console.log(`Updated incident ${incident.id}, removed ${removedCount} orphaned components`)
        }
      }
    }

    // Clean up problems
    const { data: problems, error: problemsError } = await supabase
      .from('problems')
      .select('id, affected_services')
      .eq('organization_id', organizationId)
      .not('affected_services', 'is', null)

    if (problemsError) {
      console.error('Error fetching problems:', problemsError)
      throw problemsError
    }

    let totalProblemUpdates = 0
    for (const problem of problems || []) {
      const affectedServices = problem.affected_services || []
      const cleanedServices = affectedServices.filter(serviceId => validComponentIds.has(serviceId))
      
      if (cleanedServices.length !== affectedServices.length) {
        const { error: updateError } = await supabase
          .from('problems')
          .update({ affected_services: cleanedServices })
          .eq('id', problem.id)

        if (updateError) {
          console.error(`Error updating problem ${problem.id}:`, updateError)
        } else {
          totalProblemUpdates++
          const removedCount = affectedServices.length - cleanedServices.length
          console.log(`Updated problem ${problem.id}, removed ${removedCount} orphaned components`)
        }
      }
    }

    // Clean up changes
    const { data: changes, error: changesError } = await supabase
      .from('changes')
      .select('id, affected_services')
      .eq('organization_id', organizationId)
      .not('affected_services', 'is', null)

    if (changesError) {
      console.error('Error fetching changes:', changesError)
      throw changesError
    }

    let totalChangeUpdates = 0
    for (const change of changes || []) {
      const affectedServices = change.affected_services || []
      const cleanedServices = affectedServices.filter(serviceId => validComponentIds.has(serviceId))
      
      if (cleanedServices.length !== affectedServices.length) {
        const { error: updateError } = await supabase
          .from('changes')
          .update({ affected_services: cleanedServices })
          .eq('id', change.id)

        if (updateError) {
          console.error(`Error updating change ${change.id}:`, updateError)
        } else {
          totalChangeUpdates++
          const removedCount = affectedServices.length - cleanedServices.length
          console.log(`Updated change ${change.id}, removed ${removedCount} orphaned components`)
        }
      }
    }

    const totalUpdates = totalIncidentUpdates + totalProblemUpdates + totalChangeUpdates
    console.log(`Comprehensive cleanup completed. Updated ${totalUpdates} items (${totalIncidentUpdates} incidents, ${totalProblemUpdates} problems, ${totalChangeUpdates} changes)`)
    
    return {
      success: true,
      updatedIncidents: totalIncidentUpdates,
      updatedProblems: totalProblemUpdates,
      updatedChanges: totalChangeUpdates,
      totalUpdated: totalUpdates
    }

  } catch (error) {
    console.error('Error during comprehensive infrastructure cleanup:', error)
    throw error
  }
}