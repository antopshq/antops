import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

// GET /api/infra/environments - Get all environments for the user's organization
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Get current user and their organization
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.log('Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('User authenticated:', user.id, user.email)

    // Get user's organization
    const { data: orgMember, error: orgError } = await supabase
      .from('organization_memberships')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (orgError || !orgMember) {
      console.log('Organization lookup error:', orgError)
      console.log('User ID:', user.id)
      
      // Check if organization_memberships table exists and has data
      const { data: allMembers, error: debugError } = await supabase
        .from('organization_memberships')
        .select('*')
        .limit(5)
      
      console.log('Sample organization memberships:', allMembers, debugError)
      
      return NextResponse.json({ 
        error: 'Organization not found', 
        debug: {
          userId: user.id,
          orgError: orgError?.message,
          sampleMembers: allMembers?.length || 0
        }
      }, { status: 404 })
    }

    const organizationId = orgMember.organization_id

    // Fetch all environments for this organization
    const { data: environments, error: envError } = await supabase
      .from('infrastructure_environments')
      .select('*')
      .eq('organization_id', organizationId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true })

    if (envError) {
      console.error('Error fetching environments:', envError)
      return NextResponse.json({ error: 'Failed to fetch environments' }, { status: 500 })
    }

    return NextResponse.json({ environments: environments || [] })

  } catch (error) {
    console.error('GET /api/infra/environments error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/infra/environments - Create a new environment
export async function POST(request: NextRequest) {
  try {
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

    // Parse request body
    const body = await request.json()
    const { name, description, is_default } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Environment name is required' }, { status: 400 })
    }

    // If this is being set as default, unset other defaults first
    if (is_default) {
      await supabase
        .from('infrastructure_environments')
        .update({ is_default: false })
        .eq('organization_id', organizationId)
        .eq('is_default', true)
    }

    // Create new environment
    const { data: newEnvironment, error: createError } = await supabase
      .from('infrastructure_environments')
      .insert({
        organization_id: organizationId,
        name: name.trim(),
        description: description?.trim() || null,
        is_default: !!is_default
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating environment:', createError)
      
      // Handle unique constraint violation
      if (createError.code === '23505') {
        return NextResponse.json({ error: 'Environment name already exists' }, { status: 409 })
      }
      
      return NextResponse.json({ error: 'Failed to create environment' }, { status: 500 })
    }

    return NextResponse.json({ 
      environment: newEnvironment,
      message: 'Environment created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('POST /api/infra/environments error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/infra/environments - Update an environment
export async function PUT(request: NextRequest) {
  try {
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

    // Parse request body
    const body = await request.json()
    const { id, name, description } = body

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Environment ID is required' }, { status: 400 })
    }

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Environment name is required' }, { status: 400 })
    }

    // Verify the environment belongs to the user's organization
    const { data: existingEnv, error: checkError } = await supabase
      .from('infrastructure_environments')
      .select('id')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single()

    if (checkError || !existingEnv) {
      return NextResponse.json({ error: 'Environment not found' }, { status: 404 })
    }

    // Update environment
    const { data: updatedEnvironment, error: updateError } = await supabase
      .from('infrastructure_environments')
      .update({
        name: name.trim(),
        description: description?.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating environment:', updateError)
      
      // Handle unique constraint violation
      if (updateError.code === '23505') {
        return NextResponse.json({ error: 'Environment name already exists' }, { status: 409 })
      }
      
      return NextResponse.json({ error: 'Failed to update environment' }, { status: 500 })
    }

    return NextResponse.json({ 
      environment: updatedEnvironment,
      message: 'Environment updated successfully'
    })

  } catch (error) {
    console.error('PUT /api/infra/environments error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}