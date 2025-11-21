# Resend Email Configuration for ANTOPS

## 🚀 **Environment Variables Setup**

Add these to your `.env.local` (development) and production environment:

```bash
# Resend Configuration
RESEND_API_KEY=re_xxxxxxxxxx
FROM_EMAIL=noreply@antopshq.com
NEXT_PUBLIC_APP_URL=https://antopshq.com

# WebSocket Configuration
NEXT_PUBLIC_APP_URL=https://antopshq.com
```

## 📧 **Resend Setup Steps**

### 1. **Create Resend Account**
- Go to [resend.com](https://resend.com)
- Sign up with your account
- Verify your email

### 2. **Domain Verification**
- Add your domain: `antopshq.com`
- Add these DNS records to your domain:

```dns
Name: _resend.antopshq.com
Type: TXT
Value: [provided by Resend]

Name: antopshq.com
Type: MX
Value: feedback-smtp.us-east-1.amazonses.com
Priority: 10
```

### 3. **Get API Key**
- Go to API Keys section
- Create a new API key
- Copy the key (starts with `re_`)
- Add it to your environment variables

### 4. **Test Configuration**
You can test email sending by calling:
```bash
curl -X POST http://localhost:3000/api/notifications/test
```

## 📨 **Email Features**

### **What Gets Sent:**
- **Incident Notifications**: When incidents are created/updated
- **Problem Notifications**: When problems are created/resolved  
- **Change Notifications**: When changes require approval
- **Mention Notifications**: When users are @mentioned in comments
- **Assignment Notifications**: When items are assigned to users

### **Email Template:**
- **From**: `ANTOPS Incident Management <noreply@antopshq.com>`
- **Branded HTML**: Professional ANTOPS-branded email template
- **Responsive**: Works on all devices
- **Plain Text Fallback**: For email clients that don't support HTML

### **Recipients:**
- Organization members based on roles
- Users mentioned in comments
- Assigned users for incidents/problems/changes
- Team leads for high-priority items

## 🔧 **Production Deployment**

### **Environment Variables:**
```bash
NODE_ENV=production
RESEND_API_KEY=re_your_production_key
FROM_EMAIL=noreply@antopshq.com
NEXT_PUBLIC_APP_URL=https://antopshq.com
```

### **Verification:**
- Domain must be verified in Resend
- SPF/DKIM records configured
- Sending limits increased if needed

## 📊 **Monitoring**

The system will log:
- ✅ Successful emails: `Email sent via Resend to X recipients`
- ❌ Failed emails: `Failed to send email via Resend: [error]`
- 🧪 Development mode: Emails logged to console (not sent)

## 🚨 **Troubleshooting**

### **Common Issues:**
1. **Domain not verified**: Check Resend dashboard
2. **API key invalid**: Regenerate key in Resend
3. **Rate limits**: Upgrade Resend plan if needed
4. **Spam folder**: Check recipient spam folders

### **Test Email Sending:**
```typescript
// Add this to test notifications
await notificationService.createNotification({
  organizationId: 'your-org-id',
  type: 'incident_created',
  entityId: 'test-incident',
  entityType: 'incident',
  recipients: [{ type: 'user', value: 'test@example.com' }],
  data: {
    title: 'Test Incident',
    description: 'Testing email notifications'
  }
})
```

## 💰 **Resend Pricing**
- **Free**: 100 emails/day, 3,000/month
- **Pro**: $20/month for higher limits
- **Scale**: Custom pricing for enterprise

Your incident management system is now ready for professional email notifications! 🎉