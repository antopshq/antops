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

  // Handle code format - for password reset, we need to pass the code to the client
  // The server can't handle PKCE flow without the code verifier
  if (code) {
    console.log('Found authorization code, redirecting to client-side handler')
    // Redirect to the reset password page with the code
    // The client-side will handle the PKCE exchange
    const redirectUrl = new URL(next, request.url)
    redirectUrl.searchParams.set('code', code)
    console.log('Redirecting to client handler:', redirectUrl.toString())
    return NextResponse.redirect(redirectUrl)
  }

  console.log('❌ No valid authentication method found')
  console.log('Redirecting to auth error page')
  return NextResponse.redirect(new URL('/auth/auth-error', request.url))
}