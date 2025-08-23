import { NotificationProvider, NotificationEvent, NotificationTemplate } from '../types'

// Template variable replacement function
function replaceTemplateVariables(template: string, data: Record<string, unknown>): string {
  let result = template
  
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{${key}}}`, 'g')
    result = result.replace(regex, String(value || ''))
  }
  
  return result
}

// Mock email provider - replace with real email service
class MockEmailProvider implements NotificationProvider {
  channel = 'email' as const

  async send(notification: NotificationEvent, template: NotificationTemplate): Promise<void> {
    console.log('📧 EMAIL NOTIFICATION (Mock Provider)')
    console.log('═══════════════════════════════════════')
    
    const subject = replaceTemplateVariables(template.subject, notification.data)
    const body = replaceTemplateVariables(template.body, notification.data)
    
    // Extract email recipients
    const emailRecipients = notification.recipients
      .filter(r => r.type === 'user')
      .map(r => r.value)
    
    console.log(`📬 To: ${emailRecipients.join(', ')}`)
    console.log(`📝 Subject: ${subject}`)
    console.log(`📄 Body:\n${body}`)
    console.log('═══════════════════════════════════════')
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 100))
    
    console.log('✅ Email sent successfully!')
  }
}

// Production email provider using Resend
class ResendEmailProvider implements NotificationProvider {
  channel = 'email' as const
  private apiKey: string
  private fromEmail: string

  constructor(apiKey: string, fromEmail: string) {
    this.apiKey = apiKey
    this.fromEmail = fromEmail
  }

  async send(notification: NotificationEvent, template: NotificationTemplate): Promise<void> {
    const subject = replaceTemplateVariables(template.subject, notification.data)
    const body = replaceTemplateVariables(template.body, notification.data)
    
    // Extract email recipients
    const emailRecipients = notification.recipients
      .filter(r => r.type === 'user')
      .map(r => r.value)

    if (emailRecipients.length === 0) {
      console.log('No email recipients found, skipping email send')
      return
    }

    try {
      // Convert plain text to HTML (basic formatting)
      const htmlBody = body
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        .replace(/^/, '<p>')
        .replace(/$/, '</p>')

      // Send email using Resend API
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `ANTOPS Incident Management <${this.fromEmail}>`,
          to: emailRecipients,
          subject: subject,
          text: body,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${subject}</title>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
                .content { background-color: white; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px; }
                .footer { margin-top: 20px; padding: 20px; background-color: #f8f9fa; border-radius: 8px; text-align: center; color: #6c757d; font-size: 12px; }
                .button { display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h2 style="margin: 0; color: #495057;">ANTOPS Incident Management</h2>
                </div>
                <div class="content">
                  ${htmlBody}
                </div>
                <div class="footer">
                  <p>This email was sent from ANTOPS Incident Management System.</p>
                  <p>If you believe you received this email in error, please contact your system administrator.</p>
                </div>
              </div>
            </body>
            </html>
          `
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Resend API error: ${response.status} - ${errorData.message || 'Unknown error'}`)
      }

      const result = await response.json()
      console.log(`✅ Email sent via Resend to ${emailRecipients.length} recipients. ID: ${result.id}`)

    } catch (error) {
      console.error('❌ Failed to send email via Resend:', error)
      throw error
    }
  }
}

// Factory function to create email provider based on environment
export function createEmailProvider(): NotificationProvider {
  const isProduction = process.env.NODE_ENV === 'production'
  const resendApiKey = process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY
  const fromEmail = process.env.FROM_EMAIL || 'noreply@antopshq.com'

  if (isProduction && resendApiKey) {
    console.log('🚀 Using Resend email provider for production')
    return new ResendEmailProvider(resendApiKey, fromEmail)
  } else {
    console.log('🧪 Using mock email provider for development')
    return new MockEmailProvider()
  }
}