import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, newPassword } = body

    console.log('Reset password request:', {
      email: email ? email : 'missing',
      passwordLength: newPassword?.length || 0
    })

    // Validate input
    if (!email || !newPassword) {
      console.log('❌ Missing email or password:', { hasEmail: !!email, hasPassword: !!newPassword })
      return NextResponse.json({ 
        error: 'Email and new password are required' 
      }, { status: 400 })
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ 
        error: 'Password must be at least 8 characters long' 
      }, { status: 400 })
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        error: 'Please enter a valid email address' 
      }, { status: 400 })
    }

    console.log('Looking up user by email...')
    
    try {
      // Check if user exists in profiles table
      const supabase = await createSupabaseServerClient()
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', email.toLowerCase())
        .limit(1)

      if (!profiles || profiles.length === 0) {
        return NextResponse.json({ 
          error: 'No account found with that email address' 
        }, { status: 404 })
      }

      console.log('User found in profiles, looking up in auth...')

      // Get the user from auth by email using admin client
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
      
      if (listError) {
        console.error('Error listing users:', listError)
        return NextResponse.json({ 
          error: 'Failed to find user account' 
        }, { status: 500 })
      }

      const user = users.find(u => u.email === email.toLowerCase())
      if (!user) {
        return NextResponse.json({ 
          error: 'No account found with that email address' 
        }, { status: 404 })
      }

      console.log('Updating password for user:', user.id)

      // Update password using admin privileges
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id, 
        { password: newPassword }
      )

      if (updateError) {
        console.error('Password update error:', updateError)
        return NextResponse.json({ 
          error: 'Failed to update password' 
        }, { status: 500 })
      }

      console.log('✅ Password reset successfully')
      return NextResponse.json({ 
        message: 'Password reset successfully. You can now sign in with your new password.' 
      })

    } catch (err) {
      console.error('Reset password error:', err)
      return NextResponse.json({ 
        error: 'Internal server error' 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Reset password API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}