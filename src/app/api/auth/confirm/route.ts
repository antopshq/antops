import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/auth/reset-password'

  console.log('Auth confirm request:', { type, hasToken: !!token_hash })

  if (token_hash && type) {
    const supabase = await createSupabaseServerClient()

    const { error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash,
    })

    if (!error) {
      console.log('✅ Token verified, redirecting to:', next)
      return NextResponse.redirect(new URL(next, request.url))
    } else {
      console.error('❌ Token verification failed:', error)
    }
  }

  // Redirect to error page if verification fails
  return NextResponse.redirect(new URL('/auth/auth-error', request.url))
}