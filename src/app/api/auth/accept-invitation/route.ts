import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, fullName, password } = body

    if (!token || !fullName || !password) {
      return NextResponse.json(
        { error: 'Token, full name, and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const supabase = await createSupabaseServerClient()

    // Get invitation by token
    const { data: invitation, error: inviteError } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('invite_token', token)
      .eq('status', 'pending')
      .single()

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 400 }
      )
    }

    // Check if invitation has expired
    const now = new Date()
    const expiresAt = new Date(invitation.expires_at)
    
    if (now > expiresAt) {
      // Mark as expired
      await supabase
        .from('team_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id)

      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', invitation.email)
      .single()
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    // Create the user account using regular signup
    const { data: newUser, error: signUpError } = await supabase.auth.signUp({
      email: invitation.email,
      password: password,
      options: {
        data: {
          full_name: fullName,
          invited: true,
          organization_id: invitation.organization_id
        }
      }
    })

    if (signUpError || !newUser.user) {
      console.error('Error creating user:', signUpError)
      
      // Handle specific error cases
      if (signUpError?.message?.includes('already registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please sign in instead.' },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: `Failed to create account: ${signUpError?.message || 'Unknown error'}` },
        { status: 500 }
      )
    }

    // Note: Profile will be created automatically by database trigger or RPC
    // if you have set up the auth.users trigger, otherwise create manually:
    
    // Create user profile (only if not created by trigger)
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', newUser.user.id)
      .single()

    if (!existingProfile) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: newUser.user.id,
          email: invitation.email,
          full_name: fullName
        })

      if (profileError) {
        console.error('Error creating profile:', profileError)
        return NextResponse.json(
          { error: 'Account created but profile setup failed. Please contact support.' },
          { status: 500 }
        )
      }
    }

    // Create organization membership
    const { error: membershipError } = await supabase
      .from('organization_memberships')
      .insert({
        user_id: newUser.user.id,
        organization_id: invitation.organization_id,
        role: invitation.role.toLowerCase(), // Convert to match your user_role_type enum
        invited_by: invitation.invited_by,
        joined_at: new Date().toISOString()
      })

    if (membershipError) {
      console.error('Error creating organization membership:', membershipError)
      return NextResponse.json(
        { error: 'Account created but organization membership failed. Please contact support.' },
        { status: 500 }
      )
    }

    // Mark invitation as accepted
    await supabase
      .from('team_invitations')
      .update({ 
        status: 'accepted',
        updated_at: new Date().toISOString()
      })
      .eq('id', invitation.id)

    // Check if email confirmation is required
    const needsEmailConfirmation = !newUser.user.email_confirmed_at && newUser.user.confirmation_sent_at

    return NextResponse.json({
      message: needsEmailConfirmation 
        ? 'Account created! Please check your email to verify your account before signing in.'
        : 'Account created successfully! You can now sign in.',
      needsEmailConfirmation,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        fullName: fullName
      }
    })

  } catch (error) {
    console.error('Error accepting invitation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}