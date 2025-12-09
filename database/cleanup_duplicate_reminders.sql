-- ============================================================================
-- Cleanup Duplicate Reminder Logs
-- ============================================================================
-- 
-- PURPOSE: Remove duplicate reminder logs before creating unique indexes
-- 
-- ISSUE: Duplicate reminders exist in the database, preventing creation of
--        unique indexes. These duplicates were likely created due to race
--        conditions before the unique indexes were in place.
--
-- SOLUTION: Delete duplicate entries, keeping only the first one sent
-- ============================================================================

-- ============================================================================
-- STEP 1: Preview duplicates that will be deleted
-- ============================================================================

-- Preview duplicate SERVICE reminders
SELECT 
    id,
    service_billing_id,
    days_before_expiry,
    email_sent_at::date as sent_date,
    email_sent_at,
    recipient_email,
    ROW_NUMBER() OVER (
        PARTITION BY service_billing_id, days_before_expiry, email_sent_at::date
        ORDER BY email_sent_at ASC
    ) as row_num
FROM email_reminder_logs
WHERE service_billing_id IS NOT NULL
ORDER BY service_billing_id, days_before_expiry, email_sent_at::date, email_sent_at;

-- Rows with row_num > 1 will be deleted


-- Preview duplicate COMPANY DOCUMENT reminders
SELECT 
    id,
    company_document_id,
    days_before_expiry,
    email_sent_at::date as sent_date,
    email_sent_at,
    recipient_email,
    ROW_NUMBER() OVER (
        PARTITION BY company_document_id, days_before_expiry, email_sent_at::date
        ORDER BY email_sent_at ASC
    ) as row_num
FROM email_reminder_logs
WHERE company_document_id IS NOT NULL
ORDER BY company_document_id, days_before_expiry, email_sent_at::date, email_sent_at;


-- Preview duplicate INDIVIDUAL DOCUMENT reminders
SELECT 
    id,
    individual_document_id,
    days_before_expiry,
    email_sent_at::date as sent_date,
    email_sent_at,
    recipient_email,
    ROW_NUMBER() OVER (
        PARTITION BY individual_document_id, days_before_expiry, email_sent_at::date
        ORDER BY email_sent_at ASC
    ) as row_num
FROM email_reminder_logs
WHERE individual_document_id IS NOT NULL
ORDER BY individual_document_id, days_before_expiry, email_sent_at::date, email_sent_at;


-- Preview duplicate EMPLOYEE DOCUMENT reminders
SELECT 
    id,
    employee_document_id,
    days_before_expiry,
    email_sent_at::date as sent_date,
    email_sent_at,
    recipient_email,
    ROW_NUMBER() OVER (
        PARTITION BY employee_document_id, days_before_expiry, email_sent_at::date
        ORDER BY email_sent_at ASC
    ) as row_num
FROM email_reminder_logs
WHERE employee_document_id IS NOT NULL
ORDER BY employee_document_id, days_before_expiry, email_sent_at::date, email_sent_at;


-- ============================================================================
-- STEP 2: Count how many duplicates will be deleted
-- ============================================================================

-- Count duplicate SERVICE reminders
SELECT COUNT(*) as service_duplicates_to_delete
FROM (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY service_billing_id, days_before_expiry, email_sent_at::date
            ORDER BY email_sent_at ASC
        ) as row_num
    FROM email_reminder_logs
    WHERE service_billing_id IS NOT NULL
) duplicates
WHERE row_num > 1;


-- Count duplicate DOCUMENT reminders (all types)
SELECT COUNT(*) as document_duplicates_to_delete
FROM (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY 
                COALESCE(company_document_id::text, individual_document_id::text, employee_document_id::text),
                days_before_expiry, 
                email_sent_at::date
            ORDER BY email_sent_at ASC
        ) as row_num
    FROM email_reminder_logs
    WHERE company_document_id IS NOT NULL 
       OR individual_document_id IS NOT NULL 
       OR employee_document_id IS NOT NULL
) duplicates
WHERE row_num > 1;


-- ============================================================================
-- STEP 3: Delete duplicates (KEEP FIRST, DELETE REST)
-- ============================================================================

-- Delete duplicate SERVICE reminders (keep first one sent)
WITH duplicates AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY service_billing_id, days_before_expiry, email_sent_at::date
            ORDER BY email_sent_at ASC
        ) as row_num
    FROM email_reminder_logs
    WHERE service_billing_id IS NOT NULL
)
DELETE FROM email_reminder_logs
WHERE id IN (SELECT id FROM duplicates WHERE row_num > 1);

-- This will return the number of rows deleted


-- Delete duplicate COMPANY DOCUMENT reminders (keep first one sent)
WITH duplicates AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY company_document_id, days_before_expiry, email_sent_at::date
            ORDER BY email_sent_at ASC
        ) as row_num
    FROM email_reminder_logs
    WHERE company_document_id IS NOT NULL
)
DELETE FROM email_reminder_logs
WHERE id IN (SELECT id FROM duplicates WHERE row_num > 1);


-- Delete duplicate INDIVIDUAL DOCUMENT reminders (keep first one sent)
WITH duplicates AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY individual_document_id, days_before_expiry, email_sent_at::date
            ORDER BY email_sent_at ASC
        ) as row_num
    FROM email_reminder_logs
    WHERE individual_document_id IS NOT NULL
)
DELETE FROM email_reminder_logs
WHERE id IN (SELECT id FROM duplicates WHERE row_num > 1);


-- Delete duplicate EMPLOYEE DOCUMENT reminders (keep first one sent)
WITH duplicates AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY employee_document_id, days_before_expiry, email_sent_at::date
            ORDER BY email_sent_at ASC
        ) as row_num
    FROM email_reminder_logs
    WHERE employee_document_id IS NOT NULL
)
DELETE FROM email_reminder_logs
WHERE id IN (SELECT id FROM duplicates WHERE row_num > 1);


-- ============================================================================
-- STEP 4: Verify cleanup
-- ============================================================================

-- Verify no duplicates remain
SELECT 
    'Service duplicates remaining' as check_name,
    COUNT(*) as count
FROM (
    SELECT 
        service_billing_id, 
        days_before_expiry, 
        email_sent_at::date,
        COUNT(*) as cnt
    FROM email_reminder_logs
    WHERE service_billing_id IS NOT NULL
    GROUP BY service_billing_id, days_before_expiry, email_sent_at::date
    HAVING COUNT(*) > 1
) duplicates

UNION ALL

SELECT 
    'Document duplicates remaining' as check_name,
    COUNT(*) as count
FROM (
    SELECT 
        COALESCE(company_document_id::text, individual_document_id::text, employee_document_id::text) as doc_id,
        days_before_expiry, 
        email_sent_at::date,
        COUNT(*) as cnt
    FROM email_reminder_logs
    WHERE company_document_id IS NOT NULL 
       OR individual_document_id IS NOT NULL 
       OR employee_document_id IS NOT NULL
    GROUP BY 
        COALESCE(company_document_id::text, individual_document_id::text, employee_document_id::text),
        days_before_expiry, 
        email_sent_at::date
    HAVING COUNT(*) > 1
) duplicates;

-- Expected Result: Both counts should be 0

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- 1. This script keeps the FIRST reminder sent and deletes subsequent duplicates
-- 2. The ROW_NUMBER() function assigns row_num = 1 to the first (earliest) entry
-- 3. We delete all entries where row_num > 1 (duplicates)
-- 4. This is safe because we're only removing duplicate log entries, not actual data
-- 5. After cleanup, you can proceed to create the unique indexes
--
-- ============================================================================


