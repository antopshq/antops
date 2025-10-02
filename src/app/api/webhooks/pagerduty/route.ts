import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { headers } from 'next/headers'

interface PagerDutyIncident {
  id: string
  title: string
  description?: string
  status: string
  urgency: 'low' | 'high'
  priority?: string
  created_at: string
  updated_at?: string
  service?: {
    id: string
    name: string
    description?: string
  }
  assignments?: Array<{
    assignee: {
      id: string
      name: string
      email?: string
    }
  }>
  incident_key?: string
  html_url?: string
  escalation_policy?: {
    id: string
    name: string
  }
}

interface PagerDutyWebhookEvent {
  id: string
  type: string
  created_on: string
  data: {
    incident: PagerDutyIncident
  }
}

interface PagerDutyWebhookPayload {
  messages: PagerDutyWebhookEvent[]
}

// Webhook endpoint to receive PagerDuty alerts
export async function POST(request: NextRequest) {
  try {
    console.log('🔔 PagerDuty webhook received')

    // Get headers for validation
    const headersList = await headers()
    const signature = headersList.get('x-pagerduty-signature')
    const timestamp = headersList.get('x-pagerduty-timestamp')

    // Parse the webhook payload
    const payload: PagerDutyWebhookPayload = await request.json()
    console.log('📦 PagerDuty payload:', JSON.stringify(payload, null, 2))

    if (!payload.messages || payload.messages.length === 0) {
      console.log('❌ No messages in PagerDuty payload')
      return NextResponse.json({ error: 'No messages in payload' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()

    // Process each event in the payload
    for (const event of payload.messages) {
      console.log(`🔄 Processing PagerDuty event: ${event.type} for incident ${event.data.incident.id}`)

      // Only process incident.triggered and incident.acknowledged events for now
      if (!['incident.triggered', 'incident.acknowledged', 'incident.resolved'].includes(event.type)) {
        console.log(`⏭️ Skipping event type: ${event.type}`)
        continue
      }

      const incident = event.data.incident

      // Map PagerDuty urgency to our criticality/urgency system
      const criticality = incident.urgency === 'high' ? 'high' : 'medium'
      const urgency = incident.urgency === 'high' ? 'high' : 'medium'
      
      // Map PagerDuty status to our incident status
      let status = 'open'
      if (incident.status === 'acknowledged') status = 'investigating'
      if (incident.status === 'resolved') status = 'resolved'

      // Create notification for all users in the organization
      // Note: In a real implementation, you might want to filter by team or escalation policy
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, organization_id')
      
      if (usersError) {
        console.error('Failed to fetch users for notifications:', usersError)
        continue
      }

      // Create notifications for users
      for (const user of users || []) {
        const notificationData = {
          id: `pagerduty-${incident.id}-${Date.now()}`,
          organization_id: user.organization_id,
          user_id: user.id,
          type: 'pagerduty_alert',
          title: `PagerDuty: ${incident.title}`,
          message: `${event.type.replace('incident.', '').toUpperCase()}: ${incident.service?.name || 'Service'} - ${incident.title}`,
          data: {
            pagerduty_incident_id: incident.id,
            pagerduty_incident_key: incident.incident_key,
            pagerduty_url: incident.html_url,
            event_type: event.type,
            service: incident.service,
            urgency: incident.urgency,
            status: incident.status,
            created_at: incident.created_at,
            // Pre-fill data for incident creation
            prefill: {
              title: `[PagerDuty] ${incident.title}`,
              description: `
<h3>PagerDuty Alert Details</h3>
<p><strong>Service:</strong> ${incident.service?.name || 'Unknown'}</p>
<p><strong>Status:</strong> ${incident.status}</p>
<p><strong>Urgency:</strong> ${incident.urgency}</p>
<p><strong>PagerDuty URL:</strong> <a href="${incident.html_url}" target="_blank">${incident.html_url}</a></p>
<p><strong>Created:</strong> ${new Date(incident.created_at).toLocaleString()}</p>

${incident.description ? `<h4>Description</h4><p>${incident.description}</p>` : ''}

<p><em>This incident was auto-created from a PagerDuty alert.</em></p>
              `.trim(),
              criticality,
              urgency,
              tags: [
                'source:pagerduty',
                `service:${incident.service?.name?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`,
                `urgency:${incident.urgency}`,
                `pagerduty-id:${incident.id}`
              ].join(', '),
              customer: incident.service?.name || 'PagerDuty Service'
            }
          },
          read: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        // Insert notification
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert(notificationData)

        if (notificationError) {
          console.error('Failed to create PagerDuty notification:', notificationError)
        } else {
          console.log(`✅ Created PagerDuty notification for user ${user.id}`)
        }
      }
    }

    console.log('✅ PagerDuty webhook processed successfully')
    return NextResponse.json({ success: true, processed: payload.messages.length })

  } catch (error) {
    console.error('❌ PagerDuty webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint for webhook verification
export async function GET(request: NextRequest) {
  console.log('🔍 PagerDuty webhook verification request')
  return NextResponse.json({ 
    message: 'PagerDuty webhook endpoint is active',
    timestamp: new Date().toISOString()
  })
}