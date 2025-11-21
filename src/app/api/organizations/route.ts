import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getCurrentUserOrganization, getOrganizationStats, getOrganizationMembers } from '@/lib/organization-store'

export async function GET() {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organization = await getCurrentUserOrganization()
    const stats = await getOrganizationStats()
    const members = await getOrganizationMembers()

    return NextResponse.json({
      organization,
      stats,
      members
    })
  } catch (error) {
    console.error('Organization API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}