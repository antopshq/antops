import { createSupabaseServerClient } from './supabase'

export async function getRelatedIncidents(problemId: string) {
  const supabase = await createSupabaseServerClient()
  
  const { data: incidents, error } = await supabase
    .from('incidents')
    .select(`
      id,
      title,
      priority,
      status,
      created_at,
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
      return profile?.full_name || profile?.email || null
    })()
  })) || []
}