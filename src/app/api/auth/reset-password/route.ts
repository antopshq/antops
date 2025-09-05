import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, newPassword } = body

    console.log('Reset password request:', {
      code: code ? `${code.substring(0, 10)}...` : 'missing',
      passwordLength: newPassword?.length || 0
    })

    // Validate input
    if (!code || !newPassword) {
      console.log('❌ Missing code or password:', { hasCode: !!code, hasPassword: !!newPassword })
      return NextResponse.json({ 
        error: 'Reset code and new password are required' 
      }, { status: 400 })
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ 
        error: 'Password must be at least 8 characters long' 
      }, { status: 400 })
    }

    // Use admin client to exchange code and update password
    console.log('Using admin client to handle reset...')
    
    try {
      // Exchange the code for session using admin client
      const { data, error } = await supabaseAdmin.auth.exchangeCodeForSession(code)
      
      if (error || !data.user) {
        console.error('Code exchange error:', error)
        return NextResponse.json({ 
          error: 'Invalid or expired reset link. Please request a new password reset.' 
        }, { status: 400 })
      }

      console.log('Code exchanged successfully, updating password for user:', data.user.id)

      // Update password using admin privileges
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        data.user.id,
        { password: newPassword }
      )

      if (updateError) {
        console.error('Password update error:', updateError)
        return NextResponse.json({ 
          error: 'Failed to update password. Please try again.' 
        }, { status: 500 })
      }

      console.log('✅ Password reset successfully')
      return NextResponse.json({ 
        message: 'Password reset successfully. You can now sign in with your new password.' 
      })

    } catch (err) {
      console.error('Reset password error:', err)
      return NextResponse.json({ 
        error: 'Invalid or expired reset link. Please request a new password reset.' 
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Reset password API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}