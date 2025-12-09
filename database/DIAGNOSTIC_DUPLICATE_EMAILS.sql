-- ============================================================================
-- DIAGNOSTIC QUERIES FOR DUPLICATE EMAIL INVESTIGATION
-- ============================================================================
-- 
-- PURPOSE: Investigate duplicate reminder emails issue
-- 
-- RUN THESE QUERIES IN ORDER TO DIAGNOSE THE PROBLEM
-- ============================================================================

-- ============================================================================
-- STEP 1: CHECK IF UNIQUE INDEXES EXIST
-- ============================================================================

-- Query 1.1: List ALL unique indexes on email_reminder_logs table
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'email_reminder_logs'
AND indexdef LIKE '%UNIQUE%'
ORDER BY indexname;

-- Expected Result: Should see 4 unique indexes:
-- 1. idx_email_reminder_logs_unique_reminder (service reminders)
-- 2. idx_email_reminder_logs_unique_company_doc_reminder (company documents)
-- 3. idx_email_reminder_logs_unique_individual_doc_reminder (individual documents)
-- 4. idx_email_reminder_logs_unique_employee_doc_reminder (employee documents)

-- If you see LESS than 4 indexes, the migration was NOT run successfully!


-- ============================================================================
-- STEP 2: CHECK FOR DUPLICATE ENTRIES IN DATABASE
-- ============================================================================

-- Query 2.1: Find duplicate SERVICE reminders sent today
SELECT 
    service_billing_id,
    days_before_expiry,
    DATE(email_sent_at) as sent_date,
    COUNT(*) as duplicate_count,
    STRING_AGG(id::text, ', ') as log_ids,
    STRING_AGG(email_sent_at::text, ', ') as sent_times
FROM email_reminder_logs
WHERE service_billing_id IS NOT NULL
AND DATE(email_sent_at) = CURRENT_DATE
GROUP BY 
    service_billing_id,
    days_before_expiry,
    DATE(email_sent_at)
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- If this returns rows, you have duplicate SERVICE reminders!


-- Query 2.2: Find duplicate COMPANY DOCUMENT reminders sent today
SELECT 
    company_document_id,
    days_before_expiry,
    DATE(email_sent_at) as sent_date,
    COUNT(*) as duplicate_count,
    STRING_AGG(id::text, ', ') as log_ids,
    STRING_AGG(email_sent_at::text, ', ') as sent_times
FROM email_reminder_logs
WHERE company_document_id IS NOT NULL
AND DATE(email_sent_at) = CURRENT_DATE
GROUP BY 
    company_document_id,
    days_before_expiry,
    DATE(email_sent_at)
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- If this returns rows, you have duplicate COMPANY DOCUMENT reminders!


-- Query 2.3: Find duplicate INDIVIDUAL DOCUMENT reminders sent today
SELECT 
    individual_document_id,
    days_before_expiry,
    DATE(email_sent_at) as sent_date,
    COUNT(*) as duplicate_count,
    STRING_AGG(id::text, ', ') as log_ids,
    STRING_AGG(email_sent_at::text, ', ') as sent_times
FROM email_reminder_logs
WHERE individual_document_id IS NOT NULL
AND DATE(email_sent_at) = CURRENT_DATE
GROUP BY 
    individual_document_id,
    days_before_expiry,
    DATE(email_sent_at)
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- If this returns rows, you have duplicate INDIVIDUAL DOCUMENT reminders!


-- Query 2.4: Find duplicate EMPLOYEE DOCUMENT reminders sent today
SELECT 
    employee_document_id,
    days_before_expiry,
    DATE(email_sent_at) as sent_date,
    COUNT(*) as duplicate_count,
    STRING_AGG(id::text, ', ') as log_ids,
    STRING_AGG(email_sent_at::text, ', ') as sent_times
FROM email_reminder_logs
WHERE employee_document_id IS NOT NULL
AND DATE(email_sent_at) = CURRENT_DATE
GROUP BY 
    employee_document_id,
    days_before_expiry,
    DATE(email_sent_at)
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- If this returns rows, you have duplicate EMPLOYEE DOCUMENT reminders!


-- ============================================================================
-- STEP 3: CHECK ALL REMINDERS SENT TODAY
-- ============================================================================

-- Query 3.1: View all reminders sent today (grouped by type)
SELECT 
    reminder_type,
    COUNT(*) as total_sent,
    COUNT(DISTINCT service_billing_id) as unique_services,
    COUNT(DISTINCT company_document_id) as unique_company_docs,
    COUNT(DISTINCT individual_document_id) as unique_individual_docs,
    COUNT(DISTINCT employee_document_id) as unique_employee_docs
FROM email_reminder_logs
WHERE DATE(email_sent_at) = CURRENT_DATE
GROUP BY reminder_type
ORDER BY reminder_type;


-- Query 3.2: View detailed list of all reminders sent today
SELECT 
    id,
    reminder_type,
    service_billing_id,
    company_document_id,
    individual_document_id,
    employee_document_id,
    days_before_expiry,
    recipient_email,
    email_subject,
    email_status,
    email_sent_at
FROM email_reminder_logs
WHERE DATE(email_sent_at) = CURRENT_DATE
ORDER BY email_sent_at DESC
LIMIT 100;


-- ============================================================================
-- STEP 4: CHECK TABLE STRUCTURE
-- ============================================================================

-- Query 4.1: Verify all required columns exist
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'email_reminder_logs' 
ORDER BY ordinal_position;


-- Query 4.2: Check all constraints on the table
SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'email_reminder_logs'::regclass
ORDER BY conname;


-- ============================================================================
-- STEP 5: FIND RECENT DUPLICATES (LAST 7 DAYS)
-- ============================================================================

-- Query 5.1: Find ALL duplicates in the last 7 days
SELECT
    COALESCE(service_billing_id::text, company_document_id::text, individual_document_id::text, employee_document_id::text) as item_id,
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
WHERE email_sent_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY
    COALESCE(service_billing_id::text, company_document_id::text, individual_document_id::text, employee_document_id::text),
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


-- ============================================================================
-- STEP 6: CLEANUP DUPLICATES (RUN ONLY AFTER INVESTIGATION)
-- ============================================================================

-- ⚠️ WARNING: DO NOT RUN THIS UNTIL YOU'VE INVESTIGATED THE CAUSE!
-- This will delete duplicate entries, keeping only the first one sent

-- Query 6.1: Preview duplicates that would be deleted (SERVICE reminders)
-- WITH duplicates AS (
--     SELECT
--         id,
--         service_billing_id,
--         days_before_expiry,
--         DATE(email_sent_at) as sent_date,
--         email_sent_at,
--         ROW_NUMBER() OVER (
--             PARTITION BY service_billing_id, days_before_expiry, DATE(email_sent_at)
--             ORDER BY email_sent_at ASC
--         ) as row_num
--     FROM email_reminder_logs
--     WHERE service_billing_id IS NOT NULL
-- )
-- SELECT * FROM duplicates WHERE row_num > 1;

-- Query 6.2: Delete duplicate SERVICE reminders (keep first one)
-- ⚠️ UNCOMMENT AND RUN ONLY AFTER VERIFICATION
-- WITH duplicates AS (
--     SELECT
--         id,
--         ROW_NUMBER() OVER (
--             PARTITION BY service_billing_id, days_before_expiry, DATE(email_sent_at)
--             ORDER BY email_sent_at ASC
--         ) as row_num
--     FROM email_reminder_logs
--     WHERE service_billing_id IS NOT NULL
-- )
-- DELETE FROM email_reminder_logs
-- WHERE id IN (SELECT id FROM duplicates WHERE row_num > 1);


-- ============================================================================
-- STEP 7: VERIFY MIGRATION WAS RUN
-- ============================================================================

-- Query 7.1: Check if document ID columns exist
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'email_reminder_logs'
AND column_name IN ('company_document_id', 'individual_document_id', 'employee_document_id')
ORDER BY column_name;

-- Expected: Should return 3 rows
-- If it returns 0 rows, the migration was NEVER run!


-- ============================================================================
-- DIAGNOSTIC SUMMARY
-- ============================================================================

-- Run this query to get a complete summary
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
        COALESCE(service_billing_id::text, company_document_id::text, individual_document_id::text, employee_document_id::text) as item_id,
        days_before_expiry,
        DATE(email_sent_at) as sent_date,
        COUNT(*) as cnt
    FROM email_reminder_logs
    WHERE DATE(email_sent_at) = CURRENT_DATE
    GROUP BY
        COALESCE(service_billing_id::text, company_document_id::text, individual_document_id::text, employee_document_id::text),
        days_before_expiry,
        DATE(email_sent_at)
    HAVING COUNT(*) > 1
) duplicates;


