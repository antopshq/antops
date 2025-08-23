import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getOrganizationStats } from '@/lib/organization-store'
import { hasPermission, PERMISSIONS } from '@/lib/rbac'

export async function GET() {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to view organization stats
    if (!hasPermission(user.role, PERMISSIONS.VIEW_ORGANIZATION_STATS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get organization statistics
    const stats = await getOrganizationStats()
    
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Organization stats API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}