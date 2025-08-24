import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase'
import { adaptedNotificationService as notificationService } from '@/lib/notifications/service-adapted'

export async function GET() {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createSupabaseServerClient()
    const { data: invitations, error } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('organization_id', user.organizationId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching invitations:', error)
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 })
    }

    return NextResponse.json({ invitations: invitations || [] })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { email, role } = body

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      )
    }

    const supabase = await createSupabaseServerClient()

    // Check if invitation already exists
    const { data: existingInvitation } = await supabase
      .from('team_invitations')
      .select('id')
      .eq('organization_id', user.organizationId)
      .eq('email', email)
      .eq('status', 'pending')
      .single()

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'Invitation already sent to this email' },
        { status: 409 }
      )
    }

    // Create invitation token
    const inviteToken = crypto.randomUUID()

    // Create new invitation
    const { data: invitation, error } = await supabase
      .from('team_invitations')
      .insert({
        organization_id: user.organizationId,
        email,
        role,
        invited_by: user.id,
        invite_token: inviteToken,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating invitation:', error)
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
    }

    // Send invitation email
    try {
      const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invite?token=${inviteToken}`
      
      await notificationService.createNotification({
        organizationId: user.organizationId,
        type: 'team_invitation',
        entityId: invitation.id,
        entityType: 'invitation',
        recipients: [{ id: crypto.randomUUID(), type: 'user', value: email }],
        data: {
          inviterName: user.fullName || user.email,
          organizationName: 'ANTOPS', // TODO: Get actual org name
          role,
          inviteUrl,
          expiresAt: invitation.expires_at
        }
      })

      console.log(`✅ Invitation sent to ${email}`)
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError)
      // Don't fail the invitation creation if email fails
    }
    
    return NextResponse.json({ invitation }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/team/invite:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const invitationId = searchParams.get('id')

    if (!invitationId) {
      return NextResponse.json(
        { error: 'Invitation ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createSupabaseServerClient()
    const { error } = await supabase
      .from('team_invitations')
      .delete()
      .eq('id', invitationId)
      .eq('organization_id', user.organizationId)

    if (error) {
      console.error('Error deleting invitation:', error)
      return NextResponse.json({ error: 'Failed to delete invitation' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}