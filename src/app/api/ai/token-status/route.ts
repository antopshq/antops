import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-enhanced'
import { getUserAITokenStatus, formatTimeUntilReset } from '@/lib/ai-rate-limiting'

export async function GET(request: NextRequest) {
  try {
    // Enhanced authentication
    const authContext = await getAuthenticatedUser(request)
    if (!authContext.isAuthenticated || !authContext.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const user = authContext.user
    
    // Get user's AI token status
    const tokenStatus = await getUserAITokenStatus(user.id)
    
    if (!tokenStatus) {
      return NextResponse.json({ error: 'Failed to get token status' }, { status: 500 })
    }
    
    // Format the response
    const response = {
      tokensUsed: tokenStatus.tokensUsed,
      tokensRemaining: tokenStatus.tokensRemaining,
      tokensLimit: tokenStatus.tokensLimit,
      canScan: tokenStatus.canScan,
      resetTime: tokenStatus.resetTime.toISOString(),
      resetTimeFormatted: formatTimeUntilReset(tokenStatus.resetTime)
    }
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('AI token status API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}