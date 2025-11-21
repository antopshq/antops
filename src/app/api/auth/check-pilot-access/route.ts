import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()
    
    // Get the pilot access token from environment variable
    const pilotToken = process.env.PILOT_ACCESS_TOKEN
    
    console.log('Pilot access check - Token exists:', !!pilotToken, 'Provided token:', token)
    
    if (!pilotToken) {
      // No pilot token set - deny access in production, allow in development
      const isDevelopment = process.env.NODE_ENV === 'development'
      console.log('No pilot token found, development mode:', isDevelopment)
      return NextResponse.json({ hasAccess: isDevelopment })
    }
    
    // Check if the provided token matches the pilot token
    const hasAccess = token === pilotToken
    console.log('Token match result:', hasAccess)
    
    return NextResponse.json({ hasAccess })
    
  } catch (error) {
    console.error('Error checking pilot access:', error)
    return NextResponse.json(
      { hasAccess: false },
      { status: 500 }
    )
  }
}