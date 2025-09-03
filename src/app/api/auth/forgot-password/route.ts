import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    console.log('Forgot password request for:', email)
    console.log('Environment check:', {
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
      nodeEnv: process.env.NODE_ENV
    })

    // Validate input
    if (!email) {
      console.log('❌ Missing email in request')
      return NextResponse.json({ 
        error: 'Email address is required' 
      }, { status: 400 })
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      console.log('❌ Invalid email format:', email)
      return NextResponse.json({ 
        error: 'Please enter a valid email address' 
      }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()

    // Check if user exists first (optional - for better UX)
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', email.toLowerCase())
      .limit(1)

    if (profileError) {
      console.error('❌ Database error checking profiles:', profileError)
      // Continue anyway - don't block password reset due to DB issues
    }

    console.log('Profile check result:', { profilesFound: profiles?.length || 0 })

    if (!profiles || profiles.length === 0) {
      console.log('⚠️ No profile found for email, but returning success for security')
      // For security, we don't reveal if email exists or not
      // But we return success message anyway
      return NextResponse.json({ 
        message: 'If an account with that email exists, we\'ve sent password reset instructions.' 
      })
    }

    // Send password reset email
    const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/reset-password`
    console.log('Sending reset email with redirect:', redirectUrl)
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl
    })

    if (error) {
      console.error('❌ Password reset email error:', error)
      return NextResponse.json({ 
        error: 'Failed to send password reset email. Please try again.' 
      }, { status: 500 })
    }

    console.log('✅ Password reset email sent successfully')
    return NextResponse.json({ 
      message: 'If an account with that email exists, we\'ve sent password reset instructions.' 
    })

  } catch (error) {
    console.error('Forgot password API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}