# 🚨 Quick Diagnostic Checklist - Duplicate Emails

## ✅ SCHEDULER STATUS: DISABLED

The 5-minute automated scheduler has been **DISABLED** in `src/App.tsx`.

---

## 🔍 QUICK DIAGNOSTIC STEPS

### **Step 1: Check Migration Status (30 seconds)**

**Run in Supabase SQL Editor:**

```sql
SELECT COUNT(*) as unique_index_count
FROM pg_indexes
WHERE tablename = 'email_reminder_logs'
AND indexdef LIKE '%UNIQUE%';
```

**Expected:** `4`

**If NOT 4:**
- ❌ Migration not run
- ✅ **FIX:** Run `database/add_document_unique_indexes_to_reminder_logs.sql`

---

### **Step 2: Check for Duplicates Today (30 seconds)**

**Run in Supabase SQL Editor:**

```sql
SELECT COUNT(*) as duplicate_count
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

**Expected:** `0`

**If NOT 0:**
- ❌ Duplicates exist in database
- ✅ **FIX:** Need to investigate why duplicate prevention failed

---

### **Step 3: View Duplicate Details (if any exist)**

**Run in Supabase SQL Editor:**

```sql
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
    COUNT(*) as duplicate_count,
    MIN(email_sent_at) as first_sent,
    MAX(email_sent_at) as last_sent,
    MAX(email_sent_at) - MIN(email_sent_at) as time_between
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
    days_before_expiry
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;
```

**Note the `time_between` column:**
- If < 1 minute: Possible race condition
- If ~5 minutes: Scheduler running despite being disabled (check browser)
- If random: Different issue

---

## 🎯 QUICK DECISION TREE

```
┌─────────────────────────────────────┐
│ Run Step 1: Check Migration Status │
└─────────────────────────────────────┘
                 ↓
         ┌───────┴───────┐
         │               │
    Count = 4       Count ≠ 4
         │               │
         ↓               ↓
    ┌────────┐    ┌──────────────┐
    │ GOOD   │    │ RUN MIGRATION│
    └────────┘    └──────────────┘
         │               │
         ↓               ↓
┌─────────────────────────────────────┐
│ Run Step 2: Check for Duplicates   │
└─────────────────────────────────────┘
                 ↓
         ┌───────┴───────┐
         │               │
    Count = 0       Count > 0
         │               │
         ↓               ↓
    ┌────────┐    ┌──────────────────┐
    │ GOOD   │    │ INVESTIGATE CAUSE│
    │ RE-TEST│    │ (Run Step 3)     │
    └────────┘    └──────────────────┘
```

---

## 🔧 QUICK FIXES

### **Fix 1: Migration Not Run**

```sql
-- Run this entire file in Supabase SQL Editor:
-- database/add_document_unique_indexes_to_reminder_logs.sql
```

### **Fix 2: Clean Up Existing Duplicates**

**⚠️ Only run AFTER fixing root cause!**

```sql
-- Preview what will be deleted
WITH duplicates AS (
    SELECT 
        id,
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
SELECT COUNT(*) as will_be_deleted FROM duplicates WHERE row_num > 1;

-- If count looks correct, uncomment and run:
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

## ✅ RE-ENABLE SCHEDULER CHECKLIST

**Before re-enabling, verify:**

- [ ] Migration run (4 unique indexes exist)
- [ ] No duplicates in database (count = 0)
- [ ] Manual test passed (run reminder check twice, second shows "already sent")
- [ ] Console logs show duplicate prevention working

**To re-enable:**

1. Edit `src/App.tsx`
2. Uncomment lines 57-69 (scheduler initialization)
3. Comment out lines 72-78 (warning logs)
4. Save and refresh

---

## 📞 REPORT RESULTS

**Please report:**

1. **Migration Status:** How many unique indexes? (Expected: 4)
2. **Duplicate Count:** How many duplicates today? (Expected: 0)
3. **Duplicate Details:** If duplicates exist, what's the time_between value?
4. **Console Logs:** Do you see "already sent today" messages?

**Based on your results, we'll apply the appropriate fix.**


