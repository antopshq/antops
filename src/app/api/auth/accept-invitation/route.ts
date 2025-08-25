import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, fullName, jobTitle, password } = body

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

    // Create the user account using regular signup with email confirmation disabled for invitations
    // Don't pass organization_id in metadata to prevent trigger from creating unwanted org
    const { data: newUser, error: signUpError } = await supabase.auth.signUp({
      email: invitation.email,
      password: password,
      options: {
        data: {
          full_name: fullName,
          job_title: jobTitle || null,
          invited: true
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/signin`
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
    
    // Create a service client to bypass RLS for profile and membership creation
    const { createClient } = await import('@supabase/supabase-js')
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check for existing profile with service client (bypasses RLS)
    const { data: existingProfile } = await serviceSupabase
      .from('profiles')
      .select('id')
      .eq('id', newUser.user.id)
      .single()

    if (!existingProfile) {
      // Profile doesn't exist, create it
      const { error: profileError } = await serviceSupabase
        .from('profiles')
        .insert({
          id: newUser.user.id,
          email: invitation.email,
          full_name: fullName,
          job_title: jobTitle || null,
          organization_id: invitation.organization_id,
          role: invitation.role.toLowerCase() as any
        })

      if (profileError) {
        console.error('Error creating profile:', profileError)
        return NextResponse.json(
          { error: 'Account created but profile setup failed. Please contact support.' },
          { status: 500 }
        )
      }
    } else {
      // Profile exists (created by trigger), update it with correct data
      const { error: updateError } = await serviceSupabase
        .from('profiles')
        .update({
          full_name: fullName,
          job_title: jobTitle || null,
          organization_id: invitation.organization_id,
          role: invitation.role.toLowerCase() as any
        })
        .eq('id', newUser.user.id)

      if (updateError) {
        console.error('Error updating profile:', updateError)
        return NextResponse.json(
          { error: 'Account created but profile setup failed. Please contact support.' },
          { status: 500 }
        )
      }
    }

    const { error: membershipError } = await serviceSupabase
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

    // Clean up any unwanted organizations that might have been auto-created
    try {
      // Check if an organization was created with email domain name (like "gmail.com")
      const emailDomain = invitation.email.split('@')[1]
      const { data: unwantedOrg } = await serviceSupabase
        .from('organizations')
        .select('id')
        .eq('name', emailDomain)
        .single()
      
      if (unwantedOrg && unwantedOrg.id !== invitation.organization_id) {
        // Delete the unwanted organization if it's not the target org and has no other members
        const { data: members } = await serviceSupabase
          .from('organization_memberships')
          .select('id')
          .eq('organization_id', unwantedOrg.id)
          .limit(2)
        
        if (!members || members.length <= 1) {
          await serviceSupabase
            .from('organizations')
            .delete()
            .eq('id', unwantedOrg.id)
          console.log(`Cleaned up unwanted organization: ${emailDomain}`)
        }
      }
    } catch (cleanupError) {
      console.warn('Could not clean up unwanted organization:', cleanupError)
    }

    // Mark invitation as accepted
    await supabase
      .from('team_invitations')
      .update({ 
        status: 'accepted',
        updated_at: new Date().toISOString()
      })
      .eq('id', invitation.id)

    // Since user was invited, mark them as email confirmed using service client
    if (!newUser.user.email_confirmed_at) {
      try {
        await serviceSupabase.auth.admin.updateUserById(newUser.user.id, {
          email_confirm: true
        })
      } catch (confirmError) {
        console.warn('Could not auto-confirm user email:', confirmError)
      }
    }

    // Sign out the new user to prevent auto-login (they should manually sign in)
    await supabase.auth.signOut()

    // For invited users, email confirmation is not required since they were invited
    const needsEmailConfirmation = false

    return NextResponse.json({
      message: needsEmailConfirmation 
        ? 'Account created! Please check your email to verify your account before signing in.'
        : 'Account created successfully! You can now sign in.',
      needsEmailConfirmation,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        fullName: fullName
      },
      requiresSignIn: true
    })

  } catch (error) {
    console.error('Error accepting invitation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}