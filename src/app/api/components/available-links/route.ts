import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

// GET /api/components/available-links - Get all incidents/problems/changes available for linking
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
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const type = searchParams.get('type') // 'incidents', 'problems', 'changes', or null for all

    const searchFilter = search ? `title.ilike.%${search}%` : undefined

    let incidents: any[] = []
    let problems: any[] = []
    let changes: any[] = []

    // Get incidents
    if (!type || type === 'incidents') {
      const query = supabase
        .from('incidents')
        .select(`
          id, title, status, priority, created_at,
          assigned_profile:profiles!assigned_to(full_name),
          affected_services
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (searchFilter) {
        query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
      }

      const { data, error } = await query
      if (error) {
        console.error('Error fetching incidents:', error)
      } else {
        incidents = data || []
      }
    }

    // Get problems
    if (!type || type === 'problems') {
      const query = supabase
        .from('problems')
        .select(`
          id, title, status, priority, created_at,
          assigned_profile:profiles!assigned_to(full_name),
          affected_services
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (searchFilter) {
        query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
      }

      const { data, error } = await query
      if (error) {
        console.error('Error fetching problems:', error)
      } else {
        problems = data || []
      }
    }

    // Get changes
    if (!type || type === 'changes') {
      const query = supabase
        .from('changes')
        .select(`
          id, title, status, priority, created_at,
          assigned_profile:profiles!assigned_to(full_name),
          affected_services
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (searchFilter) {
        query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
      }

      const { data, error } = await query
      if (error) {
        console.error('Error fetching changes:', error)
      } else {
        changes = data || []
      }
    }

    return NextResponse.json({
      incidents,
      problems,
      changes
    })

  } catch (error) {
    console.error('GET /api/components/available-links error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}