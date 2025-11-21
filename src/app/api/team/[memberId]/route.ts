import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-enhanced'
import { hasPermission, canManageUser, PERMISSIONS } from '@/lib/rbac'
import { UserRole } from '@/lib/types'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const authContext = await getAuthenticatedUser(request)
    if (!authContext.isAuthenticated || !authContext.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = authContext.user

    // Check if user has permission to remove users
    if (!hasPermission(user.role, PERMISSIONS.REMOVE_USERS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { memberId } = await params

    // Prevent users from removing themselves
    if (memberId === user.id) {
      return NextResponse.json({ 
        error: 'Cannot remove yourself from the organization' 
      }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()

    // Get the target member's current role
    const { data: targetMember, error: fetchError } = await supabase
      .from('profiles')
      .select('role, email')
      .eq('id', memberId)
      .single()

    if (fetchError || !targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Check if current user can manage the target member
    if (!canManageUser(user.role, targetMember.role as UserRole)) {
      return NextResponse.json({ 
        error: 'Cannot remove users with equal or higher privileges' 
      }, { status: 403 })
    }

    // Prevent removing the last owner
    if (targetMember.role === 'owner') {
      const { data: owners, error: countError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'owner')
        .eq('organization_id', user.organizationId)

      if (countError || (owners && owners.length <= 1)) {
        return NextResponse.json({ 
          error: 'Cannot remove the last owner of the organization' 
        }, { status: 400 })
      }
    }

    // Remove the member by deleting their profile
    // In a real implementation, you might want to:
    // 1. Reassign their incidents/problems/changes
    // 2. Keep audit logs
    // 3. Send notification emails
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', memberId)

    if (deleteError) {
      console.error('Error removing member:', deleteError)
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Member removed successfully',
      removedMember: {
        id: memberId,
        email: targetMember.email
      }
    })
  } catch (error) {
    console.error('Remove member API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}