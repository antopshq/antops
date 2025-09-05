import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code } = body

    console.log('Exchange code request:', {
      hasCode: !!code,
      codePreview: code ? `${code.substring(0, 10)}...` : 'none'
    })

    if (!code) {
      return NextResponse.json({ 
        error: 'Authorization code is required' 
      }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()

    console.log('Attempting to exchange code for session...')
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('❌ Code exchange failed:', error)
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        code: error.code
      })
      
      return NextResponse.json({ 
        error: 'Invalid or expired reset link. Please request a new password reset.' 
      }, { status: 400 })
    }

    if (!data.session || !data.user) {
      console.error('❌ No session or user returned')
      return NextResponse.json({ 
        error: 'Authentication failed' 
      }, { status: 400 })
    }

    console.log('✅ Code exchanged successfully, user:', data.user.id)
    
    return NextResponse.json({ 
      message: 'Authentication successful',
      user: {
        id: data.user.id,
        email: data.user.email
      }
    })

  } catch (error) {
    console.error('Exchange code API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}