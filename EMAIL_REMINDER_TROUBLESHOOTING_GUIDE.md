# 📧 Email Reminder System Troubleshooting Guide

## 🔍 System Overview

Your automated email reminder system consists of:

1. **Backend Service**: `src/lib/serviceExpiryReminder.ts` - Core reminder logic
2. **Email Service**: `src/lib/emailService.ts` - Email sending via Resend API
3. **Supabase Edge Function**: `supabase/functions/resend/index.ts` - Resend API integration
4. **UI Manager**: `src/components/ServiceExpiryReminderManager.tsx` - Manual controls
5. **Diagnostic Tool**: `src/components/EmailReminderDiagnostic.tsx` - Testing & diagnostics

---

## 🧪 Step 1: Run Diagnostics

### Access the Diagnostic Tool

1. Open your application in the browser
2. Navigate to: `http://localhost:5173/#email-diagnostic`
3. Or manually navigate by typing `email-diagnostic` in the URL after the `#`

### Run All Diagnostic Checks

Click the **"Run Diagnostics"** button to check:

- ✅ Environment Variables (Supabase URL & API Key)
- ✅ Email Reminder Settings in database
- ✅ Services with expiry dates
- ✅ Documents with expiry dates
- ✅ Email reminder logs
- ✅ Supabase Edge Function accessibility

### Interpret Results

- **Green (Pass)**: Component is working correctly
- **Yellow (Warn)**: Component works but may need attention
- **Red (Fail)**: Component has critical issues that need fixing

---

## 🔧 Common Issues & Solutions

### Issue #1: Supabase Edge Function Not Accessible

**Symptoms:**
- Diagnostic shows "Supabase Edge Function" as FAILED
- Error: "Failed to fetch" or HTTP 404

**Solution:**

```bash
# 1. Navigate to your project directory
cd c:\Users\PC\Desktop\projects\servigence

# 2. Login to Supabase (if not already logged in)
npx supabase login

# 3. Link your project
npx supabase link --project-ref YOUR_PROJECT_REF

# 4. Deploy the Resend function
npx supabase functions deploy resend

# 5. Verify deployment
npx supabase functions list
```

---

### Issue #2: Invalid or Missing Resend API Key

**Symptoms:**
- Emails not being sent
- Edge Function returns error about API key

**Solution:**

1. Go to [Resend Dashboard](https://resend.com/api-keys)
2. Create a new API key (or verify existing one)
3. Update `supabase/functions/resend/index.ts` line 4:
   ```typescript
   const RESEND_API_KEY = 'YOUR_NEW_API_KEY_HERE';
   ```
4. Redeploy the function:
   ```bash
   npx supabase functions deploy resend
   ```

---

### Issue #3: No Email Reminder Settings

**Symptoms:**
- Diagnostic shows "Email Reminder Settings" as FAILED
- No reminder settings found in database

**Solution:**

Run this SQL in Supabase SQL Editor:

```sql
-- Insert service expiry reminder settings
INSERT INTO email_reminder_settings (reminder_type, enabled, reminder_intervals)
VALUES ('service_expiry', TRUE, ARRAY[30, 15, 7, 3, 1])
ON CONFLICT DO NOTHING;

-- Insert document expiry reminder settings
INSERT INTO email_reminder_settings (reminder_type, enabled, reminder_intervals)
VALUES ('document_expiry', TRUE, ARRAY[30, 15, 7, 3, 1])
ON CONFLICT DO NOTHING;

-- Verify insertion
SELECT * FROM email_reminder_settings;
```

---

### Issue #4: No Services/Documents with Matching Expiry Dates

**Symptoms:**
- Diagnostic shows services/documents but no emails sent
- Manual check returns "0 reminders sent"

**Explanation:**

The system only sends reminders when the days until expiry EXACTLY matches one of the configured intervals (default: 30, 15, 7, 3, 1 days).

**Solution:**

Option A: Create test data with matching expiry dates

```sql
-- Check what intervals are configured
SELECT reminder_intervals FROM email_reminder_settings WHERE reminder_type = 'service_expiry';

-- Find services that will trigger reminders
SELECT 
  id, 
  invoice_number, 
  expiry_date,
  DATE_PART('day', expiry_date::timestamp - NOW()) as days_until_expiry
FROM service_billings
WHERE expiry_date IS NOT NULL
  AND DATE_PART('day', expiry_date::timestamp - NOW()) IN (30, 15, 7, 3, 1);
```

Option B: Use custom reminder dates for testing

```sql
-- Set a custom reminder date for today
UPDATE service_billings
SET custom_reminder_dates = TO_CHAR(NOW(), 'YYYY-MM-DD')
WHERE id = 'YOUR_SERVICE_BILLING_ID';
```

---

### Issue #5: Automatic Scheduler Not Running

**Symptoms:**
- Manual checks work, but automatic reminders don't send

**Explanation:**

The automatic scheduler in `ServiceExpiryReminderManager.tsx` only runs when the component is mounted (i.e., when you're on that page).

**Solution:**

For production, you need a proper cron job or scheduled task. Options:

**Option A: Supabase Cron Jobs (Recommended)**

Create a new Edge Function for cron:

```typescript
// supabase/functions/reminder-cron/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  // Call your reminder service
  // This will be triggered by Supabase Cron
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  })
})
```

Then configure in `supabase/config.toml`:

```toml
[functions.reminder-cron]
schedule = "0 0 * * *"  # Run daily at midnight
```

**Option B: External Cron Service**

Use a service like:
- [cron-job.org](https://cron-job.org)
- [EasyCron](https://www.easycron.com)
- GitHub Actions

Configure it to call your reminder endpoint daily.

---

## 🧪 Testing Email Sending

### Test 1: Send Test Email via Diagnostic Tool

1. Go to `http://localhost:5173/#email-diagnostic`
2. Enter your email address in the test email field
3. Click the envelope icon to send a test email
4. Check your inbox (and spam folder)

### Test 2: Manual Reminder Check

1. Go to `http://localhost:5173/#email-diagnostic`
2. Click **"Run Manual Check"** button
3. Check browser console for detailed logs
4. Review results in the toast notification

### Test 3: Check Email Logs

```sql
-- View recent email logs
SELECT 
  email_sent_at,
  recipient_email,
  email_status,
  service_name,
  days_before_expiry,
  error_message
FROM email_reminder_logs
ORDER BY email_sent_at DESC
LIMIT 20;
```

---

## 📊 Monitoring & Debugging

### Enable Detailed Logging

The system already has extensive console logging. Open browser console (F12) and look for:

- 🔔 Reminder check start/completion
- 📧 Email sending attempts
- ✅ Success messages
- ❌ Error messages

### Check Email Reminder Logs Table

```sql
-- Count emails sent today
SELECT 
  email_status,
  COUNT(*) as count
FROM email_reminder_logs
WHERE DATE(email_sent_at) = CURRENT_DATE
GROUP BY email_status;

-- View failed emails
SELECT *
FROM email_reminder_logs
WHERE email_status = 'failed'
ORDER BY email_sent_at DESC;
```

---

## 🎯 Next Steps

1. ✅ Run the diagnostic tool
2. ✅ Fix any failed checks
3. ✅ Send a test email to verify email service works
4. ✅ Run a manual reminder check
5. ✅ Set up proper cron job for production
6. ✅ Monitor email logs regularly

---

## 📞 Need More Help?

If you're still experiencing issues after following this guide:

1. Check browser console for error messages
2. Check Supabase logs for Edge Function errors
3. Verify Resend API dashboard for delivery status
4. Review the email_reminder_logs table for failed attempts


