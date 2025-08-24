import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()

    // Get invitation by token
    const { data: invitation, error } = await supabase
      .from('team_invitations')
      .select(`
        id,
        email,
        role,
        expires_at,
        invited_by,
        profiles!invited_by(full_name, email)
      `)
      .eq('invite_token', token)
      .eq('status', 'pending')
      .single()

    if (error || !invitation) {
      return NextResponse.json(
        { error: 'Invitation not found or has already been used' },
        { status: 404 }
      )
    }

    // Check if invitation has expired
    const now = new Date()
    const expiresAt = new Date(invitation.expires_at)
    const expired = now > expiresAt

    const inviter = Array.isArray(invitation.profiles) ? invitation.profiles[0] : invitation.profiles

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        inviterName: inviter?.full_name || inviter?.email || 'Someone',
        organizationName: 'ANTOPS', // TODO: Get actual org name
        expiresAt: invitation.expires_at,
        expired
      }
    })
  } catch (error) {
    console.error('Error fetching invitation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}