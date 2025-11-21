import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

// Simple test endpoint to check if comments table exists
export async function GET(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Test 1: Check if comments table exists
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'comments')

    if (tablesError) {
      return NextResponse.json({ 
        error: 'Database error', 
        details: tablesError.message 
      }, { status: 500 })
    }

    // Test 2: Try a simple select from comments table
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('id')
      .limit(1)

    return NextResponse.json({
      user: {
        id: user.id,
        organizationId: user.organizationId
      },
      tests: {
        tableExists: tables.length > 0,
        tableAccessible: !commentsError,
        commentsError: commentsError?.message || null
      }
    })
  } catch (error) {
    console.error('Test API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}