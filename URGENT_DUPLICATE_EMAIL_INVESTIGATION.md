# 🚨 URGENT: Duplicate Email Investigation & Fix

## ✅ **SCHEDULER DISABLED**

The 5-minute automated scheduler has been **IMMEDIATELY DISABLED** to stop duplicate emails.

**File Modified:** `src/App.tsx`
- Commented out the scheduler initialization
- Added warning logs that scheduler is disabled
- Scheduler will remain disabled until issue is resolved

**Verification:**
1. Refresh your application
2. Open browser console (F12)
3. You should see:
   ```
   ⚠️ AUTOMATED REMINDER SCHEDULER IS DISABLED
   ⚠️ Investigating duplicate email issue
   ⚠️ Scheduler will be re-enabled after fix is verified
   ```

---

## 🔍 **INVESTIGATION STEPS**

### **STEP 1: Run Diagnostic Queries**

I've created a comprehensive diagnostic SQL file: `database/DIAGNOSTIC_DUPLICATE_EMAILS.sql`

**How to run:**

1. **Open Supabase Dashboard**
2. **Go to SQL Editor**
3. **Copy and paste the queries from `database/DIAGNOSTIC_DUPLICATE_EMAILS.sql`**
4. **Run each query section and note the results**

---

### **STEP 2: Check If Migration Was Run**

**Query to run:**

```sql
-- Check if unique indexes exist
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'email_reminder_logs'
AND indexdef LIKE '%UNIQUE%'
ORDER BY indexname;
```

**Expected Result:** Should return **4 rows** (4 unique indexes)

**If you see LESS than 4 rows:**
- ❌ The migration `database/add_document_unique_indexes_to_reminder_logs.sql` was **NOT RUN**
- ✅ **ACTION:** Run the migration immediately (see Step 3)

**If you see 4 rows:**
- ✅ Migration was run successfully
- ⚠️ There's a different issue causing duplicates (see Step 4)

---

### **STEP 3: Run the Migration (If Not Already Run)**

**If the migration was NOT run, run it now:**

1. **Open Supabase Dashboard → SQL Editor**
2. **Copy contents of:** `database/add_document_unique_indexes_to_reminder_logs.sql`
3. **Paste and click "Run"**
4. **Verify success** by running the query from Step 2 again

**Expected Result:** Should now see 4 unique indexes

---

### **STEP 4: Check for Existing Duplicates in Database**

**Query to run:**

```sql
-- Find duplicate reminders sent today
SELECT 
    COALESCE(service_billing_id::text, company_document_id::text, 
             individual_document_id::text, employee_document_id::text) as item_id,
    CASE 
        WHEN service_billing_id IS NOT NULL THEN 'service'
        WHEN company_document_id IS NOT NULL THEN 'company_document'
        WHEN individual_document_id IS NOT NULL THEN 'individual_document'
        WHEN employee_document_id IS NOT NULL THEN 'employee_document'
    END as item_type,
    days_before_expiry,
    DATE(email_sent_at) as sent_date,
    COUNT(*) as duplicate_count,
    MIN(email_sent_at) as first_sent,
    MAX(email_sent_at) as last_sent,
    MAX(email_sent_at) - MIN(email_sent_at) as time_between_duplicates
FROM email_reminder_logs
WHERE DATE(email_sent_at) = CURRENT_DATE
GROUP BY 
    COALESCE(service_billing_id::text, company_document_id::text, 
             individual_document_id::text, employee_document_id::text),
    CASE 
        WHEN service_billing_id IS NOT NULL THEN 'service'
        WHEN company_document_id IS NOT NULL THEN 'company_document'
        WHEN individual_document_id IS NOT NULL THEN 'individual_document'
        WHEN employee_document_id IS NOT NULL THEN 'employee_document'
    END,
    days_before_expiry,
    DATE(email_sent_at)
HAVING COUNT(*) > 1
ORDER BY sent_date DESC, duplicate_count DESC;
```

**If this returns rows:**
- ❌ You have duplicate entries in the database
- 📊 Note the `time_between_duplicates` column - this shows how quickly duplicates were created
- 🔍 This indicates the duplicate prevention logic is NOT working

**If this returns 0 rows:**
- ✅ No duplicates in database
- ⚠️ But you're receiving duplicate emails?
- 🔍 Possible causes:
  - Email service is sending duplicates (not database issue)
  - Browser console shows different story than database
  - Timing issue with email delivery

---

### **STEP 5: Review Console Logs**

**Check browser console for these messages:**

**Expected (duplicate prevention working):**
```
🔍 Duplicate check: Reminder already sent today for service abc-123 (30 days before expiry)
✅ Reminder already sent today (30 days before expiry)
```

**Unexpected (duplicate prevention NOT working):**
```
📤 Sending reminder email (30 days before expiry)...
✅ Email sent successfully
[5 minutes later]
📤 Sending reminder email (30 days before expiry)...  ← DUPLICATE!
✅ Email sent successfully
```

**If you see duplicates being sent:**
- ❌ The `hasReminderBeenSent()` function is NOT detecting duplicates
- 🔍 Possible causes:
  - Database query is not finding existing logs
  - Date/time comparison issue
  - Timezone issue

---

### **STEP 6: Diagnostic Summary Query**

**Run this query to get a complete summary:**

```sql
SELECT 
    'Total reminders sent today' as metric,
    COUNT(*)::text as value
FROM email_reminder_logs
WHERE DATE(email_sent_at) = CURRENT_DATE

UNION ALL

SELECT 
    'Unique indexes on table' as metric,
    COUNT(*)::text as value
FROM pg_indexes
WHERE tablename = 'email_reminder_logs'
AND indexdef LIKE '%UNIQUE%'

UNION ALL

SELECT 
    'Document ID columns exist' as metric,
    COUNT(*)::text as value
FROM information_schema.columns
WHERE table_name = 'email_reminder_logs'
AND column_name IN ('company_document_id', 'individual_document_id', 'employee_document_id')

UNION ALL

SELECT 
    'Duplicate reminders today' as metric,
    COUNT(*)::text as value
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

**Expected Results:**

| Metric | Expected Value | What It Means |
|--------|---------------|---------------|
| Total reminders sent today | Any number | How many reminders were sent |
| Unique indexes on table | **4** | Migration was run successfully |
| Document ID columns exist | **3** | Table structure is correct |
| Duplicate reminders today | **0** | No duplicates (good!) |

**If "Unique indexes on table" is NOT 4:**
- ❌ Migration was not run
- ✅ Run the migration immediately

**If "Duplicate reminders today" is NOT 0:**
- ❌ Duplicates exist in database
- ✅ Need to investigate why duplicate prevention failed

---

## 🐛 **POSSIBLE ROOT CAUSES**

### **Cause 1: Migration Not Run**

**Symptoms:**
- Unique indexes query returns less than 4 rows
- Document ID columns don't exist

**Fix:**
- Run `database/add_document_unique_indexes_to_reminder_logs.sql`

---

### **Cause 2: Timezone Issue in Duplicate Check**

**Problem:** The `hasReminderBeenSent()` function uses:
```typescript
const today = new Date().toISOString().split('T')[0];
```

This gets the date in **UTC**, but the database might be storing timestamps in a different timezone.

**Symptoms:**
- Duplicates appear in database
- Console shows "Sending reminder email" multiple times
- No "already sent today" messages in console

**Fix:** Need to ensure date comparison uses consistent timezone

---

### **Cause 3: Race Condition**

**Problem:** If two scheduler runs happen simultaneously (unlikely but possible), both might check the database before either has inserted the log entry.

**Symptoms:**
- Duplicates created within seconds of each other
- `time_between_duplicates` is very small (< 1 minute)

**Fix:** Database unique index should prevent this (if migration was run)

---

### **Cause 4: Database Query Not Finding Existing Logs**

**Problem:** The query in `hasReminderBeenSent()` might not be finding existing logs due to:
- Column name mismatch
- Date range issue
- Null value handling

**Symptoms:**
- Duplicates in database
- No "already sent today" messages in console
- Database has entries but application doesn't find them

**Fix:** Need to debug the query

---

## 🔧 **FIXES BASED ON INVESTIGATION**

### **Fix 1: If Migration Not Run**

**Run this in Supabase SQL Editor:**

```sql
-- Copy entire contents of database/add_document_unique_indexes_to_reminder_logs.sql
-- and paste here, then click Run
```

**Verify:**
```sql
SELECT COUNT(*) FROM pg_indexes
WHERE tablename = 'email_reminder_logs'
AND indexdef LIKE '%UNIQUE%';
-- Should return 4
```

---

### **Fix 2: If Timezone Issue**

**Problem:** Date comparison might be using different timezones

**Current code:**
```typescript
const today = new Date().toISOString().split('T')[0]; // UTC date
```

**Database query:**
```typescript
.gte('email_sent_at', `${today}T00:00:00`)  // UTC midnight
.lte('email_sent_at', `${today}T23:59:59`)  // UTC 23:59:59
```

**If your server is in a different timezone (e.g., UTC+4), this could cause issues.**

**Potential Fix:** Use database's CURRENT_DATE instead of JavaScript date

I can implement this fix if investigation confirms timezone is the issue.

---

### **Fix 3: If Existing Duplicates Need Cleanup**

**After fixing the root cause, clean up existing duplicates:**

```sql
-- Preview duplicates that would be deleted
WITH duplicates AS (
    SELECT
        id,
        service_billing_id,
        company_document_id,
        individual_document_id,
        employee_document_id,
        days_before_expiry,
        DATE(email_sent_at) as sent_date,
        email_sent_at,
        ROW_NUMBER() OVER (
            PARTITION BY
                COALESCE(service_billing_id::text, company_document_id::text,
                         individual_document_id::text, employee_document_id::text),
                days_before_expiry,
                DATE(email_sent_at)
            ORDER BY email_sent_at ASC
        ) as row_num
    FROM email_reminder_logs
)
SELECT * FROM duplicates WHERE row_num > 1;

-- If preview looks correct, delete duplicates (keep first one)
-- WITH duplicates AS (
--     SELECT
--         id,
--         ROW_NUMBER() OVER (
--             PARTITION BY
--                 COALESCE(service_billing_id::text, company_document_id::text,
--                          individual_document_id::text, employee_document_id::text),
--                 days_before_expiry,
--                 DATE(email_sent_at)
--             ORDER BY email_sent_at ASC
--         ) as row_num
--     FROM email_reminder_logs
-- )
-- DELETE FROM email_reminder_logs
-- WHERE id IN (SELECT id FROM duplicates WHERE row_num > 1);
```

---

## 📋 **ACTION PLAN**

### **Immediate Actions (Do Now):**

1. ✅ **Scheduler Disabled** - Already done
2. ⚠️ **Run Diagnostic Queries** - Use `database/DIAGNOSTIC_DUPLICATE_EMAILS.sql`
3. ⚠️ **Check Migration Status** - Verify unique indexes exist
4. ⚠️ **Check for Duplicates** - Find duplicate entries in database
5. ⚠️ **Review Console Logs** - Check if duplicate prevention is working

### **Based on Investigation Results:**

**Scenario A: Migration Not Run**
1. Run `database/add_document_unique_indexes_to_reminder_logs.sql`
2. Verify indexes created
3. Test with one manual reminder check
4. Re-enable scheduler if working

**Scenario B: Migration Run But Duplicates Still Occur**
1. Investigate timezone issue
2. Implement timezone fix if needed
3. Clean up existing duplicates
4. Test with one manual reminder check
5. Re-enable scheduler if working

**Scenario C: No Duplicates in Database But Receiving Duplicate Emails**
1. Check email service logs
2. Verify email service isn't sending duplicates
3. Check if multiple instances of app are running
4. Re-enable scheduler if database is clean

---

## 🧪 **TESTING BEFORE RE-ENABLING SCHEDULER**

**Before re-enabling the 5-minute scheduler:**

1. **Manual Test:**
   - Navigate to Service Expiry Reminder Manager
   - Click "Run Reminder Check Now"
   - Wait 1 minute
   - Click "Run Reminder Check Now" again
   - Verify: Second run shows "already sent today" messages
   - Verify: No duplicate emails received

2. **Database Verification:**
   ```sql
   -- Should show only 1 entry per service/document per interval per day
   SELECT
       COALESCE(service_billing_id::text, company_document_id::text,
                individual_document_id::text, employee_document_id::text) as item_id,
       days_before_expiry,
       DATE(email_sent_at) as sent_date,
       COUNT(*) as count
   FROM email_reminder_logs
   WHERE DATE(email_sent_at) = CURRENT_DATE
   GROUP BY
       COALESCE(service_billing_id::text, company_document_id::text,
                individual_document_id::text, employee_document_id::text),
       days_before_expiry,
       DATE(email_sent_at)
   ORDER BY count DESC;
   ```

3. **Console Log Verification:**
   - Check for "🔍 Duplicate check: Reminder already sent today" messages
   - Check for "✅ Reminder already sent today" messages
   - Should NOT see duplicate "📤 Sending reminder email" for same item

---

## 🔄 **RE-ENABLING THE SCHEDULER**

**Only after:**
- ✅ Migration verified as run
- ✅ No duplicates in database
- ✅ Manual test passes
- ✅ Console logs show duplicate prevention working

**To re-enable:**

1. Edit `src/App.tsx`
2. Uncomment the scheduler initialization code
3. Comment out the warning logs
4. Save and refresh application
5. Monitor console logs for 15-30 minutes
6. Verify no duplicates are created

---

## 📊 **SUMMARY**

### **What We Did:**

1. ✅ **Immediately disabled** the 5-minute scheduler
2. ✅ **Created diagnostic queries** to investigate the issue
3. ✅ **Provided step-by-step investigation guide**
4. ✅ **Identified possible root causes**
5. ✅ **Provided fixes for each scenario**

### **What You Need to Do:**

1. ⚠️ **Run the diagnostic queries** from `database/DIAGNOSTIC_DUPLICATE_EMAILS.sql`
2. ⚠️ **Report back the results** - especially:
   - How many unique indexes exist?
   - Are there duplicates in the database?
   - What do the console logs show?
3. ⚠️ **Based on results, we'll apply the appropriate fix**
4. ⚠️ **Test thoroughly before re-enabling scheduler**

### **Files Created:**

1. `database/DIAGNOSTIC_DUPLICATE_EMAILS.sql` - Comprehensive diagnostic queries
2. `URGENT_DUPLICATE_EMAIL_INVESTIGATION.md` - This investigation guide

### **Files Modified:**

1. `src/App.tsx` - Scheduler disabled with warning logs

**The scheduler is now DISABLED. Please run the diagnostic queries and report the results so we can identify and fix the root cause.** 🔍


