# 🧪 TESTING GUIDE - Duplicate Prevention

**Purpose:** Verify that the duplicate prevention system is working correctly

---

## ✅ PRE-FLIGHT CHECKLIST

Before testing, verify the following:

### **1. Database Verification**

Run this query in Supabase SQL Editor:

```sql
-- Should return 5 (1 primary key + 4 duplicate prevention indexes)
SELECT COUNT(*) as unique_index_count
FROM pg_indexes
WHERE tablename = 'email_reminder_logs'
AND indexdef LIKE '%UNIQUE%';
```

**Expected Result:** `5`

### **2. View All Unique Indexes**

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'email_reminder_logs'
AND indexdef LIKE '%UNIQUE%'
ORDER BY indexname;
```

**Expected Result:** Should show:
- `email_reminder_logs_pkey` (primary key)
- `idx_email_reminder_logs_unique_service_reminder`
- `idx_email_reminder_logs_unique_company_doc_reminder`
- `idx_email_reminder_logs_unique_individual_doc_reminder`
- `idx_email_reminder_logs_unique_employee_doc_reminder`

### **3. Check for Duplicates Today**

```sql
SELECT COUNT(*) as duplicate_count_today
FROM (
    SELECT 
        COALESCE(service_billing_id::text, company_document_id::text, 
                 individual_document_id::text, employee_document_id::text) as item_id,
        days_before_expiry,
        DATE(email_sent_at) as sent_date,
        COUNT(*) as cnt
    FROM email_reminder_logs
    WHERE DATE(email_sent_at) = CURRENT_DATE
    GROUP BY 
        COALESCE(service_billing_id::text, company_document_id::text, 
                 individual_document_id::text, employee_document_id::text),
        days_before_expiry,
        DATE(email_sent_at)
    HAVING COUNT(*) > 1
) duplicates;
```

**Expected Result:** `0`

---

## 🧪 TESTING SCENARIOS

### **Test 1: Verify Scheduler is Running**

1. **Login to the application**
2. **Open browser console (F12)**
3. **Look for these messages:**
   ```
   🚀 Initializing automated email reminder scheduler...
   ✅ Duplicate prevention: Application-level checks + Database unique indexes
   ⏰ Reminder scheduler started. Will run every 5 minutes.
   ```

**Expected Result:** Scheduler starts automatically on login

---

### **Test 2: Manual Duplicate Prevention Test**

1. **Navigate to:** Service Expiry Reminder Manager page
2. **Click "Check Now" button**
3. **Wait for completion** (watch console logs)
4. **Immediately click "Check Now" again**
5. **Watch console logs for:**
   ```
   🔍 Duplicate check: Reminder already sent today for service XXX (N days before expiry)
   ✅ Reminder already sent today (N days before expiry)
   ```

**Expected Result:** 
- First run: Sends reminders (if any are due)
- Second run: Shows "already sent today" messages, NO emails sent

---

### **Test 3: Database-Level Duplicate Prevention**

This test verifies that the database will reject duplicates even if the application check fails.

**Run this in Supabase SQL Editor:**

```sql
-- Step 1: Insert a test reminder log
INSERT INTO email_reminder_logs (
    service_billing_id,
    days_before_expiry,
    recipient_email,
    expiry_date,
    reminder_type,
    email_sent_at
)
VALUES (
    '00000000-0000-0000-0000-000000000001',  -- Fake UUID
    30,
    'test@example.com',
    CURRENT_DATE + INTERVAL '30 days',
    'service_expiry',
    NOW()
);

-- Step 2: Try to insert the SAME reminder again (should FAIL)
INSERT INTO email_reminder_logs (
    service_billing_id,
    days_before_expiry,
    recipient_email,
    expiry_date,
    reminder_type,
    email_sent_at
)
VALUES (
    '00000000-0000-0000-0000-000000000001',  -- Same UUID
    30,                                       -- Same interval
    'test@example.com',
    CURRENT_DATE + INTERVAL '30 days',
    'service_expiry',
    NOW()                                     -- Same day
);

-- Step 3: Clean up test data
DELETE FROM email_reminder_logs
WHERE service_billing_id = '00000000-0000-0000-0000-000000000001';
```

**Expected Result:**
- Step 1: ✅ Success - First insert works
- Step 2: ❌ Error - "duplicate key value violates unique constraint"
- Step 3: ✅ Success - Test data cleaned up

---

### **Test 4: Monitor Automated Scheduler**

1. **Login to the application**
2. **Keep browser console open (F12)**
3. **Wait for 5 minutes**
4. **Watch for automated check:**
   ```
   ⏰ Running scheduled reminder check...
   🔍 Checking for expiring services and documents...
   ```

5. **If reminders are sent, watch for duplicate prevention on next run (5 minutes later):**
   ```
   🔍 Duplicate check: Reminder already sent today...
   ✅ Reminder already sent today...
   ```

**Expected Result:** 
- Scheduler runs every 5 minutes automatically
- Duplicate prevention works across automated runs

---

### **Test 5: Check Email Reminder Logs**

**Run this query to see today's reminder logs:**

```sql
SELECT 
    id,
    CASE 
        WHEN service_billing_id IS NOT NULL THEN 'Service'
        WHEN company_document_id IS NOT NULL THEN 'Company Document'
        WHEN individual_document_id IS NOT NULL THEN 'Individual Document'
        WHEN employee_document_id IS NOT NULL THEN 'Employee Document'
    END as reminder_type,
    days_before_expiry,
    recipient_email,
    expiry_date,
    email_sent_at,
    DATE(email_sent_at) as sent_date
FROM email_reminder_logs
WHERE DATE(email_sent_at) = CURRENT_DATE
ORDER BY email_sent_at DESC;
```

**Expected Result:**
- Each unique combination of (item_id, days_before_expiry, date) appears ONLY ONCE
- No duplicates

---

### **Test 6: Verify Different Intervals Are Allowed**

The system should allow:
- ✅ Same service + DIFFERENT interval + same day
- ✅ Same service + same interval + DIFFERENT day
- ❌ Same service + same interval + same day (DUPLICATE - prevented)

**This is automatic** - the system will send reminders at different intervals (30, 15, 7, 3, 1 days) for the same service on the same day, which is correct behavior.

---

## 📊 MONITORING

### **Console Logs to Watch For:**

**Good Signs:**
```
✅ Reminder already sent today (N days before expiry)
🔍 Duplicate check: Reminder already sent today...
⏰ Reminder scheduler started. Will run every 5 minutes.
```

**Warning Signs:**
```
⚠️ Error checking reminder log: ...
⚠️ Failed to send reminder email: ...
```

**Bad Signs (should NOT see these):**
```
❌ Multiple emails sent for same item/interval/day
❌ Database error: duplicate key value violates unique constraint
   (This would indicate application check failed but database caught it - good!)
```

---

## 🎯 SUCCESS CRITERIA

The duplicate prevention system is working correctly if:

1. ✅ All 5 unique indexes exist in database
2. ✅ No duplicates exist in `email_reminder_logs` table
3. ✅ Scheduler starts automatically on login
4. ✅ Manual "Check Now" twice shows "already sent today" on second run
5. ✅ Database rejects duplicate inserts (Test 3)
6. ✅ Automated scheduler runs every 5 minutes
7. ✅ Console shows duplicate prevention messages
8. ✅ No duplicate emails received

---

## 🚨 TROUBLESHOOTING

### **If duplicates still occur:**

1. **Check database indexes:**
   ```sql
   SELECT COUNT(*) FROM pg_indexes
   WHERE tablename = 'email_reminder_logs'
   AND indexdef LIKE '%UNIQUE%';
   ```
   Should return 5. If not, run: `database/add_unique_indexes_with_immutable_function.sql`

2. **Check for existing duplicates:**
   ```sql
   -- Use query from Test 3 above
   ```
   If duplicates exist, run: `database/cleanup_duplicate_reminders.sql`

3. **Check application logs:**
   - Look for errors in `hasReminderBeenSent()` or `hasDocumentReminderBeenSent()`
   - Check if duplicate check is being called before sending emails

4. **Verify immutable_date function exists:**
   ```sql
   SELECT proname, prosrc FROM pg_proc WHERE proname = 'immutable_date';
   ```
   Should return 1 row. If not, run the CREATE FUNCTION statement from the migration.

---

## 📝 NOTES

- The duplicate prevention works on a **per-day basis** (same calendar day)
- Different intervals (30, 15, 7, 3, 1 days) are allowed on the same day
- Custom reminder dates use `days_before_expiry = 0` in the log
- The system has **two layers** of protection: application checks + database indexes
- Even if application check fails (race condition), database will prevent duplicates


