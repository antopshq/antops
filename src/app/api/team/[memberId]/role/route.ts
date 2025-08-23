import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { updateMemberRole } from '@/lib/organization-store'
import { hasPermission, canManageUser, canChangeRoleTo, PERMISSIONS } from '@/lib/rbac'
import { UserRole } from '@/lib/types'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function PUT(
  request: Request,
  { params }: { params: { memberId: string } }
) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to manage users
    if (!hasPermission(user.role, PERMISSIONS.MANAGE_USERS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { role } = body

    if (!role || !['viewer', 'member', 'manager', 'admin', 'owner'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const memberId = params.memberId

    // Get the target member's current role
    const supabase = await createSupabaseServerClient()
    const { data: targetMember, error: fetchError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', memberId)
      .single()

    if (fetchError || !targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Check if current user can manage the target member
    if (!canManageUser(user.role, targetMember.role as UserRole)) {
      return NextResponse.json({ 
        error: 'Cannot manage users with equal or higher privileges' 
      }, { status: 403 })
    }

    // Check if current user can assign the new role
    if (!canChangeRoleTo(user.role, role as UserRole)) {
      return NextResponse.json({ 
        error: 'Cannot assign roles equal to or higher than your own' 
      }, { status: 403 })
    }

    // Prevent users from changing their own role
    if (memberId === user.id) {
      return NextResponse.json({ 
        error: 'Cannot change your own role' 
      }, { status: 400 })
    }

    // Update the member's role
    const success = await updateMemberRole(memberId, role as UserRole)
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Role updated successfully',
      memberId,
      newRole: role 
    })
  } catch (error) {
    console.error('Update role API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}