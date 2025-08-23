import { Incident, Change, Comment, Problem } from './types'
import { createSupabaseServerClient } from './supabase'
import { getUser } from './auth'

// Incident operations
export async function getIncidents(): Promise<Incident[]> {
  const supabase = await createSupabaseServerClient()
  
  // Organization filtering is handled by RLS policies automatically
  const { data: incidents, error } = await supabase
    .from('incidents')
    .select(`
      id,
      organization_id,
      title,
      description,
      priority,
      status,
      assigned_to,
      created_by,
      problem_id,
      tags,
      affected_services,
      created_at,
      updated_at,
      resolved_at,
      assigned_profile:profiles!assigned_to(full_name, email)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching incidents:', error)
    return []
  }

  return incidents?.map(incident => ({
    id: incident.id,
    organizationId: incident.organization_id,
    title: incident.title,
    description: incident.description,
    priority: incident.priority,
    status: incident.status,
    assignedTo: incident.assigned_to,
    assignedToName: incident.assigned_profile?.full_name || incident.assigned_profile?.email || null,
    createdBy: incident.created_by,
    problemId: incident.problem_id,
    tags: incident.tags || [],
    affectedServices: incident.affected_services || [],
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
      id,
      organization_id,
      title,
      description,
      priority,
      status,
      assigned_to,
      created_by,
      problem_id,
      tags,
      affected_services,
      created_at,
      updated_at,
      resolved_at,
      assigned_profile:profiles!assigned_to(full_name, email)
    `)
    .eq('id', id)
    .single()

  if (error || !incident) {
    return null
  }

  return {
    id: incident.id,
    organizationId: incident.organization_id,
    title: incident.title,
    description: incident.description,
    priority: incident.priority,
    status: incident.status,
    assignedTo: incident.assigned_to,
    assignedToName: incident.assigned_profile?.full_name || incident.assigned_profile?.email || null,
    createdBy: incident.created_by,
    problemId: incident.problem_id,
    tags: incident.tags || [],
    affectedServices: incident.affected_services || [],
    createdAt: incident.created_at,
    updatedAt: incident.updated_at,
    resolvedAt: incident.resolved_at
  }
}

export async function createIncident(data: Omit<Incident, 'id' | 'createdAt' | 'updatedAt'>): Promise<Incident | null> {
  const supabase = await createSupabaseServerClient()
  
  // Get current user to ensure organization_id is set
  const user = await getUser()
  if (!user) {
    console.error('No authenticated user found')
    return null
  }
  
  const { data: incident, error } = await supabase
    .from('incidents')
    .insert({
      organization_id: user.organizationId,
      title: data.title,
      description: data.description,
      priority: data.priority,
      status: data.status,
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
    title: incident.title,
    description: incident.description,
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
  if (data.assignedTo !== undefined) updateData.assigned_to = data.assignedTo
  if (data.problemId !== undefined) updateData.problem_id = data.problemId
  if (data.tags !== undefined) updateData.tags = data.tags
  if (data.affectedServices !== undefined) updateData.affected_services = data.affectedServices
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
    title: incident.title,
    description: incident.description,
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

// Change operations
export async function getChanges(): Promise<Change[]> {
  const supabase = await createSupabaseServerClient()
  
  const { data: changes, error } = await supabase
    .from('changes')
    .select(`
      id,
      title,
      description,
      status,
      priority,
      requested_by,
      assigned_to,
      scheduled_for,
      rollback_plan,
      test_plan,
      tags,
      affected_services,
      created_at,
      updated_at,
      completed_at,
      assigned_profile:profiles!assigned_to(full_name, email)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching changes:', error)
    return []
  }

  return changes?.map(change => ({
    id: change.id,
    title: change.title,
    description: change.description,
    status: change.status,
    priority: change.priority,
    requestedBy: change.requested_by,
    assignedTo: change.assigned_to,
    assignedToName: change.assigned_profile?.full_name || change.assigned_profile?.email || null,
    scheduledFor: change.scheduled_for,
    rollbackPlan: change.rollback_plan,
    testPlan: change.test_plan,
    tags: change.tags || [],
    affectedServices: change.affected_services || [],
    createdAt: change.created_at,
    updatedAt: change.updated_at,
    completedAt: change.completed_at
  })) || []
}

export async function getChange(id: string): Promise<Change | null> {
  const supabase = await createSupabaseServerClient()
  
  const { data: change, error } = await supabase
    .from('changes')
    .select(`
      id,
      title,
      description,
      status,
      priority,
      requested_by,
      assigned_to,
      scheduled_for,
      rollback_plan,
      test_plan,
      tags,
      affected_services,
      created_at,
      updated_at,
      completed_at,
      assigned_profile:profiles!assigned_to(full_name, email)
    `)
    .eq('id', id)
    .single()

  if (error || !change) {
    return null
  }

  return {
    id: change.id,
    title: change.title,
    description: change.description,
    status: change.status,
    priority: change.priority,
    requestedBy: change.requested_by,
    assignedTo: change.assigned_to,
    assignedToName: change.assigned_profile?.full_name || change.assigned_profile?.email || null,
    scheduledFor: change.scheduled_for,
    rollbackPlan: change.rollback_plan,
    testPlan: change.test_plan,
    tags: change.tags || [],
    affectedServices: change.affected_services || [],
    createdAt: change.created_at,
    updatedAt: change.updated_at,
    completedAt: change.completed_at
  }
}

export async function createChange(data: Omit<Change, 'id' | 'createdAt' | 'updatedAt'>): Promise<Change | null> {
  const supabase = await createSupabaseServerClient()
  
  const { data: change, error } = await supabase
    .from('changes')
    .insert({
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      requested_by: data.requestedBy,
      assigned_to: data.assignedTo || null,
      scheduled_for: data.scheduledFor || null,
      rollback_plan: data.rollbackPlan,
      test_plan: data.testPlan,
      tags: data.tags,
      affected_services: data.affectedServices,
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
    title: change.title,
    description: change.description,
    status: change.status,
    priority: change.priority,
    requestedBy: change.requested_by,
    assignedTo: change.assigned_to,
    scheduledFor: change.scheduled_for,
    rollbackPlan: change.rollback_plan,
    testPlan: change.test_plan,
    tags: change.tags || [],
    affectedServices: change.affected_services || [],
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
  if (data.rollbackPlan !== undefined) updateData.rollback_plan = data.rollbackPlan
  if (data.testPlan !== undefined) updateData.test_plan = data.testPlan
  if (data.tags !== undefined) updateData.tags = data.tags
  if (data.affectedServices !== undefined) updateData.affected_services = data.affectedServices
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
    title: change.title,
    description: change.description,
    status: change.status,
    priority: change.priority,
    requestedBy: change.requested_by,
    assignedTo: change.assigned_to,
    scheduledFor: change.scheduled_for,
    rollbackPlan: change.rollback_plan,
    testPlan: change.test_plan,
    tags: change.tags || [],
    affectedServices: change.affected_services || [],
    createdAt: change.created_at,
    updatedAt: change.updated_at,
    completedAt: change.completed_at
  }
}