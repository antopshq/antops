# Database Setup Instructions

## 🚨 **URGENT: Run Database Migrations**

Your invitation system needs these database tables to work properly.

## 📋 **Steps to Fix**

### 1. **Open Supabase Dashboard**
- Go to [supabase.com](https://supabase.com)
- Open your project
- Navigate to **SQL Editor**

### 2. **Run the Migration Script**
- Copy the entire contents of `database-migrations.sql`
- Paste it into the SQL Editor
- Click **Run**

### 3. **Verify Tables Created**
Go to **Table Editor** and confirm these tables exist:
- ✅ `team_invitations`
- ✅ `notifications`

## 📊 **What This Adds**

### **team_invitations table:**
```sql
- id (UUID, primary key)
- organization_id (UUID) 
- email (TEXT)
- role (TEXT)
- invited_by (UUID → profiles.id)
- invite_token (TEXT, unique)
- status (pending/accepted/expired/cancelled)
- expires_at (TIMESTAMPTZ)
- created_at/updated_at (TIMESTAMPTZ)
```

### **notifications table:**
```sql
- id (UUID, primary key)
- organization_id (UUID)
- type (TEXT)
- entity_id (TEXT)
- entity_type (change/incident/problem/invitation)
- recipients (JSONB)
- data (JSONB)
- scheduled_for (TIMESTAMPTZ)
- status (pending/sent/failed/cancelled)
- attempts (INTEGER) ← This was missing!
- last_attempt_at (TIMESTAMPTZ)
- sent_at (TIMESTAMPTZ)
- error (TEXT)
- created_at/updated_at (TIMESTAMPTZ)
```

### **Missing columns added to existing tables:**
- `organization_id` to all main tables
- `mentions` and `attachments` to comments
- `criticality` and `urgency` to incidents/problems

## ✅ **After Running Migration**

1. **Test invitation system** - should work without errors
2. **Check email delivery** - invitations should send properly
3. **Verify WebSocket** - real-time features should work

## 🔧 **Environment Variables Reminder**

Make sure these are set in Vercel:
```
RESEND_API_KEY=re_your_key
FROM_EMAIL=noreply@antopshq.com  
NEXT_PUBLIC_APP_URL=https://app.antopshq.com
```

Once you run the migration, your invitation system will work perfectly! 🎉