import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase'

// Cancel a change (for managers, admins, owners)
export async function PUT(
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
    const { reason } = body // Optional cancellation reason

    const supabase = await createSupabaseServerClient()

    // Check if user has manager permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['owner', 'admin', 'manager'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions. Manager role required.' }, { status: 403 })
    }

    // Get the change
    const { data: change, error: changeError } = await supabase
      .from('changes')
      .select('*')
      .eq('id', changeId)
      .single()

    if (changeError || !change) {
      return NextResponse.json({ error: 'Change not found' }, { status: 404 })
    }

    // Check if change can be cancelled (only draft, pending, approved)
    const cancellableStatuses = ['draft', 'pending', 'approved']
    if (!cancellableStatuses.includes(change.status)) {
      return NextResponse.json({ 
        error: `Cannot cancel change in ${change.status} status. Can only cancel changes in draft, pending, or approved status.` 
      }, { status: 400 })
    }

    // Update change status to cancelled
    const { error: updateError } = await supabase
      .from('changes')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', changeId)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to cancel change' }, { status: 500 })
    }

    // Cancel any pending automations for this change
    await supabase
      .from('change_automations')
      .update({ 
        executed: true,
        executed_at: new Date().toISOString(),
        error_message: 'Change was manually cancelled'
      })
      .eq('change_id', changeId)
      .eq('executed', false)

    // Cancel any pending approval if in pending status
    if (change.status === 'pending') {
      await supabase
        .from('change_approvals')
        .update({
          status: 'rejected',
          approved_by: user.id,
          comments: reason ? `Cancelled by manager: ${reason}` : 'Cancelled by manager',
          responded_at: new Date().toISOString()
        })
        .eq('change_id', changeId)
        .eq('status', 'pending')
    }

    // Notify stakeholders about cancellation
    const notifications = []
    
    // Notify requester
    if (change.requested_by && change.requested_by !== user.id) {
      notifications.push({
        organization_id: user.organizationId,
        user_id: change.requested_by,
        type: 'change_cancelled',
        title: 'Change Cancelled',
        message: `Your change "${change.title}" has been cancelled by ${user.fullName || user.email}${reason ? `. Reason: ${reason}` : ''}`,
        data: { changeId, cancelledBy: user.id, reason },
        change_id: changeId
      })
    }

    // Notify assigned user if different from requester
    if (change.assigned_to && change.assigned_to !== change.requested_by && change.assigned_to !== user.id) {
      notifications.push({
        organization_id: user.organizationId,
        user_id: change.assigned_to,
        type: 'change_cancelled',
        title: 'Change Cancelled',
        message: `Change "${change.title}" has been cancelled by ${user.fullName || user.email}${reason ? `. Reason: ${reason}` : ''}`,
        data: { changeId, cancelledBy: user.id, reason },
        change_id: changeId
      })
    }

    if (notifications.length > 0) {
      await supabase
        .from('notifications')
        .insert(notifications)
    }

    return NextResponse.json({ 
      message: 'Change cancelled successfully',
      changeId,
      cancelledBy: user.id,
      reason
    })

  } catch (error) {
    console.error('Error cancelling change:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}