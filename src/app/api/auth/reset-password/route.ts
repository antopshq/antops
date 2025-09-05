import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, newPassword } = body

    console.log('Reset password request:', {
      token: token ? `${token.substring(0, 10)}...` : 'missing',
      passwordLength: newPassword?.length || 0
    })

    // Validate input
    if (!token || !newPassword) {
      console.log('❌ Missing token or password:', { hasToken: !!token, hasPassword: !!newPassword })
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

    // For password reset codes, we use getUser with the authorization code
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser(token)
      
      if (userError || !user) {
        console.error('User verification error:', userError)
        return NextResponse.json({ 
          error: 'Invalid or expired reset token. Please request a new password reset.' 
        }, { status: 400 })
      }

      console.log('User verified successfully, updating password for user:', user.id)

      // Use admin client to update user password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
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
        error: 'Invalid or expired reset token. Please request a new password reset.' 
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