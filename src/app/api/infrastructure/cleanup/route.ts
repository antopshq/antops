import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { cleanupAllOrphanedInfrastructureReferences } from '@/lib/infrastructure-cleanup'

// POST /api/infrastructure/cleanup - Manually trigger cleanup of orphaned infrastructure references
export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`Manual infrastructure cleanup triggered by user ${user.id}`)
    
    // Run comprehensive cleanup for the user's organization
    const cleanupResult = await cleanupAllOrphanedInfrastructureReferences(user.organizationId)
    
    return NextResponse.json({
      success: true,
      message: 'Infrastructure cleanup completed successfully',
      result: cleanupResult
    })

  } catch (error) {
    console.error('Manual infrastructure cleanup error:', error)
    return NextResponse.json(
      { error: 'Failed to clean up infrastructure references' },
      { status: 500 }
    )
  }
}

// GET /api/infrastructure/cleanup - Get cleanup status/info
export async function GET(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({
      message: 'Infrastructure cleanup endpoint is available',
      description: 'Use POST to trigger cleanup of orphaned infrastructure component references from incidents, problems, and changes',
      organizationId: user.organizationId
    })

  } catch (error) {
    console.error('Infrastructure cleanup info error:', error)
    return NextResponse.json(
      { error: 'Failed to get cleanup info' },
      { status: 500 }
    )
  }
}