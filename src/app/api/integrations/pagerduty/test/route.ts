import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-enhanced'

// Test PagerDuty API connection
export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(request)
    if (!authContext.isAuthenticated || !authContext.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { apiKey } = body

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required for testing' }, { status: 400 })
    }

    // Test the PagerDuty API by making a request to get user info
    const testResponse = await fetch('https://api.pagerduty.com/users?limit=1', {
      method: 'GET',
      headers: {
        'Authorization': `Token token=${apiKey}`,
        'Accept': 'application/vnd.pagerduty+json;version=2',
        'Content-Type': 'application/json'
      }
    })

    if (testResponse.ok) {
      const data = await testResponse.json()
      return NextResponse.json({ 
        success: true, 
        message: 'PagerDuty API connection successful',
        userCount: data.users ? data.users.length : 0
      })
    } else {
      const errorData = await testResponse.text()
      console.error('PagerDuty API test failed:', testResponse.status, errorData)
      
      if (testResponse.status === 401) {
        return NextResponse.json({ error: 'Invalid API key or insufficient permissions' }, { status: 400 })
      } else if (testResponse.status === 403) {
        return NextResponse.json({ error: 'API key does not have required permissions' }, { status: 400 })
      } else {
        return NextResponse.json({ error: 'Failed to connect to PagerDuty API' }, { status: 400 })
      }
    }
  } catch (error) {
    console.error('PagerDuty test connection error:', error)
    return NextResponse.json(
      { error: 'Failed to test PagerDuty connection' },
      { status: 500 }
    )
  }
}