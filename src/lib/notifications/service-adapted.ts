import { createSupabaseServerClient } from '../supabase'
import { 
  NotificationEvent, 
  NotificationTemplate, 
  NotificationProvider, 
  NotificationService,
  NotificationType,
  NotificationChannel,
  DEFAULT_TEMPLATES
} from './types'
import { createEmailProvider } from './providers/email'

class AdaptedNotificationService implements NotificationService {
  private providers: Map<NotificationChannel, NotificationProvider> = new Map()

  constructor() {
    // Auto-register email provider
    this.registerProvider(createEmailProvider())
  }

  registerProvider(provider: NotificationProvider): void {
    this.providers.set(provider.channel, provider)
  }

  getProvider(channel: NotificationChannel): NotificationProvider | null {
    return this.providers.get(channel) || null
  }

  async createNotification(
    event: Omit<NotificationEvent, 'id' | 'status' | 'attempts' | 'createdAt' | 'updatedAt'>
  ): Promise<NotificationEvent> {
    // For team invitations, just send email directly without database record
    if (event.type === 'team_invitation') {
      const recipientEmails = event.recipients
        .filter(r => r.type === 'user')
        .map(r => r.value)

      for (const email of recipientEmails) {
        try {
          await this.sendEmailDirectly(event, email)
        } catch (emailError) {
          console.error('Failed to send invitation email:', emailError)
          throw emailError
        }
      }

      // Return a mock NotificationEvent for team invitations
      return {
        id: crypto.randomUUID(),
        organizationId: event.organizationId,
        type: event.type,
        entityId: event.entityId,
        entityType: event.entityType,
        recipients: event.recipients,
        data: event.data,
        scheduledFor: event.scheduledFor,
        status: 'sent',
        attempts: 1,
        sentAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }

    // For other notification types, use the existing database structure
    const supabase = await createSupabaseServerClient()
    const recipientEmails = event.recipients
      .filter(r => r.type === 'user')
      .map(r => r.value)

    for (const email of recipientEmails) {
      // Find user_id from email
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single()

      if (!profile) {
        console.log(`Skipping notification for ${email} - user not found`)
        continue
      }

      // Generate title and message based on notification type
      let title = ''
      let message = ''

      // Add other notification type handling here as needed

      const notificationData = {
        organization_id: event.organizationId,
        user_id: profile.id,
        type: event.type,
        title,
        message,
        data: event.data,
        read: false,
        // Set appropriate foreign key based on entity type
        change_id: event.entityType === 'change' ? event.entityId : null,
        incident_id: event.entityType === 'incident' ? event.entityId : null,
        problem_id: event.entityType === 'problem' ? event.entityId : null,
        attempts: 0
      }

      const { data, error } = await supabase
        .from('notifications')
        .insert(notificationData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create notification: ${error.message}`)
      }
    }

    // Return a mock NotificationEvent
    return {
      id: crypto.randomUUID(),
      organizationId: event.organizationId,
      type: event.type,
      entityId: event.entityId,
      entityType: event.entityType,
      recipients: event.recipients,
      data: event.data,
      scheduledFor: event.scheduledFor,
      status: 'pending',
      attempts: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  private async sendEmailDirectly(event: Omit<NotificationEvent, 'id' | 'status' | 'attempts' | 'createdAt' | 'updatedAt'>, recipientEmail: string): Promise<void> {
    const provider = this.getProvider('email')
    if (!provider) {
      throw new Error('Email provider not configured')
    }

    const template = await this.getTemplate(event.type, 'email')
    if (!template) {
      throw new Error(`No template found for ${event.type} via email`)
    }

    // Create a complete event for the email provider
    const emailEvent: NotificationEvent = {
      id: crypto.randomUUID(),
      status: 'pending',
      attempts: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...event,
      recipients: [{ id: crypto.randomUUID(), type: 'user', value: recipientEmail }]
    }

    await provider.send(emailEvent, template)
  }

  async sendNotification(eventId: string): Promise<void> {
    // Implementation for your existing table structure
    console.log('sendNotification not implemented for adapted service')
  }

  async scheduleNotification(
    event: Omit<NotificationEvent, 'id' | 'status' | 'attempts' | 'createdAt' | 'updatedAt'>
  ): Promise<NotificationEvent> {
    return this.createNotification(event)
  }

  async getTemplate(type: NotificationType, channel: NotificationChannel): Promise<NotificationTemplate | null> {
    // Return default template if available
    const defaultTemplate = DEFAULT_TEMPLATES.find(t => t.type === type && t.channel === channel)
    if (defaultTemplate) {
      return {
        id: `default_${type}_${channel}`,
        ...defaultTemplate
      } as NotificationTemplate
    }
    return null
  }

  async createTemplate(template: Omit<NotificationTemplate, 'id'>): Promise<NotificationTemplate> {
    throw new Error('createTemplate not implemented for adapted service')
  }

  async sendPendingNotifications(): Promise<void> {
    console.log('sendPendingNotifications not implemented for adapted service')
  }

  async processScheduledNotifications(): Promise<void> {
    console.log('processScheduledNotifications not implemented for adapted service')
  }
}

export const adaptedNotificationService = new AdaptedNotificationService()