import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase'

// Request approval for a change (move from draft to pending)
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

    // Check if user can request approval (must be the requester or assigned)
    if (change.requested_by !== user.id && change.assigned_to !== user.id) {
      return NextResponse.json({ error: 'Unauthorized to request approval for this change' }, { status: 403 })
    }

    // Check if change is in draft status
    if (change.status !== 'draft') {
      return NextResponse.json({ error: 'Can only request approval for draft changes' }, { status: 400 })
    }

    // Update change status to pending
    const { error: updateError } = await supabase
      .from('changes')
      .update({ status: 'pending' })
      .eq('id', changeId)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update change status' }, { status: 500 })
    }

    // Create approval request
    const { data: approval, error: approvalError } = await supabase
      .from('change_approvals')
      .insert({
        organization_id: user.organizationId,
        change_id: changeId,
        requested_by: user.id,
        status: 'pending'
      })
      .select()
      .single()

    if (approvalError) {
      return NextResponse.json({ error: 'Failed to create approval request' }, { status: 500 })
    }

    // Get all managers in the organization to notify
    const { data: managers } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('organization_id', user.organizationId)
      .in('role', ['owner', 'admin', 'manager'])

    // Create notifications for managers
    if (managers && managers.length > 0) {
      const notifications = managers.map(manager => ({
        organization_id: user.organizationId,
        user_id: manager.id,
        type: 'change_approval_request',
        title: 'Change Approval Required',
        message: `${user.fullName || user.email} has requested approval for change: ${change.title}`,
        data: { changeId, changTitle: change.title },
        change_id: changeId
      }))

      await supabase
        .from('notifications')
        .insert(notifications)
    }

    // Add comment about approval request
    await supabase
      .from('comments')
      .insert({
        organization_id: user.organizationId,
        content: '📋 **APPROVAL REQUESTED** | Submitted for manager review',
        author_id: user.id,
        change_id: changeId
      })

    return NextResponse.json({ 
      message: 'Approval requested successfully',
      approval,
      managersNotified: managers?.length || 0
    })

  } catch (error) {
    console.error('Error requesting approval:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Approve or reject a change
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
    const { action, comments } = body // action: 'approve' | 'reject'

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be "approve" or "reject"' }, { status: 400 })
    }

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

    // Check if change is in pending or in_progress status (automation might have started it)
    if (!['pending', 'in_progress'].includes(change.status)) {
      return NextResponse.json({ error: 'Can only approve/reject pending or in-progress changes' }, { status: 400 })
    }

    // Check if approval record exists first
    const { data: existingApproval, error: approvalFetchError } = await supabase
      .from('change_approvals')
      .select('*')
      .eq('change_id', changeId)
      .single()

    console.log('🔍 APPROVAL DEBUG:')
    console.log('Change ID:', changeId, 'Action:', action)
    console.log('Change status:', change.status)
    console.log('Existing approval record:', existingApproval)
    console.log('Approval fetch error:', approvalFetchError)

    // Update approval record
    const newApprovalStatus = action === 'approve' ? 'approved' : 'rejected'
    let approvalError
    
    if (existingApproval) {
      // Update existing approval record
      const { error } = await supabase
        .from('change_approvals')
        .update({
          status: newApprovalStatus,
          approved_by: user.id,
          comments: comments || null,
          responded_at: new Date().toISOString()
        })
        .eq('change_id', changeId)
      approvalError = error
    } else {
      // Create new approval record if none exists
      const { error } = await supabase
        .from('change_approvals')
        .insert({
          organization_id: user.organizationId,
          change_id: changeId,
          requested_by: change.requested_by,
          status: newApprovalStatus,
          approved_by: user.id,
          comments: comments || null,
          responded_at: new Date().toISOString()
        })
      approvalError = error
    }

    if (approvalError) {
      console.error('❌ Failed to update/create approval record:', approvalError)
      return NextResponse.json({ error: 'Failed to update approval' }, { status: 500 })
    }

    console.log('✅ Approval record updated successfully')

    // Update change status
    let changeStatus = change.status
    if (action === 'approve') {
      // Always move to approved when manager approves
      changeStatus = 'approved'
    } else {
      // Reject: always move to cancelled
      changeStatus = 'cancelled'
    }
    
    console.log('📝 Updating change status from', change.status, 'to', changeStatus)
    
    const { error: updateError } = await supabase
      .from('changes')
      .update({ status: changeStatus })
      .eq('id', changeId)

    if (updateError) {
      console.error('❌ Failed to update change status:', updateError)
      return NextResponse.json({ error: 'Failed to update change status' }, { status: 500 })
    }
    
    console.log('✅ Change status updated successfully to', changeStatus)

    // If approved and has scheduled time, create automation for auto-start
    if (action === 'approve' && change.scheduled_for) {
      console.log('🔧 Creating auto-start automation for change:', changeId, 'scheduled for:', change.scheduled_for)
      
      const { data: automation, error: autoStartError } = await supabase
        .from('change_automations')
        .insert({
          organization_id: user.organizationId,
          change_id: changeId,
          automation_type: 'auto_start',
          scheduled_for: change.scheduled_for
        })
        .select()
      
      if (autoStartError) {
        console.error('❌ Error creating auto-start automation:', autoStartError)
      } else {
        console.log('✅ Created auto-start automation:', automation)
      }
    } else if (action === 'approve') {
      console.log('⚠️ Change approved but no scheduled_for time set:', { changeId, scheduled_for: change.scheduled_for })
    }

    // If approved and has estimated end time, create automation for completion prompt
    if (action === 'approve' && change.estimated_end_time) {
      const { error: completionError } = await supabase
        .from('change_automations')
        .insert({
          organization_id: user.organizationId,
          change_id: changeId,
          automation_type: 'completion_prompt',
          scheduled_for: change.estimated_end_time
        })
      
      if (completionError) {
        console.error('Error creating completion automation:', completionError)
      }
    }

    // Add comment about approval decision
    const approvalIcon = action === 'approve' ? '✅' : '❌'
    const approvalStatus = action === 'approve' ? 'APPROVED' : 'REJECTED'
    const alreadyInProgress = change.status === 'in_progress' && action === 'approve'
    const defaultMessage = action === 'approve' 
      ? (alreadyInProgress ? 'Approved by manager (change already in progress)' : 'Approved via kanban board')
      : 'Rejected via kanban board'
    
    const commentContent = comments 
      ? `${approvalIcon} **${approvalStatus}** | ${comments}`
      : `${approvalIcon} **${approvalStatus}** | ${defaultMessage}`

    await supabase
      .from('comments')
      .insert({
        organization_id: user.organizationId,
        content: commentContent,
        author_id: user.id,
        change_id: changeId
      })

    // Notify the requester
    const notificationType = action === 'approve' ? 'change_approved' : 'change_rejected'
    const notificationTitle = action === 'approve' ? 'Change Approved' : 'Change Rejected'
    const notificationMessage = `Your change "${change.title}" has been ${action}d by ${user.fullName || user.email}${comments ? `. Comments: ${comments}` : ''}`

    await supabase
      .from('notifications')
      .insert({
        organization_id: user.organizationId,
        user_id: change.requested_by,
        type: notificationType,
        title: notificationTitle,
        message: notificationMessage,
        data: { changeId, action, approvedBy: user.id, comments },
        change_id: changeId
      })

    return NextResponse.json({ 
      message: `Change ${action}d successfully`,
      action,
      changeStatus
    })

  } catch (error) {
    console.error('Error processing approval:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}