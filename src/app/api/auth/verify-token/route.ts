import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { access_token, token_type } = body

    console.log('Token verification request:', {
      hasToken: !!access_token,
      tokenType: token_type,
      tokenPreview: access_token ? `${access_token.substring(0, 20)}...` : 'none'
    })

    if (!access_token) {
      return NextResponse.json({ 
        error: 'Access token is required' 
      }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()

    console.log('Setting session with provided token...')
    
    // Set the session using the access token from the hash
    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token: access_token // For password recovery, access_token can serve as refresh_token
    })

    if (error) {
      console.error('❌ Token verification failed:', error)
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        code: error.code
      })
      
      return NextResponse.json({ 
        error: 'Invalid or expired reset token. Please request a new password reset.' 
      }, { status: 400 })
    }

    if (!data.session || !data.user) {
      console.error('❌ No session or user returned')
      return NextResponse.json({ 
        error: 'Token verification failed' 
      }, { status: 400 })
    }

    console.log('✅ Token verified successfully, user:', data.user.id)
    
    return NextResponse.json({ 
      message: 'Token verification successful',
      user: {
        id: data.user.id,
        email: data.user.email
      }
    })

  } catch (error) {
    console.error('Verify token API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}