import { Organization, Profile, UserRole } from './types'
import { createSupabaseServerClient } from './supabase'

// Organization operations
export async function getOrganization(id: string): Promise<Organization | null> {
  const supabase = await createSupabaseServerClient()
  
  const { data: organization, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !organization) {
    return null
  }

  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    description: organization.description,
    settings: organization.settings || {},
    billingTier: organization.billing_tier || 'free',
    billingExpiresAt: organization.billing_expires_at,
    createdAt: organization.created_at,
    updatedAt: organization.updated_at
  }
}

export async function getCurrentUserOrganization(): Promise<Organization | null> {
  const supabase = await createSupabaseServerClient()
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select(`
      organization_id,
      organizations!inner(
        id,
        name,
        slug,
        description,
        settings,
        billing_tier,
        billing_expires_at,
        created_at,
        updated_at
      )
    `)
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
    .single()

  if (error || !profile) {
    console.error('Error fetching user organization:', error)
    return null
  }

  const org = Array.isArray(profile.organizations) ? profile.organizations[0] : profile.organizations
  if (!org) {
    return null
  }
  
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    description: org.description,
    settings: org.settings || {},
    billingTier: org.billing_tier,
    billingExpiresAt: org.billing_expires_at,
    createdAt: org.created_at,
    updatedAt: org.updated_at
  }
}

export async function updateOrganization(id: string, data: Partial<Organization>): Promise<Organization | null> {
  const supabase = await createSupabaseServerClient()
  
  const updateData: any = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.description !== undefined) updateData.description = data.description
  if (data.settings !== undefined) updateData.settings = data.settings

  const { data: organization, error } = await supabase
    .from('organizations')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error || !organization) {
    console.error('Error updating organization:', error)
    return null
  }

  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    description: organization.description,
    settings: organization.settings || {},
    billingTier: organization.billing_tier || 'free',
    billingExpiresAt: organization.billing_expires_at,
    createdAt: organization.created_at,
    updatedAt: organization.updated_at
  }
}

// Team member operations
export async function getOrganizationMembers(): Promise<Profile[]> {
  const supabase = await createSupabaseServerClient()
  
  const { data: members, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching organization members:', error)
    return []
  }

  return members?.map(member => ({
    id: member.id,
    email: member.email,
    fullName: member.full_name,
    jobTitle: member.job_title,
    avatarUrl: member.avatar_url,
    organizationId: member.organization_id,
    role: member.role,
    createdAt: member.created_at,
    updatedAt: member.updated_at
  })) || []
}

export async function updateMemberRole(memberId: string, role: UserRole): Promise<boolean> {
  const supabase = await createSupabaseServerClient()
  
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', memberId)

  if (error) {
    console.error('Error updating member role:', error)
    return false
  }

  return true
}

export async function inviteMember(email: string, role: UserRole = 'member'): Promise<boolean> {
  const supabase = await createSupabaseServerClient()
  
  // Get current user's organization
  const currentOrg = await getCurrentUserOrganization()
  if (!currentOrg) return false

  try {
    // Invite user via Supabase auth
    const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: {
        organization_id: currentOrg.id,
        role: role,
        invited: true
      },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
    })

    if (error) {
      console.error('Error inviting user:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error inviting member:', error)
    return false
  }
}

// Helper functions for role checks
export async function getCurrentUserRole(): Promise<UserRole | null> {
  const supabase = await createSupabaseServerClient()
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
    .single()

  if (error || !profile) {
    return null
  }

  return profile.role
}

export async function userHasPermission(requiredRole: UserRole): Promise<boolean> {
  const currentRole = await getCurrentUserRole()
  if (!currentRole) return false

  const roleHierarchy: Record<UserRole, number> = {
    viewer: 1,
    member: 2,
    manager: 3,
    admin: 4,
    owner: 5
  }

  return roleHierarchy[currentRole] >= roleHierarchy[requiredRole]
}

// Organization stats
export async function getOrganizationStats() {
  const supabase = await createSupabaseServerClient()
  
  // Get basic stats from the view
  const { data: stats, error } = await supabase
    .from('user_organization_stats')
    .select('*')
    .single()

  if (error) {
    console.error('Error fetching organization stats:', error)
    return {
      totalMembers: 0,
      openIncidents: 0,
      activeProblems: 0,
      activeChanges: 0,
      slaComplianceRate: 0,
      changeSuccessRate: 0,
      organizationName: 'Unknown',
      criticalIncidents: 0,
      highPriorityIncidents: 0,
      incidentsResolvedToday: 0,
      changesScheduledToday: 0,
      averageResolutionTime: 0,
      problemBacklog: 0,
      emergencyChanges: 0,
      slaBreaches: 0,
      mttr: 0,
      mtbf: 0
    }
  }

  // Get current time for today's calculations
  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

  // Get SLA configurations
  const { data: slaConfigs } = await supabase
    .from('sla_configurations')
    .select('priority, resolution_time_hours')

  // Create a map of priority to SLA hours, with fallback defaults
  const slaMap: Record<string, number> = {
    'critical': 2,
    'high': 8, 
    'medium': 24,
    'low': 72
  }
  
  if (slaConfigs) {
    slaConfigs.forEach(config => {
      slaMap[config.priority] = config.resolution_time_hours
    })
  }

  // Get detailed incident metrics
  const { data: allIncidents } = await supabase
    .from('incidents')
    .select('created_at, resolved_at, status, priority')

  const openIncidents = allIncidents?.filter(i => i.status !== 'closed') || []
  const criticalIncidents = openIncidents.filter(i => i.priority === 'critical').length
  const highPriorityIncidents = openIncidents.filter(i => i.priority === 'high').length

  // Incidents resolved today
  const incidentsResolvedToday = allIncidents?.filter(i => 
    i.resolved_at && 
    new Date(i.resolved_at) >= todayStart && 
    new Date(i.resolved_at) < todayEnd
  ).length || 0

  // Calculate SLA metrics
  const closedIncidents = allIncidents?.filter(i => i.status === 'closed' && i.resolved_at) || []
  let slaComplianceRate = 0
  let slaBreaches = 0
  let totalResolutionTime = 0

  if (closedIncidents.length > 0) {
    const slaResults = closedIncidents.map(incident => {
      const created = new Date(incident.created_at)
      const resolved = new Date(incident.resolved_at)
      const hoursToResolve = (resolved.getTime() - created.getTime()) / (1000 * 60 * 60)
      const slaHours = slaMap[incident.priority] || slaMap['medium']
      totalResolutionTime += hoursToResolve
      return { hoursToResolve, slaHours, withinSla: hoursToResolve <= slaHours }
    })

    const withinSla = slaResults.filter(r => r.withinSla).length
    slaComplianceRate = Math.round((withinSla / closedIncidents.length) * 100)
    slaBreaches = closedIncidents.length - withinSla
  }

  // Average resolution time (MTTR - Mean Time To Resolution)
  const mttr = closedIncidents.length > 0 ? Math.round(totalResolutionTime / closedIncidents.length) : 0

  // MTBF calculation (Mean Time Between Failures) - time between critical incidents
  const criticalClosedIncidents = closedIncidents
    .filter(i => i.priority === 'critical')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  let mtbf = 0
  if (criticalClosedIncidents.length > 1) {
    let totalTimeBetween = 0
    for (let i = 1; i < criticalClosedIncidents.length; i++) {
      const prev = new Date(criticalClosedIncidents[i-1].created_at)
      const curr = new Date(criticalClosedIncidents[i].created_at)
      totalTimeBetween += (curr.getTime() - prev.getTime()) / (1000 * 60 * 60)
    }
    mtbf = Math.round(totalTimeBetween / (criticalClosedIncidents.length - 1))
  }

  // Get change metrics
  const { data: allChanges } = await supabase
    .from('changes')
    .select('status, scheduled_for, priority')

  const changesScheduledToday = allChanges?.filter(c => 
    c.scheduled_for && 
    new Date(c.scheduled_for) >= todayStart && 
    new Date(c.scheduled_for) < todayEnd
  ).length || 0

  const emergencyChanges = allChanges?.filter(c => c.priority === 'critical').length || 0

  // Calculate Change Success Rate
  const completedChanges = allChanges?.filter(c => 
    c.status === 'completed' || c.status === 'failed' || c.status === 'cancelled'
  ) || []
  
  let changeSuccessRate = 0
  if (completedChanges.length > 0) {
    const successfulChanges = completedChanges.filter(c => c.status === 'completed')
    changeSuccessRate = Math.round((successfulChanges.length / completedChanges.length) * 100)
  }

  // Get problem metrics
  const { data: allProblems } = await supabase
    .from('problems')
    .select('status')

  const problemBacklog = allProblems?.filter(p => 
    p.status === 'identified' || p.status === 'investigating'
  ).length || 0

  // Get organization name directly if not available in stats
  let organizationName = stats.organization_name || 'Unknown'
  if (organizationName === 'Unknown') {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()
      
      if (profile?.organization_id) {
        const { data: org } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', profile.organization_id)
          .single()
        
        if (org?.name) {
          organizationName = org.name
        }
      }
    }
  }

  return {
    totalMembers: stats.total_members || 0,
    openIncidents: stats.open_incidents || 0,
    activeProblems: stats.active_problems || 0,
    activeChanges: stats.active_changes || 0,
    slaComplianceRate,
    changeSuccessRate,
    organizationName,
    criticalIncidents,
    highPriorityIncidents,
    incidentsResolvedToday,
    changesScheduledToday,
    averageResolutionTime: mttr,
    problemBacklog,
    emergencyChanges,
    slaBreaches,
    mttr,
    mtbf
  }
}