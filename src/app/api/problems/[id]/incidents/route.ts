import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getRelatedIncidents } from '@/lib/problem-store-multitenant'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const incidents = await getRelatedIncidents(id)

    return NextResponse.json(incidents)
  } catch (error) {
    console.error('Get related incidents error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}