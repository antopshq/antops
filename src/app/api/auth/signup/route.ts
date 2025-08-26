import { NextRequest, NextResponse } from 'next/server'
import { signUp } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, organizationName, jobRole, role } = await request.json()

    if (!name || !email || !password || !organizationName) {
      return NextResponse.json(
        { error: 'Name, email, password, and organization name are required' },
        { status: 400 }
      )
    }

    // Validate role if provided
    const validRoles = ['owner', 'admin', 'manager', 'member', 'viewer']
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role specified' },
        { status: 400 }
      )
    }

    const result = await signUp(email, password, name, organizationName, role || 'owner', jobRole)

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to create user account. Email may already be registered.' },
        { status: 409 }
      )
    }

    if (result.needsConfirmation) {
      return NextResponse.json({ 
        message: 'Account created successfully! Please check your email and click the confirmation link to complete your registration.',
        needsConfirmation: true 
      })
    }

    return NextResponse.json({ user: result.user })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}