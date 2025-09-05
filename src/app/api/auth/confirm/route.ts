import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/auth/reset-password'

  console.log('Auth confirm request:', { 
    type, 
    hasToken: !!token_hash,
    tokenPreview: token_hash ? `${token_hash.substring(0, 10)}...` : 'none',
    fullUrl: request.url 
  })

  if (token_hash && type) {
    const supabase = await createSupabaseServerClient()

    console.log('Attempting to verify OTP...')
    const { data, error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash,
    })

    if (!error) {
      console.log('✅ Token verified successfully, user:', data.user?.id)
      console.log('Redirecting to:', next)
      return NextResponse.redirect(new URL(next, request.url))
    } else {
      console.error('❌ Token verification failed:', error)
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        code: error.code
      })
    }
  } else {
    console.log('❌ Missing token_hash or type parameters')
  }

  // Redirect to error page if verification fails
  console.log('Redirecting to auth error page')
  return NextResponse.redirect(new URL('/auth/auth-error', request.url))
}