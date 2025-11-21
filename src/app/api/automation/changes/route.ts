import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Background job for change automation
export async function POST(request: NextRequest) {
  try {
    // Basic security - you might want to add API key authentication
    const authHeader = request.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.CRON_SECRET || 'dev-secret'}`
    if (!authHeader || authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use service role client to bypass RLS for automation
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const now = new Date()
    const results = {
      autoStarted: 0,
      completionPrompts: 0,
      errors: [] as string[]
    }

    // 1. Auto-start approved changes that have reached their scheduled time
    const { data: autoStartChanges, error: autoStartError } = await supabase
      .from('change_automations')
      .select(`
        *,
        change:changes!change_id(*)
      `)
      .eq('automation_type', 'auto_start')
      .eq('executed', false)
      .lte('scheduled_for', now.toISOString())
    
    // Also check all automation records for debugging
    const { data: allAutomations } = await supabase
      .from('change_automations')
      .select(`
        *,
        change:changes!change_id(id, title, status, scheduled_for)
      `)
      .eq('automation_type', 'auto_start')
      .order('created_at', { ascending: false })
      .limit(10)

    console.log('🔍 AUTOMATION DEBUG:')
    console.log('Current time:', now.toISOString())
    console.log('Found', autoStartChanges?.length || 0, 'ready auto-start automations')
    console.log('All recent auto-start automations (last 10):')
    console.log(JSON.stringify(allAutomations, null, 2))
    console.log('Ready automation records:')
    console.log(JSON.stringify(autoStartChanges, null, 2))

    if (autoStartError) {
      console.error('Error fetching auto-start changes:', autoStartError)
      results.errors.push('Failed to fetch auto-start changes')
    } else if (autoStartChanges && autoStartChanges.length > 0) {
      for (const automation of autoStartChanges) {
        const change = automation.change
        
        // Verify change is still in approved status
        if (change && change.status === 'approved') {
          // Update change status to in_progress
          const { error: updateError } = await supabase
            .from('changes')
            .update({ status: 'in_progress' })
            .eq('id', change.id)

          if (updateError) {
            console.error('Error updating change status:', updateError)
            results.errors.push(`Failed to start change ${change.id}`)
            
            // Mark automation as having an error
            await supabase
              .from('change_automations')
              .update({ 
                error_message: `Failed to update change status: ${updateError.message}` 
              })
              .eq('id', automation.id)
          } else {
            // Mark automation as executed
            await supabase
              .from('change_automations')
              .update({ 
                executed: true, 
                executed_at: now.toISOString() 
              })
              .eq('id', automation.id)

            // Notify assigned user and stakeholders
            const notifications = []
            
            // Notify assigned user
            if (change.assigned_to) {
              notifications.push({
                organization_id: change.organization_id,
                user_id: change.assigned_to,
                type: 'change_auto_started',
                title: 'Change Started Automatically',
                message: `Change "${change.title}" has been automatically started as scheduled.`,
                data: { changeId: change.id, autoStarted: true },
                change_id: change.id
              })
            }

            // Notify requester if different from assigned user
            if (change.requested_by && change.requested_by !== change.assigned_to) {
              notifications.push({
                organization_id: change.organization_id,
                user_id: change.requested_by,
                type: 'change_auto_started',
                title: 'Change Started Automatically',
                message: `Change "${change.title}" has been automatically started as scheduled.`,
                data: { changeId: change.id, autoStarted: true },
                change_id: change.id
              })
            }

            if (notifications.length > 0) {
              await supabase
                .from('notifications')
                .insert(notifications)
            }

            // Add comment about auto-start (need a system user ID)
            const { data: systemUser } = await supabase
              .from('profiles')
              .select('id')
              .eq('organization_id', change.organization_id)
              .eq('role', 'admin')
              .limit(1)
              .single()

            if (systemUser) {
              await supabase
                .from('comments')
                .insert({
                  organization_id: change.organization_id,
                  content: '🚀 **AUTO-STARTED** | Change automatically started as scheduled',
                  author_id: systemUser.id,
                  change_id: change.id
                })
            }

            results.autoStarted++
          }
        } else {
          // Change is no longer in approved status, mark automation as executed with error
          await supabase
            .from('change_automations')
            .update({ 
              executed: true,
              executed_at: now.toISOString(),
              error_message: `Change status is ${change?.status || 'unknown'}, expected 'approved'`
            })
            .eq('id', automation.id)
        }
      }
    }

    // 2. Send completion prompts for changes that have reached their estimated end time
    const { data: completionPrompts, error: completionError } = await supabase
      .from('change_automations')
      .select(`
        *,
        change:changes!change_id(*)
      `)
      .eq('automation_type', 'completion_prompt')
      .eq('executed', false)
      .lte('scheduled_for', now.toISOString())

    if (completionError) {
      console.error('Error fetching completion prompts:', completionError)
      results.errors.push('Failed to fetch completion prompts')
    } else if (completionPrompts && completionPrompts.length > 0) {
      for (const automation of completionPrompts) {
        const change = automation.change
        
        // Verify change is still in in_progress status
        if (change && change.status === 'in_progress' && change.assigned_to) {
          // Create notification for assigned user to check completion
          const { error: notificationError } = await supabase
            .from('notifications')
            .insert({
              organization_id: change.organization_id,
              user_id: change.assigned_to,
              type: 'change_completion_prompt',
              title: 'Change Completion Check Required',
              message: `The estimated end time for change "${change.title}" has been reached. Please confirm if the change was completed successfully or if it failed.`,
              data: { 
                changeId: change.id, 
                estimatedEndTime: change.estimated_end_time,
                requiresResponse: true 
              },
              change_id: change.id
            })

          if (notificationError) {
            console.error('Error creating completion prompt notification:', notificationError)
            results.errors.push(`Failed to create completion prompt for change ${change.id}`)
            
            // Mark automation as having an error
            await supabase
              .from('change_automations')
              .update({ 
                error_message: `Failed to create notification: ${notificationError.message}` 
              })
              .eq('id', automation.id)
          } else {
            // Mark automation as executed
            await supabase
              .from('change_automations')
              .update({ 
                executed: true, 
                executed_at: now.toISOString() 
              })
              .eq('id', automation.id)

            results.completionPrompts++
          }
        } else {
          // Change is no longer in in_progress status or has no assigned user
          await supabase
            .from('change_automations')
            .update({ 
              executed: true,
              executed_at: now.toISOString(),
              error_message: `Change status is ${change?.status || 'unknown'} or no assigned user, expected 'in_progress' with assigned user`
            })
            .eq('id', automation.id)
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results
    })

  } catch (error) {
    console.error('Error in change automation job:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get automation status (for monitoring)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use service role client to bypass RLS for automation
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Get pending automations
    const { data: pending, error: pendingError } = await supabase
      .from('change_automations')
      .select('automation_type, scheduled_for, change:changes!change_id(title, status)')
      .eq('executed', false)
      .order('scheduled_for', { ascending: true })

    // Get recent executions
    const { data: recent, error: recentError } = await supabase
      .from('change_automations')
      .select('automation_type, scheduled_for, executed_at, error_message')
      .eq('executed', true)
      .gte('executed_at', oneDayAgo.toISOString())
      .order('executed_at', { ascending: false })
      .limit(50)

    if (pendingError || recentError) {
      return NextResponse.json({ error: 'Failed to fetch automation status' }, { status: 500 })
    }

    return NextResponse.json({
      pending: pending || [],
      recent: recent || [],
      timestamp: now.toISOString()
    })

  } catch (error) {
    console.error('Error fetching automation status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}