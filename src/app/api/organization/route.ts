import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getCurrentUserOrganization } from '@/lib/organization-store'
import { hasPermission, PERMISSIONS } from '@/lib/rbac'

export async function GET() {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user's organization
    const organization = await getCurrentUserOrganization()
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    return NextResponse.json({ organization })
  } catch (error) {
    console.error('Organization API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to manage organization
    if (!hasPermission(user.role, PERMISSIONS.MANAGE_ORGANIZATION)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, settings } = body

    // Get current organization
    const currentOrg = await getCurrentUserOrganization()
    if (!currentOrg) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Update organization (implementation would depend on your update function)
    // This is a placeholder - you'd need to implement the actual update logic
    const updatedOrganization = {
      ...currentOrg,
      name: name || currentOrg.name,
      description: description !== undefined ? description : currentOrg.description,
      settings: settings || currentOrg.settings,
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json({ organization: updatedOrganization })
  } catch (error) {
    console.error('Organization update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}