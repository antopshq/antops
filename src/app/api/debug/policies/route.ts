import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    // Use service role to query system tables
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Just test if the automation can access the tables
    const debug: Record<string, any> = {}

    // Test change_automations access
    const { data: automations, error: automationError } = await supabase
      .from('change_automations')
      .select('id, change_id, automation_type, scheduled_for, executed')
      .limit(5)

    debug.change_automations = {
      can_access: !automationError,
      error: automationError,
      sample_records: automations?.length || 0
    }

    // Test changes access
    const { data: changes, error: changesError } = await supabase
      .from('changes')
      .select('id, title, status, scheduled_for')
      .eq('status', 'approved')
      .limit(5)

    debug.changes = {
      can_access: !changesError,
      error: changesError,
      approved_changes: changes?.length || 0,
      sample_changes: changes
    }

    // Test change_approvals access
    const { data: approvals, error: approvalsError } = await supabase
      .from('change_approvals')
      .select('id, change_id, status')
      .limit(5)

    debug.change_approvals = {
      can_access: !approvalsError,
      error: approvalsError,
      sample_records: approvals?.length || 0
    }

    return NextResponse.json({ debug })
  } catch (error) {
    console.error('Error fetching policies:', error)
    return NextResponse.json({ error: 'Failed to fetch policies' }, { status: 500 })
  }
}