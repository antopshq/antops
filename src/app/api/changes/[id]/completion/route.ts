import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase'

// Handle change completion response
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: changeId } = await params
    const body = await request.json()
    const { outcome, notes } = body // outcome: 'completed' | 'failed'

    if (!outcome || !['completed', 'failed'].includes(outcome)) {
      return NextResponse.json({ error: 'Invalid outcome. Must be "completed" or "failed"' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()

    // Get the change to validate
    const { data: change, error: changeError } = await supabase
      .from('changes')
      .select('*')
      .eq('id', changeId)
      .single()

    if (changeError || !change) {
      return NextResponse.json({ error: 'Change not found' }, { status: 404 })
    }

    // Check if user is assigned to this change
    if (change.assigned_to !== user.id) {
      return NextResponse.json({ error: 'Only the assigned user can mark change completion' }, { status: 403 })
    }

    // Check if change is in progress
    if (change.status !== 'in_progress') {
      return NextResponse.json({ error: 'Can only mark completion for in-progress changes' }, { status: 400 })
    }

    // Record the completion response
    const { data: response, error: responseError } = await supabase
      .from('change_completion_responses')
      .insert({
        organization_id: user.organizationId,
        change_id: changeId,
        responded_by: user.id,
        outcome,
        notes: notes || null
      })
      .select()
      .single()

    if (responseError) {
      return NextResponse.json({ error: 'Failed to record completion response' }, { status: 500 })
    }

    // Update change status based on outcome
    const newStatus = outcome === 'completed' ? 'completed' : 'failed'
    const updateData: any = { status: newStatus }
    
    if (outcome === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from('changes')
      .update(updateData)
      .eq('id', changeId)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update change status' }, { status: 500 })
    }

    // Mark completion prompt automation as executed
    await supabase
      .from('change_automations')
      .update({ 
        executed: true, 
        executed_at: new Date().toISOString() 
      })
      .eq('change_id', changeId)
      .eq('automation_type', 'completion_prompt')
      .eq('executed', false)

    // Add comment about completion response
    const completionIcon = outcome === 'completed' ? '✅' : '❌'
    const completionStatus = outcome === 'completed' ? 'COMPLETED' : 'FAILED'
    const commentContent = notes 
      ? `${completionIcon} **${completionStatus}** | ${notes}`
      : `${completionIcon} **${completionStatus}** | Change marked as ${outcome}`

    await supabase
      .from('comments')
      .insert({
        organization_id: user.organizationId,
        content: commentContent,
        author_id: user.id,
        change_id: changeId
      })

    // Notify the requester and other stakeholders
    const notificationTitle = outcome === 'completed' ? 'Change Completed Successfully' : 'Change Failed'
    const notificationMessage = `Change "${change.title}" has been marked as ${outcome} by ${user.fullName || user.email}${notes ? `. Notes: ${notes}` : ''}`

    // Get people to notify (requester, managers)
    const { data: stakeholders } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('organization_id', user.organizationId)
      .or(`id.eq.${change.requested_by},role.in.(owner,admin,manager)`)

    if (stakeholders && stakeholders.length > 0) {
      const notifications = stakeholders
        .filter(person => person.id !== user.id) // Don't notify self
        .map(person => ({
          organization_id: user.organizationId,
          user_id: person.id,
          type: outcome === 'completed' ? 'change_completed' : 'change_failed',
          title: notificationTitle,
          message: notificationMessage,
          data: { changeId, outcome, respondedBy: user.id, notes },
          change_id: changeId
        }))

      if (notifications.length > 0) {
        await supabase
          .from('notifications')
          .insert(notifications)
      }
    }

    return NextResponse.json({ 
      message: `Change marked as ${outcome} successfully`,
      response,
      newStatus
    })

  } catch (error) {
    console.error('Error handling completion response:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get completion response for a change
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: changeId } = await params
    const supabase = await createSupabaseServerClient()

    const { data: response, error } = await supabase
      .from('change_completion_responses')
      .select(`
        *,
        responder:profiles!responded_by(full_name, email)
      `)
      .eq('change_id', changeId)
      .order('responded_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      return NextResponse.json({ error: 'Failed to fetch completion response' }, { status: 500 })
    }

    return NextResponse.json({ response: response || null })

  } catch (error) {
    console.error('Error fetching completion response:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}