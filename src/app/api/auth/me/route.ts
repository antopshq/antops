import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const user = await getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Auth me API error:', error)
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
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { fullName, jobTitle, avatarUrl } = body

    // Validate input
    if (!fullName || fullName.trim().length === 0) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()

    // Update the profile
    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        job_title: jobTitle?.trim() || null,
        avatar_url: avatarUrl?.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating profile:', error)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    // Return updated profile data
    const updatedProfile = {
      id: data.id,
      email: data.email,
      fullName: data.full_name,
      jobTitle: data.job_title,
      avatarUrl: data.avatar_url,
      organizationId: data.organization_id,
      role: data.role,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }

    return NextResponse.json(updatedProfile)
  } catch (error) {
    console.error('Profile update API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}