import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  try {
    const supabase = await createSupabaseServerClient()
    
    const { data: changes, error } = await supabase
      .from('changes')
      .select(`
        id, title, priority, status, scheduled_for,
        assigned_to, created_at, updated_at, completed_at,
        assigned_profile:profiles!assigned_to(full_name, email)
      `)
      .eq('problem_id', params.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching related changes:', error)
      return NextResponse.json({ error: 'Failed to fetch related changes' }, { status: 500 })
    }

    const formattedChanges = changes?.map(change => {
      const assignedProfile = Array.isArray(change.assigned_profile) 
        ? change.assigned_profile[0] 
        : change.assigned_profile
      
      return {
        id: change.id,
        title: change.title,
        priority: change.priority,
        status: change.status,
        scheduledFor: change.scheduled_for,
        assignedTo: change.assigned_to,
        assignedToName: assignedProfile?.full_name || assignedProfile?.email || null,
        createdAt: change.created_at,
        updatedAt: change.updated_at,
        completedAt: change.completed_at
      }
    }) || []

    return NextResponse.json(formattedChanges)
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}