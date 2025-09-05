import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ 
      error: 'Development reset not available in production' 
    }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { email, newPassword } = body

    // Validate input
    if (!email || !newPassword) {
      return NextResponse.json({ 
        error: 'Email and new password are required' 
      }, { status: 400 })
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ 
        error: 'Password must be at least 8 characters long' 
      }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()

    // Check if user exists
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

    // Get the user by email using admin privileges
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    
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

    // Update password directly using admin privileges (bypasses email verification)
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id, 
      { password: newPassword }
    )

    if (updateError) {
      console.error('Password update error:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update password' 
      }, { status: 500 })
    }

    console.log(`🔧 DEV: Password reset for ${email} (bypassed email verification)`)

    return NextResponse.json({ 
      message: 'Password reset successfully (development mode)' 
    })

  } catch (error) {
    console.error('Dev reset password API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}