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

    console.log('Looking up user by reset code...')
    
    try {
      // Query the database directly to find which user this reset code belongs to
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
      
      if (!authUsers || !authUsers.users) {
        return NextResponse.json({ 
          error: 'Unable to verify reset token.' 
        }, { status: 500 })
      }

      // For security, we'll update ALL users' passwords if they have a valid reset session
      // But first, let's try a simpler approach - verify the code format and time
      const resetCodeRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      
      if (!resetCodeRegex.test(code)) {
        console.log('❌ Invalid code format')
        return NextResponse.json({ 
          error: 'Invalid reset token format.' 
        }, { status: 400 })
      }

      // Since we can't easily verify the specific user from the code without PKCE,
      // let's take a different approach: require the user's email in the request
      // and verify they have a recent password reset request
      
      console.log('❌ Cannot verify reset code without additional verification')
      return NextResponse.json({ 
        error: 'Password reset method needs to be updated. Please request a new password reset.' 
      }, { status: 400 })

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