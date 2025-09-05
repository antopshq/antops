import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/auth/reset-password'

  console.log('Auth confirm request:', { 
    type, 
    hasTokenHash: !!token_hash,
    hasCode: !!code,
    tokenPreview: token_hash ? `${token_hash.substring(0, 10)}...` : 'none',
    codePreview: code ? `${code.substring(0, 10)}...` : 'none',
    fullUrl: request.url 
  })

  const supabase = await createSupabaseServerClient()

  // Handle token_hash format (older/different email templates)
  if (token_hash && type) {
    console.log('Attempting to verify OTP with token_hash...')
    const { data, error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash,
    })

    if (!error) {
      console.log('✅ Token verified successfully with OTP, user:', data.user?.id)
      console.log('Redirecting to:', next)
      return NextResponse.redirect(new URL(next, request.url))
    } else {
      console.error('❌ Token verification failed:', error)
    }
  }

  // Handle code format (PKCE flow)
  if (code) {
    console.log('Attempting to exchange code for session...')
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.session) {
      console.log('✅ Code exchanged successfully, user:', data.user?.id)
      console.log('Redirecting to:', next)
      return NextResponse.redirect(new URL(next, request.url))
    } else {
      console.error('❌ Code exchange failed:', error)
      console.error('Error details:', {
        message: error?.message,
        status: error?.status,
        code: error?.code
      })
    }
  }

  console.log('❌ No valid authentication method found')
  console.log('Redirecting to auth error page')
  return NextResponse.redirect(new URL('/auth/auth-error', request.url))
}