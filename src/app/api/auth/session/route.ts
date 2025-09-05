import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      console.error('Session check error:', error)
      return NextResponse.json({ user: null }, { status: 200 })
    }

    if (!session || !session.user) {
      return NextResponse.json({ user: null }, { status: 200 })
    }

    console.log('Session found for user:', session.user.id)
    return NextResponse.json({ 
      user: {
        id: session.user.id,
        email: session.user.email
      }
    })

  } catch (error) {
    console.error('Session API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}