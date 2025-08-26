import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-enhanced'
import { getOrganizationMembers } from '@/lib/organization-store'

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(request)
    if (!authContext.isAuthenticated || !authContext.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = authContext.user

    // Get organization members using multi-tenant function
    const members = await getOrganizationMembers()
    
    // Format the data for the frontend
    const teamMembers = members.map(member => ({
      id: member.id,
      name: member.fullName || member.email,
      email: member.email,
      role: member.role,
      fullName: member.fullName,
      jobTitle: member.jobTitle,
      avatarUrl: member.avatarUrl,
      organizationId: member.organizationId,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt
    }))

    return NextResponse.json({ teamMembers })
  } catch (error) {
    console.error('Team API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}