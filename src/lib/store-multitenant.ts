import { Incident, Change, Comment, Problem } from './types'
import { createSupabaseServerClient } from './supabase'
import { getUser } from './auth'

// Helper function to get current user organization
async function getCurrentUserOrg() {
  const user = await getUser()
  if (!user) throw new Error('No authenticated user')
  return user.organizationId
}

// Incident operations
export async function getIncidents(): Promise<Incident[]> {
  const supabase = await createSupabaseServerClient()
  
  const { data: incidents, error } = await supabase
    .from('incidents')
    .select(`
      id, organization_id, incident_number, title, description, priority, status,
      criticality, urgency, assigned_to, created_by, problem_id, tags, affected_services, links,
      created_at, updated_at, resolved_at,
      assigned_profile:profiles!assigned_to(full_name, email),
      linked_problem:problems!problem_id(title)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching incidents:', error)
    return []
  }

  // Get all unique service IDs from incidents
  const allServiceIds = [...new Set(
    incidents?.flatMap(incident => incident.affected_services || []) || []
  )].filter(id => id && id.trim() !== '')

  // Fetch service information if we have service IDs
  let serviceMap = new Map<string, { label: string; environment: string }>()
  
  if (allServiceIds.length > 0) {
    // Fetch from infrastructure_nodes
    const { data: nodes } = await supabase
      .from('infrastructure_nodes')
      .select(`
        id,
        label,
        infrastructure_environments!inner(name)
      `)
      .in('id', allServiceIds)

    // Fetch from infrastructure_zones
    const { data: zones } = await supabase
      .from('infrastructure_zones')
      .select(`
        id,
        name,
        infrastructure_environments!inner(name)
      `)
      .in('id', allServiceIds)

    // Build service map
    nodes?.forEach(node => {
      serviceMap.set(node.id, {
        label: node.label,
        environment: (() => {
          const env = Array.isArray(node.infrastructure_environments) ? node.infrastructure_environments[0] : node.infrastructure_environments
          return env?.name
        })()
      })
    })

    zones?.forEach(zone => {
      serviceMap.set(zone.id, {
        label: zone.name,
        environment: (() => {
          const env = Array.isArray(zone.infrastructure_environments) ? zone.infrastructure_environments[0] : zone.infrastructure_environments
          return env?.name
        })()
      })
    })
  }

  return incidents?.map(incident => ({
    id: incident.id,
    organizationId: incident.organization_id,
    incident_number: incident.incident_number,
    title: incident.title,
    description: incident.description,
    priority: incident.priority,
    status: incident.status,
    criticality: incident.criticality,
    urgency: incident.urgency,
    assignedTo: incident.assigned_to,
    assignedToName: (() => {
      const profile = Array.isArray(incident.assigned_profile) ? incident.assigned_profile[0] : incident.assigned_profile
      return profile?.full_name || profile?.email || undefined
    })(),
    createdBy: incident.created_by,
    problemId: incident.problem_id,
    problemTitle: (() => {
      const problem = Array.isArray(incident.linked_problem) ? incident.linked_problem[0] : incident.linked_problem
      return problem?.title || undefined
    })(),
    tags: incident.tags || [],
    affectedServices: incident.affected_services || [],
    links: incident.links || [],
    // Add service information for easy access
    serviceInfo: (incident.affected_services || []).map((serviceId: string) => {
      const info = serviceMap.get(serviceId)
      return {
        id: serviceId,
        label: info?.label || serviceId,
        environment: info?.environment || 'Unknown Environment'
      }
    }),
    createdAt: incident.created_at,
    updatedAt: incident.updated_at,
    resolvedAt: incident.resolved_at
  })) || []
}

export async function getIncident(id: string): Promise<Incident | null> {
  const supabase = await createSupabaseServerClient()
  
  const { data: incident, error } = await supabase
    .from('incidents')
    .select(`
      id, organization_id, incident_number, title, description, priority, status,
      criticality, urgency, assigned_to, created_by, problem_id, tags, affected_services, links,
      created_at, updated_at, resolved_at,
      assigned_profile:profiles!assigned_to(full_name, email)
    `)
    .eq('id', id)
    .single()

  if (error || !incident) return null

  return {
    id: incident.id,
    organizationId: incident.organization_id,
    incident_number: incident.incident_number,
    title: incident.title,
    description: incident.description,
    priority: incident.priority,
    status: incident.status,
    criticality: incident.criticality,
    urgency: incident.urgency,
    assignedTo: incident.assigned_to,
    assignedToName: (() => {
      const profile = Array.isArray(incident.assigned_profile) ? incident.assigned_profile[0] : incident.assigned_profile
      return profile?.full_name || profile?.email || undefined
    })(),
    createdBy: incident.created_by,
    problemId: incident.problem_id,
    tags: incident.tags || [],
    affectedServices: incident.affected_services || [],
    links: incident.links || [],
    createdAt: incident.created_at,
    updatedAt: incident.updated_at,
    resolvedAt: incident.resolved_at
  }
}

export async function createIncident(data: Omit<Incident, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>): Promise<Incident | null> {
  const supabase = await createSupabaseServerClient()
  const orgId = await getCurrentUserOrg()
  
  const { data: incident, error } = await supabase
    .from('incidents')
    .insert({
      organization_id: orgId,
      title: data.title,
      description: data.description,
      priority: data.priority,
      status: data.status,
      criticality: data.criticality,
      urgency: data.urgency,
      assigned_to: data.assignedTo || null,
      created_by: data.createdBy,
      problem_id: data.problemId || null,
      tags: data.tags,
      affected_services: data.affectedServices,
      resolved_at: data.resolvedAt || null
    })
    .select()
    .single()

  if (error || !incident) {
    console.error('Error creating incident:', error)
    return null
  }

  return {
    id: incident.id,
    organizationId: incident.organization_id,
    title: incident.title,
    description: incident.description,
    criticality: incident.criticality,
    urgency: incident.urgency,
    priority: incident.priority,
    status: incident.status,
    assignedTo: incident.assigned_to,
    createdBy: incident.created_by,
    problemId: incident.problem_id,
    tags: incident.tags || [],
    affectedServices: incident.affected_services || [],
    createdAt: incident.created_at,
    updatedAt: incident.updated_at,
    resolvedAt: incident.resolved_at
  }
}

export async function updateIncident(id: string, data: Partial<Incident>): Promise<Incident | null> {
  const supabase = await createSupabaseServerClient()
  
  const updateData: any = {}
  if (data.title !== undefined) updateData.title = data.title
  if (data.description !== undefined) updateData.description = data.description
  if (data.priority !== undefined) updateData.priority = data.priority
  if (data.status !== undefined) updateData.status = data.status
  if (data.criticality !== undefined) updateData.criticality = data.criticality
  if (data.urgency !== undefined) updateData.urgency = data.urgency
  if (data.assignedTo !== undefined) updateData.assigned_to = data.assignedTo
  if (data.problemId !== undefined) updateData.problem_id = data.problemId
  if (data.tags !== undefined) updateData.tags = data.tags
  if (data.affectedServices !== undefined) updateData.affected_services = data.affectedServices
  if (data.links !== undefined) updateData.links = data.links
  if (data.resolvedAt !== undefined) updateData.resolved_at = data.resolvedAt

  const { data: incident, error } = await supabase
    .from('incidents')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error || !incident) {
    console.error('Error updating incident:', error)
    return null
  }

  return {
    id: incident.id,
    organizationId: incident.organization_id,
    title: incident.title,
    description: incident.description,
    priority: incident.priority,
    status: incident.status,
    criticality: incident.criticality,
    urgency: incident.urgency,
    assignedTo: incident.assigned_to,
    createdBy: incident.created_by,
    problemId: incident.problem_id,
    tags: incident.tags || [],
    affectedServices: incident.affected_services || [],
    createdAt: incident.created_at,
    updatedAt: incident.updated_at,
    resolvedAt: incident.resolved_at
  }
}

// Change operations
export async function getChanges(incidentId?: string): Promise<Change[]> {
  const supabase = await createSupabaseServerClient()
  
  let query = supabase
    .from('changes')
    .select(`
      id, organization_id, change_number, title, description, status, priority,
      requested_by, assigned_to, scheduled_for, estimated_end_time, rollback_plan, test_plan,
      tags, affected_services, problem_id, incident_id, created_at, updated_at, completed_at,
      assigned_profile:profiles!assigned_to(full_name, email),
      linked_problem:problems!problem_id(title),
      linked_incident:incidents!incident_id(title)
    `)

  // Filter by incident ID if provided
  if (incidentId) {
    query = query.eq('incident_id', incidentId)
  }

  const { data: changes, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching changes:', error)
    return []
  }

  // Get all unique service IDs from changes
  const allServiceIds = [...new Set(
    changes?.flatMap(change => change.affected_services || []) || []
  )].filter(id => id && id.trim() !== '')

  // Fetch service information if we have service IDs
  let serviceMap = new Map<string, { label: string; environment: string }>()
  
  if (allServiceIds.length > 0) {
    // Fetch from infrastructure_nodes
    const { data: nodes } = await supabase
      .from('infrastructure_nodes')
      .select(`
        id,
        label,
        infrastructure_environments!inner(name)
      `)
      .in('id', allServiceIds)

    // Fetch from infrastructure_zones
    const { data: zones } = await supabase
      .from('infrastructure_zones')
      .select(`
        id,
        name,
        infrastructure_environments!inner(name)
      `)
      .in('id', allServiceIds)

    // Build service map
    nodes?.forEach(node => {
      serviceMap.set(node.id, {
        label: node.label,
        environment: (() => {
          const env = Array.isArray(node.infrastructure_environments) ? node.infrastructure_environments[0] : node.infrastructure_environments
          return env?.name
        })()
      })
    })

    zones?.forEach(zone => {
      serviceMap.set(zone.id, {
        label: zone.name,
        environment: (() => {
          const env = Array.isArray(zone.infrastructure_environments) ? zone.infrastructure_environments[0] : zone.infrastructure_environments
          return env?.name
        })()
      })
    })
  }

  const mappedChanges = changes?.map(change => ({
    id: change.id,
    organizationId: change.organization_id,
    change_number: change.change_number,
    title: change.title,
    description: change.description,
    status: change.status,
    priority: change.priority,
    requestedBy: change.requested_by,
    assignedTo: change.assigned_to,
    assignedToName: (() => {
      const profile = Array.isArray(change.assigned_profile) ? change.assigned_profile[0] : change.assigned_profile
      return profile?.full_name || profile?.email || undefined
    })(),
    scheduledFor: change.scheduled_for,
    estimatedEndTime: change.estimated_end_time,
    rollbackPlan: change.rollback_plan,
    testPlan: change.test_plan,
    tags: change.tags || [],
    affectedServices: change.affected_services || [],
    // Add service information for easy access
    serviceInfo: (change.affected_services || []).map((serviceId: string) => {
      const info = serviceMap.get(serviceId)
      return {
        id: serviceId,
        label: info?.label || serviceId,
        environment: info?.environment || 'Unknown Environment'
      }
    }),
    problemId: change.problem_id,
    problemTitle: (() => {
      const problem = Array.isArray(change.linked_problem) ? change.linked_problem[0] : change.linked_problem
      return problem?.title || undefined
    })(),
    incidentId: change.incident_id,
    incidentTitle: (() => {
      const incident = Array.isArray(change.linked_incident) ? change.linked_incident[0] : change.linked_incident
      return incident?.title || undefined
    })(),
    createdAt: change.created_at,
    updatedAt: change.updated_at,
    completedAt: change.completed_at
  })) || []
  
  
  return mappedChanges
}

export async function getChange(id: string): Promise<Change | null> {
  const supabase = await createSupabaseServerClient()
  
  const { data: change, error } = await supabase
    .from('changes')
    .select(`
      id, organization_id, change_number, title, description, status, priority,
      requested_by, assigned_to, scheduled_for, estimated_end_time, rollback_plan, test_plan,
      tags, affected_services, problem_id, incident_id, created_at, updated_at, completed_at,
      assigned_profile:profiles!assigned_to(full_name, email),
      linked_problem:problems!problem_id(title),
      linked_incident:incidents!incident_id(title)
    `)
    .eq('id', id)
    .single()

  if (error || !change) return null

  return {
    id: change.id,
    organizationId: change.organization_id,
    change_number: change.change_number,
    title: change.title,
    description: change.description,
    status: change.status,
    priority: change.priority,
    requestedBy: change.requested_by,
    assignedTo: change.assigned_to,
    assignedToName: (() => {
      const profile = Array.isArray(change.assigned_profile) ? change.assigned_profile[0] : change.assigned_profile
      return profile?.full_name || profile?.email || undefined
    })(),
    scheduledFor: change.scheduled_for,
    estimatedEndTime: change.estimated_end_time,
    rollbackPlan: change.rollback_plan,
    testPlan: change.test_plan,
    tags: change.tags || [],
    affectedServices: change.affected_services || [],
    problemId: change.problem_id,
    problemTitle: (() => {
      const problem = Array.isArray(change.linked_problem) ? change.linked_problem[0] : change.linked_problem
      return problem?.title || undefined
    })(),
    incidentId: change.incident_id,
    incidentTitle: (() => {
      const incident = Array.isArray(change.linked_incident) ? change.linked_incident[0] : change.linked_incident
      return incident?.title || undefined
    })(),
    createdAt: change.created_at,
    updatedAt: change.updated_at,
    completedAt: change.completed_at
  }
}

export async function createChange(data: Omit<Change, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>): Promise<Change | null> {
  const supabase = await createSupabaseServerClient()
  const orgId = await getCurrentUserOrg()
  
  const { data: change, error } = await supabase
    .from('changes')
    .insert({
      organization_id: orgId,
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      requested_by: data.requestedBy,
      assigned_to: data.assignedTo || null,
      scheduled_for: data.scheduledFor || null,
      estimated_end_time: data.estimatedEndTime || null,
      rollback_plan: data.rollbackPlan,
      test_plan: data.testPlan,
      tags: data.tags,
      affected_services: data.affectedServices,
      problem_id: data.problemId || null,
      incident_id: data.incidentId || null,
      completed_at: data.completedAt || null
    })
    .select()
    .single()

  if (error || !change) {
    console.error('Error creating change:', error)
    return null
  }

  return {
    id: change.id,
    organizationId: change.organization_id,
    change_number: change.change_number,
    title: change.title,
    description: change.description,
    status: change.status,
    priority: change.priority,
    requestedBy: change.requested_by,
    assignedTo: change.assigned_to,
    scheduledFor: change.scheduled_for,
    estimatedEndTime: change.estimated_end_time,
    rollbackPlan: change.rollback_plan,
    testPlan: change.test_plan,
    tags: change.tags || [],
    affectedServices: change.affected_services || [],
    problemId: change.problem_id,
    incidentId: change.incident_id,
    createdAt: change.created_at,
    updatedAt: change.updated_at,
    completedAt: change.completed_at
  }
}

export async function updateChange(id: string, data: Partial<Change>): Promise<Change | null> {
  const supabase = await createSupabaseServerClient()
  
  const updateData: any = {}
  if (data.title !== undefined) updateData.title = data.title
  if (data.description !== undefined) updateData.description = data.description
  if (data.status !== undefined) updateData.status = data.status
  if (data.priority !== undefined) updateData.priority = data.priority
  if (data.assignedTo !== undefined) updateData.assigned_to = data.assignedTo
  if (data.scheduledFor !== undefined) updateData.scheduled_for = data.scheduledFor
  if (data.estimatedEndTime !== undefined) updateData.estimated_end_time = data.estimatedEndTime
  if (data.rollbackPlan !== undefined) updateData.rollback_plan = data.rollbackPlan
  if (data.testPlan !== undefined) updateData.test_plan = data.testPlan
  if (data.tags !== undefined) updateData.tags = data.tags
  if (data.affectedServices !== undefined) updateData.affected_services = data.affectedServices
  if (data.problemId !== undefined) updateData.problem_id = data.problemId
  if (data.incidentId !== undefined) updateData.incident_id = data.incidentId
  if (data.completedAt !== undefined) updateData.completed_at = data.completedAt

  const { data: change, error } = await supabase
    .from('changes')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error || !change) {
    console.error('Error updating change:', error)
    return null
  }

  return {
    id: change.id,
    organizationId: change.organization_id,
    change_number: change.change_number,
    title: change.title,
    description: change.description,
    status: change.status,
    priority: change.priority,
    requestedBy: change.requested_by,
    assignedTo: change.assigned_to,
    scheduledFor: change.scheduled_for,
    estimatedEndTime: change.estimated_end_time,
    rollbackPlan: change.rollback_plan,
    testPlan: change.test_plan,
    tags: change.tags || [],
    affectedServices: change.affected_services || [],
    problemId: change.problem_id,
    incidentId: change.incident_id,
    createdAt: change.created_at,
    updatedAt: change.updated_at,
    completedAt: change.completed_at
  }
}