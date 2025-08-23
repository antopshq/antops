import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'

// Mock pending invitations store - in production use a real database
let pendingInvitations: Array<{
  id: string
  email: string
  role: string
  invitedBy: string
  invitedAt: string
}> = [
  {
    id: '1',
    email: 'john.doe@company.com',
    role: 'Developer',
    invitedBy: 'admin@company.com',
    invitedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
  },
  {
    id: '2',
    email: 'lisa.wang@company.com',
    role: 'Incident Manager',
    invitedBy: 'admin@company.com',
    invitedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
  }
]

export async function GET() {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({ invitations: pendingInvitations })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { email, role } = body

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      )
    }

    // Check if invitation already exists
    if (pendingInvitations.some(inv => inv.email === email)) {
      return NextResponse.json(
        { error: 'Invitation already sent to this email' },
        { status: 409 }
      )
    }

    // Create new invitation
    const invitation = {
      id: Math.random().toString(36).substring(7),
      email,
      role,
      invitedBy: user.email,
      invitedAt: new Date().toISOString()
    }

    pendingInvitations.push(invitation)

    // In production, send an actual email invitation here
    
    return NextResponse.json({ invitation }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const invitationId = searchParams.get('id')

    if (!invitationId) {
      return NextResponse.json(
        { error: 'Invitation ID is required' },
        { status: 400 }
      )
    }

    const index = pendingInvitations.findIndex(inv => inv.id === invitationId)
    if (index === -1) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    pendingInvitations.splice(index, 1)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}