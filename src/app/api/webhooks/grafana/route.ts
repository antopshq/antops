import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { headers } from 'next/headers'

interface GrafanaAlert {
  status: string
  labels: {
    alertname: string
    instance?: string
    job?: string
    severity?: string
    [key: string]: string | undefined
  }
  annotations: {
    summary?: string
    description?: string
    runbook_url?: string
    [key: string]: string | undefined
  }
  startsAt: string
  endsAt?: string
  generatorURL?: string
  fingerprint: string
  silenceURL?: string
  dashboardURL?: string
  panelURL?: string
}

interface GrafanaWebhookPayload {
  receiver: string
  status: string
  alerts: GrafanaAlert[]
  groupLabels: Record<string, string>
  commonLabels: Record<string, string>
  commonAnnotations: Record<string, string>
  externalURL: string
  version: string
  groupKey: string
  truncatedAlerts?: number
  orgId?: number
  title?: string
  state?: string
  message?: string
}

// Webhook endpoint to receive Grafana alert notifications
export async function POST(request: NextRequest) {
  try {
    console.log('📊 Grafana webhook received')

    // Get headers for validation
    const headersList = await headers()
    const userAgent = headersList.get('user-agent')
    const contentType = headersList.get('content-type')

    // Parse the webhook payload
    const payload: GrafanaWebhookPayload = await request.json()
    console.log('📦 Grafana payload:', JSON.stringify(payload, null, 2))

    if (!payload.alerts || payload.alerts.length === 0) {
      console.log('❌ No alerts in Grafana payload')
      return NextResponse.json({ error: 'No alerts in payload' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()

    // Process each alert in the payload
    for (const alert of payload.alerts) {
      console.log(`🔄 Processing Grafana alert: ${alert.labels.alertname} - ${alert.status}`)

      // Only process firing alerts for notifications
      if (alert.status !== 'firing') {
        console.log(`⏭️ Skipping non-firing alert: ${alert.status}`)
        continue
      }

      // Map Grafana severity to our criticality/urgency system
      const severity = alert.labels.severity || alert.annotations.severity || 'warning'
      let criticality = 'medium'
      let urgency = 'medium'
      
      if (severity === 'critical') {
        criticality = 'high'
        urgency = 'high'
      } else if (severity === 'warning') {
        criticality = 'medium'
        urgency = 'medium'
      } else if (severity === 'info') {
        criticality = 'low'
        urgency = 'low'
      }

      // Create notification for all users in the organization
      // Note: In a real implementation, you might want to filter by team or notification preferences
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, organization_id')
      
      if (usersError) {
        console.error('Failed to fetch users for notifications:', usersError)
        continue
      }

      // Create notifications for users
      for (const user of users || []) {
        const alertName = alert.labels.alertname || 'Unknown Alert'
        const instance = alert.labels.instance || 'Unknown Instance'
        const summary = alert.annotations.summary || alert.annotations.description || `Alert: ${alertName}`
        
        const notificationData = {
          id: `grafana-${alert.fingerprint}-${Date.now()}`,
          organization_id: user.organization_id,
          user_id: user.id,
          type: 'grafana_alert',
          title: `Grafana: ${alertName}`,
          message: `FIRING: ${summary} (${instance})`,
          data: {
            grafana_alert_id: alert.fingerprint,
            grafana_alert_name: alertName,
            grafana_generator_url: alert.generatorURL,
            grafana_dashboard_url: alert.dashboardURL,
            grafana_panel_url: alert.panelURL,
            grafana_silence_url: alert.silenceURL,
            alert_status: alert.status,
            labels: alert.labels,
            annotations: alert.annotations,
            starts_at: alert.startsAt,
            ends_at: alert.endsAt,
            // Pre-fill data for incident creation
            prefill: {
              title: `[Grafana] ${alertName}`,
              description: `
<h3>Grafana Alert Details</h3>
<p><strong>Alert:</strong> ${alertName}</p>
<p><strong>Status:</strong> ${alert.status}</p>
<p><strong>Severity:</strong> ${severity}</p>
<p><strong>Instance:</strong> ${instance}</p>
<p><strong>Summary:</strong> ${summary}</p>
${alert.generatorURL ? `<p><strong>View in Grafana:</strong> <a href="${alert.generatorURL}" target="_blank">${alert.generatorURL}</a></p>` : ''}
${alert.dashboardURL ? `<p><strong>Dashboard:</strong> <a href="${alert.dashboardURL}" target="_blank">View Dashboard</a></p>` : ''}
${alert.panelURL ? `<p><strong>Panel:</strong> <a href="${alert.panelURL}" target="_blank">View Panel</a></p>` : ''}
<p><strong>Started:</strong> ${new Date(alert.startsAt).toLocaleString()}</p>

<h4>Labels</h4>
${Object.entries(alert.labels).map(([key, value]) => `<p><strong>${key}:</strong> ${value}</p>`).join('')}

${Object.keys(alert.annotations).length > 0 ? `
<h4>Annotations</h4>
${Object.entries(alert.annotations).map(([key, value]) => `<p><strong>${key}:</strong> ${value}</p>`).join('')}
` : ''}

<p><em>This incident was auto-created from a Grafana alert.</em></p>
              `.trim(),
              criticality,
              urgency,
              tags: [
                'source:grafana',
                `alert:${alertName.toLowerCase().replace(/\s+/g, '-')}`,
                `severity:${severity}`,
                `instance:${instance.replace(/[^a-zA-Z0-9]/g, '-')}`,
                `grafana-fingerprint:${alert.fingerprint}`
              ].join(', '),
              customer: alert.labels.instance || alert.labels.job || 'Grafana Service',
              affectedServices: [
                alert.labels.service || alert.labels.job || alert.labels.instance || alertName
              ]
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
          console.error('Failed to create Grafana notification:', notificationError)
        } else {
          console.log(`✅ Created Grafana notification for user ${user.id}`)
        }
      }
    }

    console.log('✅ Grafana webhook processed successfully')
    return NextResponse.json({ success: true, processed: payload.alerts.length })

  } catch (error) {
    console.error('❌ Grafana webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint for webhook verification
export async function GET(request: NextRequest) {
  console.log('🔍 Grafana webhook verification request')
  return NextResponse.json({ 
    message: 'Grafana webhook endpoint is active',
    timestamp: new Date().toISOString()
  })
}