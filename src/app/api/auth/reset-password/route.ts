import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, newPassword } = body

    // Validate input
    if (!token || !newPassword) {
      return NextResponse.json({ 
        error: 'Reset token and new password are required' 
      }, { status: 400 })
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ 
        error: 'Password must be at least 8 characters long' 
      }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()

    // Verify the reset token and update password
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      console.error('Password reset error:', error)
      
      // Handle specific error types
      if (error.message.includes('token')) {
        return NextResponse.json({ 
          error: 'Invalid or expired reset token. Please request a new password reset.' 
        }, { status: 400 })
      }
      
      return NextResponse.json({ 
        error: 'Failed to reset password. Please try again.' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Password reset successfully. You can now sign in with your new password.' 
    })

  } catch (error) {
    console.error('Reset password API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}