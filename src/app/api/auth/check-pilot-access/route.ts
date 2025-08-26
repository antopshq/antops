import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()
    
    // Get the pilot access token from environment variable
    const pilotToken = process.env.PILOT_ACCESS_TOKEN
    
    if (!pilotToken) {
      // If no pilot token is set in environment, allow access (development mode)
      return NextResponse.json({ hasAccess: true })
    }
    
    // Check if the provided token matches the pilot token
    const hasAccess = token === pilotToken
    
    return NextResponse.json({ hasAccess })
    
  } catch (error) {
    console.error('Error checking pilot access:', error)
    return NextResponse.json(
      { hasAccess: false },
      { status: 500 }
    )
  }
}