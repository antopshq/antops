export type NotificationType = 'change_starting' | 'change_overdue' | 'change_completed' | 'incident_created' | 'problem_identified' | 'team_invitation'

export type NotificationChannel = 'email' | 'slack' | 'teams' | 'sms' | 'webhook'

export interface NotificationRecipient {
  id: string
  type: 'user' | 'team' | 'role'
  value: string // email, user ID, team ID, etc.
}

export interface NotificationTemplate {
  id: string
  type: NotificationType
  channel: NotificationChannel
  subject: string
  body: string
  variables: string[] // Variables that can be replaced in template
}

export interface NotificationEvent {
  id: string
  organizationId: string
  type: NotificationType
  entityId: string // Change ID, Incident ID, etc.
  entityType: 'change' | 'incident' | 'problem' | 'invitation'
  recipients: NotificationRecipient[]
  data: Record<string, unknown> // Data for template variables
  scheduledFor?: string // When to send (for future scheduling)
  status: 'pending' | 'sent' | 'failed' | 'cancelled'
  attempts: number
  lastAttemptAt?: string
  sentAt?: string
  createdAt: string
  updatedAt: string
  error?: string
}

export interface NotificationProvider {
  channel: NotificationChannel
  send(notification: NotificationEvent, template: NotificationTemplate): Promise<void>
}

export interface NotificationService {
  // Core methods
  createNotification(event: Omit<NotificationEvent, 'id' | 'status' | 'attempts' | 'createdAt' | 'updatedAt'>): Promise<NotificationEvent>
  sendNotification(eventId: string): Promise<void>
  scheduleNotification(event: Omit<NotificationEvent, 'id' | 'status' | 'attempts' | 'createdAt' | 'updatedAt'>): Promise<NotificationEvent>
  
  // Template management
  getTemplate(type: NotificationType, channel: NotificationChannel): Promise<NotificationTemplate | null>
  createTemplate(template: Omit<NotificationTemplate, 'id'>): Promise<NotificationTemplate>
  
  // Provider management
  registerProvider(provider: NotificationProvider): void
  getProvider(channel: NotificationChannel): NotificationProvider | null
  
  // Batch operations
  sendPendingNotifications(): Promise<void>
  processScheduledNotifications(): Promise<void>
}

// Pre-defined templates for common scenarios
export const DEFAULT_TEMPLATES: Partial<NotificationTemplate>[] = [
  {
    type: 'change_starting',
    channel: 'email',
    subject: 'Change {{changeNumber}} is starting now',
    body: `
Hi {{assignedToName}},

Your scheduled change is starting now:

📋 Change: {{changeTitle}}
📅 Scheduled: {{scheduledFor}}
🏷️ Priority: {{priority}}
🔧 Services: {{affectedServices}}

Please ensure you:
1. Follow the implementation plan
2. Monitor the affected services
3. Update the change status when complete
4. Execute rollback if needed

View change details: {{changeUrl}}

Best regards,
ANTOPS
    `,
    variables: ['changeNumber', 'changeTitle', 'assignedToName', 'scheduledFor', 'priority', 'affectedServices', 'changeUrl']
  },
  {
    type: 'change_overdue',
    channel: 'email',
    subject: 'Change {{changeNumber}} is overdue - Action Required',
    body: `
Hi {{assignedToName}},

Your change is overdue and needs immediate attention:

📋 Change: {{changeTitle}}
📅 Was scheduled for: {{scheduledFor}}
🏷️ Priority: {{priority}}
⏱️ Overdue by: {{overdueBy}}

Please:
1. Update the change status immediately
2. Complete the implementation if still in progress
3. Mark as failed if rollback was executed
4. Add comments explaining the delay

View change details: {{changeUrl}}

Best regards,
ANTOPS
    `,
    variables: ['changeNumber', 'changeTitle', 'assignedToName', 'scheduledFor', 'priority', 'overdueBy', 'changeUrl']
  },
  {
    type: 'team_invitation',
    channel: 'email',
    subject: 'You\'re invited to join {{organizationName}} on ANTOPS',
    body: `
Hi there,

{{inviterName}} has invited you to join their team on ANTOPS.

🏢 Organization: {{organizationName}}
👤 Role: {{role}}
👋 Invited by: {{inviterName}}

Click the link below to accept this invitation:
{{inviteUrl}}

This invitation expires on {{expiresAt}}.

If you don't recognize this invitation or believe it was sent to you by mistake, you can safely ignore this email.

Best regards,
The ANTOPS Team
    `,
    variables: ['inviterName', 'organizationName', 'role', 'inviteUrl', 'expiresAt']
  }
]