import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

// GET /api/components/[componentId]/links - Get all incidents/problems/changes linked to a component
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ componentId: string }> }
) {
  try {
    const { componentId } = await params
    const supabase = await createSupabaseServerClient()
    
    // Get current user and their organization
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: orgMember, error: orgError } = await supabase
      .from('organization_memberships')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (orgError || !orgMember) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const organizationId = orgMember.organization_id

    // Get all incidents linked to this component
    const { data: incidents, error: incidentsError } = await supabase
      .from('incidents')
      .select(`
        id, title, status, priority, created_at,
        assigned_profile:profiles!assigned_to(full_name)
      `)
      .eq('organization_id', organizationId)
      .contains('affected_services', [componentId])
      .order('created_at', { ascending: false })

    // Get all problems linked to this component
    const { data: problems, error: problemsError } = await supabase
      .from('problems')
      .select(`
        id, title, status, priority, created_at,
        assigned_profile:profiles!assigned_to(full_name)
      `)
      .eq('organization_id', organizationId)
      .contains('affected_services', [componentId])
      .order('created_at', { ascending: false })

    // Get all changes linked to this component
    const { data: changes, error: changesError } = await supabase
      .from('changes')
      .select(`
        id, title, status, priority, created_at,
        assigned_profile:profiles!assigned_to(full_name)
      `)
      .eq('organization_id', organizationId)
      .contains('affected_services', [componentId])
      .order('created_at', { ascending: false })

    if (incidentsError || problemsError || changesError) {
      console.error('Error fetching linked items:', { incidentsError, problemsError, changesError })
      return NextResponse.json({ error: 'Failed to fetch linked items' }, { status: 500 })
    }


    return NextResponse.json({
      incidents: incidents || [],
      problems: problems || [],
      changes: changes || [],
      componentId
    })

  } catch (error) {
    console.error('GET /api/components/[componentId]/links error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/components/[componentId]/links - Link component to incidents/problems/changes
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ componentId: string }> }
) {
  try {
    const { componentId } = await params
    const supabase = await createSupabaseServerClient()
    
    // Get current user and their organization
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: orgMember, error: orgError } = await supabase
      .from('organization_memberships')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (orgError || !orgMember) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const organizationId = orgMember.organization_id
    const body = await request.json()
    const { itemIds, itemType } = body

    if (!Array.isArray(itemIds) || !itemType || !['incidents', 'problems', 'changes'].includes(itemType)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }

    const tableName = itemType
    const results = []

    // Update each item to include this component in affected_services
    for (const itemId of itemIds) {
      // First get current affected_services
      const { data: currentItem, error: fetchError } = await supabase
        .from(tableName)
        .select('affected_services')
        .eq('id', itemId)
        .eq('organization_id', organizationId)
        .single()

      if (fetchError || !currentItem) {
        console.error(`Error fetching ${itemType} ${itemId}:`, fetchError)
        continue
      }

      const currentServices = currentItem.affected_services || []
      
      // Add component if not already present
      if (!currentServices.includes(componentId)) {
        const updatedServices = [...currentServices, componentId]

        const { data: updatedItem, error: updateError } = await supabase
          .from(tableName)
          .update({ affected_services: updatedServices })
          .eq('id', itemId)
          .eq('organization_id', organizationId)
          .select()
          .single()

        if (updateError) {
          console.error(`Error updating ${itemType} ${itemId}:`, updateError)
        } else {
          results.push({ itemId, itemType, status: 'linked' })
        }
      } else {
        results.push({ itemId, itemType, status: 'already_linked' })
      }
    }

    return NextResponse.json({ 
      success: true, 
      results,
      componentId 
    })

  } catch (error) {
    console.error('POST /api/components/[componentId]/links error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/components/[componentId]/links - Unlink component from incidents/problems/changes
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ componentId: string }> }
) {
  try {
    const { componentId } = await params
    const supabase = await createSupabaseServerClient()
    
    // Get current user and their organization
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: orgMember, error: orgError } = await supabase
      .from('organization_memberships')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (orgError || !orgMember) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const organizationId = orgMember.organization_id
    const body = await request.json()
    const { itemId, itemType } = body

    if (!itemId || !itemType || !['incidents', 'problems', 'changes'].includes(itemType)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }

    const tableName = itemType // Use plural form as table name

    // Get current affected_services
    const { data: currentItem, error: fetchError } = await supabase
      .from(tableName)
      .select('affected_services')
      .eq('id', itemId)
      .eq('organization_id', organizationId)
      .single()

    if (fetchError || !currentItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    const currentServices = currentItem.affected_services || []
    const updatedServices = currentServices.filter((service: string) => service !== componentId)

    // Update the item
    const { error: updateError } = await supabase
      .from(tableName)
      .update({ affected_services: updatedServices })
      .eq('id', itemId)
      .eq('organization_id', organizationId)

    if (updateError) {
      console.error(`Error unlinking ${itemType} ${itemId}:`, updateError)
      return NextResponse.json({ error: 'Failed to unlink component' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      componentId,
      itemId,
      itemType
    })

  } catch (error) {
    console.error('DELETE /api/components/[componentId]/links error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}