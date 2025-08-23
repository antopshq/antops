import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase'

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
    const supabase = await createSupabaseServerClient()

    // Get change data
    const { data: change, error } = await supabase
      .from('changes')
      .select('id, status, created_at, updated_at, organization_id')
      .eq('id', id)
      .eq('organization_id', user.organizationId)
      .single()

    if (error || !change) {
      return NextResponse.json({ error: 'Change not found' }, { status: 404 })
    }

    // Create simple timeline from change data
    const statusHistory = [
      {
        id: `${id}-created`,
        status: 'draft',
        changedAt: change.created_at,
        changedBy: user.id,
        changedByName: 'System',
        comment: 'Change created'
      }
    ]

    // If status is not draft, add current status
    if (change.status !== 'draft') {
      statusHistory.push({
        id: `${id}-current`,
        status: change.status,
        changedAt: change.updated_at || change.created_at,
        changedBy: user.id,
        changedByName: user.name || user.email || 'User',
        comment: 'Status updated'
      })
    }
    
    return NextResponse.json({ statusHistory })

  } catch (error) {
    console.error('GET status history error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}