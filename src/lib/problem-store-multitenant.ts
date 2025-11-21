import { Problem } from './types'
import { createSupabaseServerClient } from './supabase'
import { getUser } from './auth'

// Helper function to get current user organization
async function getCurrentUserOrg() {
  const user = await getUser()
  if (!user) throw new Error('No authenticated user')
  return user.organizationId
}

// Problem operations
export async function getProblems(): Promise<Problem[]> {
  const supabase = await createSupabaseServerClient()
  
  const { data: problems, error } = await supabase
    .from('problems')
    .select(`
      id, organization_id, problem_number, title, description, criticality, urgency, priority, status,
      assigned_to, created_by, root_cause, workaround, solution,
      tags, affected_services, created_at, updated_at, resolved_at,
      assigned_profile:profiles!assigned_to(full_name, email)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching problems:', error)
    return []
  }

  return problems?.map(problem => ({
    id: problem.id,
    organizationId: problem.organization_id,
    problem_number: problem.problem_number,
    title: problem.title,
    description: problem.description,
    criticality: problem.criticality,
    urgency: problem.urgency,
    priority: problem.priority,
    status: problem.status,
    assignedTo: problem.assigned_to,
    assignedToName: (() => {
      const profile = Array.isArray(problem.assigned_profile) ? problem.assigned_profile[0] : problem.assigned_profile
      return profile?.full_name || profile?.email || undefined
    })(),
    createdBy: problem.created_by,
    rootCause: problem.root_cause,
    workaround: problem.workaround,
    solution: problem.solution,
    tags: problem.tags || [],
    affectedServices: problem.affected_services || [],
    createdAt: problem.created_at,
    updatedAt: problem.updated_at,
    resolvedAt: problem.resolved_at
  })) || []
}

export async function getProblem(id: string): Promise<Problem | null> {
  const supabase = await createSupabaseServerClient()
  
  const { data: problem, error } = await supabase
    .from('problems')
    .select(`
      id, organization_id, problem_number, title, description, criticality, urgency, priority, status,
      assigned_to, created_by, root_cause, workaround, solution,
      tags, affected_services, created_at, updated_at, resolved_at,
      assigned_profile:profiles!assigned_to(full_name, email)
    `)
    .eq('id', id)
    .single()

  if (error || !problem) return null

  return {
    id: problem.id,
    organizationId: problem.organization_id,
    problem_number: problem.problem_number,
    title: problem.title,
    description: problem.description,
    criticality: problem.criticality,
    urgency: problem.urgency,
    priority: problem.priority,
    status: problem.status,
    assignedTo: problem.assigned_to,
    assignedToName: (() => {
      const profile = Array.isArray(problem.assigned_profile) ? problem.assigned_profile[0] : problem.assigned_profile
      return profile?.full_name || profile?.email || undefined
    })(),
    createdBy: problem.created_by,
    rootCause: problem.root_cause,
    workaround: problem.workaround,
    solution: problem.solution,
    tags: problem.tags || [],
    affectedServices: problem.affected_services || [],
    createdAt: problem.created_at,
    updatedAt: problem.updated_at,
    resolvedAt: problem.resolved_at
  }
}

export async function createProblem(data: Omit<Problem, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>): Promise<Problem | null> {
  const supabase = await createSupabaseServerClient()
  const orgId = await getCurrentUserOrg()
  
  const { data: problem, error } = await supabase
    .from('problems')
    .insert({
      organization_id: orgId,
      title: data.title,
      description: data.description,
      priority: data.priority,
      status: data.status,
      assigned_to: data.assignedTo || null,
      created_by: data.createdBy,
      root_cause: data.rootCause || null,
      workaround: data.workaround || null,
      solution: data.solution || null,
      tags: data.tags,
      affected_services: data.affectedServices,
      resolved_at: data.resolvedAt || null
    })
    .select()
    .single()

  if (error || !problem) {
    console.error('Error creating problem:', error)
    return null
  }

  return {
    id: problem.id,
    organizationId: problem.organization_id,
    title: problem.title,
    description: problem.description,
    criticality: problem.criticality,
    urgency: problem.urgency,
    priority: problem.priority,
    status: problem.status,
    assignedTo: problem.assigned_to,
    assignedToName: undefined,
    createdBy: problem.created_by,
    rootCause: problem.root_cause,
    workaround: problem.workaround,
    solution: problem.solution,
    tags: problem.tags || [],
    affectedServices: problem.affected_services || [],
    createdAt: problem.created_at,
    updatedAt: problem.updated_at,
    resolvedAt: problem.resolved_at
  }
}

export async function updateProblem(id: string, data: Partial<Problem>): Promise<Problem | null> {
  const supabase = await createSupabaseServerClient()
  
  const updateData: any = {}
  if (data.title !== undefined) updateData.title = data.title
  if (data.description !== undefined) updateData.description = data.description
  if (data.priority !== undefined) updateData.priority = data.priority
  if (data.status !== undefined) updateData.status = data.status
  if (data.assignedTo !== undefined) updateData.assigned_to = data.assignedTo
  if (data.rootCause !== undefined) updateData.root_cause = data.rootCause
  if (data.workaround !== undefined) updateData.workaround = data.workaround
  if (data.solution !== undefined) updateData.solution = data.solution
  if (data.tags !== undefined) updateData.tags = data.tags
  if (data.affectedServices !== undefined) updateData.affected_services = data.affectedServices
  if (data.resolvedAt !== undefined) updateData.resolved_at = data.resolvedAt

  const { data: problem, error } = await supabase
    .from('problems')
    .update(updateData)
    .eq('id', id)
    .select(`
      id, organization_id, title, description, criticality, urgency, priority, status,
      assigned_to, created_by, root_cause, workaround, solution,
      tags, affected_services, created_at, updated_at, resolved_at,
      assigned_profile:profiles!assigned_to(full_name, email)
    `)
    .single()

  if (error || !problem) {
    console.error('Error updating problem:', error)
    return null
  }

  return {
    id: problem.id,
    organizationId: problem.organization_id,
    title: problem.title,
    description: problem.description,
    criticality: problem.criticality,
    urgency: problem.urgency,
    priority: problem.priority,
    status: problem.status,
    assignedTo: problem.assigned_to,
    assignedToName: (() => {
      const profile = Array.isArray(problem.assigned_profile) ? problem.assigned_profile[0] : problem.assigned_profile
      return profile?.full_name || profile?.email || undefined
    })(),
    createdBy: problem.created_by,
    rootCause: problem.root_cause,
    workaround: problem.workaround,
    solution: problem.solution,
    tags: problem.tags || [],
    affectedServices: problem.affected_services || [],
    createdAt: problem.created_at,
    updatedAt: problem.updated_at,
    resolvedAt: problem.resolved_at
  }
}

export async function getRelatedIncidents(problemId: string) {
  const supabase = await createSupabaseServerClient()
  
  const { data: incidents, error } = await supabase
    .from('incidents')
    .select(`
      id, title, priority, status, created_at,
      assigned_profile:profiles!assigned_to(full_name, email)
    `)
    .eq('problem_id', problemId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching related incidents:', error)
    return []
  }

  return incidents?.map(incident => ({
    id: incident.id,
    title: incident.title,
    priority: incident.priority,
    status: incident.status,
    createdAt: incident.created_at,
    assignedToName: (() => {
      const profile = Array.isArray(incident.assigned_profile) ? incident.assigned_profile[0] : incident.assigned_profile
      return profile?.full_name || profile?.email || undefined
    })()
  })) || []
}