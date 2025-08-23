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

class NotificationServiceImpl implements NotificationService {
  private providers: Map<NotificationChannel, NotificationProvider> = new Map()

  // Provider management
  registerProvider(provider: NotificationProvider): void {
    this.providers.set(provider.channel, provider)
  }

  getProvider(channel: NotificationChannel): NotificationProvider | null {
    return this.providers.get(channel) || null
  }

  // Core notification methods
  async createNotification(
    event: Omit<NotificationEvent, 'id' | 'status' | 'attempts' | 'createdAt' | 'updatedAt'>
  ): Promise<NotificationEvent> {
    const supabase = await createSupabaseServerClient()
    
    const notificationData = {
      organization_id: event.organizationId,
      type: event.type,
      entity_id: event.entityId,
      entity_type: event.entityType,
      recipients: event.recipients,
      data: event.data,
      scheduled_for: event.scheduledFor || null,
      status: 'pending' as const,
      attempts: 0
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert(notificationData)
      .select()
      .single()

    if (error || !data) {
      throw new Error(`Failed to create notification: ${error?.message}`)
    }

    return {
      id: data.id,
      organizationId: data.organization_id,
      type: data.type,
      entityId: data.entity_id,
      entityType: data.entity_type,
      recipients: data.recipients,
      data: data.data,
      scheduledFor: data.scheduled_for,
      status: data.status,
      attempts: data.attempts,
      lastAttemptAt: data.last_attempt_at,
      sentAt: data.sent_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      error: data.error
    }
  }

  async sendNotification(eventId: string): Promise<void> {
    const supabase = await createSupabaseServerClient()
    
    // Get notification event
    const { data: notification, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', eventId)
      .single()

    if (error || !notification) {
      throw new Error(`Notification not found: ${eventId}`)
    }

    if (notification.status === 'sent') {
      return // Already sent
    }

    try {
      // For now, we'll use email as the default channel
      const template = await this.getTemplate(notification.type, 'email')
      if (!template) {
        throw new Error(`No template found for ${notification.type} via email`)
      }

      const provider = this.getProvider('email')
      if (!provider) {
        throw new Error('Email provider not configured')
      }

      const event: NotificationEvent = {
        id: notification.id,
        organizationId: notification.organization_id,
        type: notification.type,
        entityId: notification.entity_id,
        entityType: notification.entity_type,
        recipients: notification.recipients,
        data: notification.data,
        scheduledFor: notification.scheduled_for,
        status: notification.status,
        attempts: notification.attempts,
        lastAttemptAt: notification.last_attempt_at,
        sentAt: notification.sent_at,
        createdAt: notification.created_at,
        updatedAt: notification.updated_at,
        error: notification.error
      }

      await provider.send(event, template)

      // Mark as sent
      await supabase
        .from('notifications')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          last_attempt_at: new Date().toISOString(),
          attempts: notification.attempts + 1
        })
        .eq('id', eventId)

    } catch (error) {
      console.error(`Failed to send notification ${eventId}:`, error)
      
      // Mark as failed
      await supabase
        .from('notifications')
        .update({
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          last_attempt_at: new Date().toISOString(),
          attempts: notification.attempts + 1
        })
        .eq('id', eventId)

      throw error
    }
  }

  async scheduleNotification(
    event: Omit<NotificationEvent, 'id' | 'status' | 'attempts' | 'createdAt' | 'updatedAt'>
  ): Promise<NotificationEvent> {
    return this.createNotification(event)
  }

  // Template management
  async getTemplate(type: NotificationType, channel: NotificationChannel): Promise<NotificationTemplate | null> {
    const supabase = await createSupabaseServerClient()
    
    const { data, error } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('type', type)
      .eq('channel', channel)
      .single()

    if (error || !data) {
      // Return default template if no custom template found
      const defaultTemplate = DEFAULT_TEMPLATES.find(t => t.type === type && t.channel === channel)
      if (defaultTemplate) {
        return {
          id: `default_${type}_${channel}`,
          ...defaultTemplate
        } as NotificationTemplate
      }
      return null
    }

    return {
      id: data.id,
      type: data.type,
      channel: data.channel,
      subject: data.subject,
      body: data.body,
      variables: data.variables
    }
  }

  async createTemplate(template: Omit<NotificationTemplate, 'id'>): Promise<NotificationTemplate> {
    const supabase = await createSupabaseServerClient()
    
    const { data, error } = await supabase
      .from('notification_templates')
      .insert(template)
      .select()
      .single()

    if (error || !data) {
      throw new Error(`Failed to create template: ${error?.message}`)
    }

    return {
      id: data.id,
      type: data.type,
      channel: data.channel,
      subject: data.subject,
      body: data.body,
      variables: data.variables
    }
  }

  // Batch operations
  async sendPendingNotifications(): Promise<void> {
    const supabase = await createSupabaseServerClient()
    
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('id')
      .eq('status', 'pending')
      .is('scheduled_for', null)
      .limit(50) // Process in batches

    if (error || !notifications) {
      console.error('Failed to fetch pending notifications:', error)
      return
    }

    for (const notification of notifications) {
      try {
        await this.sendNotification(notification.id)
      } catch (error) {
        console.error(`Failed to send notification ${notification.id}:`, error)
        // Continue with next notification
      }
    }
  }

  async processScheduledNotifications(): Promise<void> {
    const supabase = await createSupabaseServerClient()
    const now = new Date().toISOString()
    
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('id')
      .eq('status', 'pending')
      .not('scheduled_for', 'is', null)
      .lte('scheduled_for', now)
      .limit(50) // Process in batches

    if (error || !notifications) {
      console.error('Failed to fetch scheduled notifications:', error)
      return
    }

    for (const notification of notifications) {
      try {
        await this.sendNotification(notification.id)
      } catch (error) {
        console.error(`Failed to send scheduled notification ${notification.id}:`, error)
        // Continue with next notification
      }
    }
  }
}

// Singleton instance
export const notificationService = new NotificationServiceImpl()
export type { NotificationService }