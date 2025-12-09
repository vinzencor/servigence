-- ============================================================================
-- VERIFICATION QUERIES BEFORE RE-ENABLING SCHEDULER
-- ============================================================================
-- 
-- PURPOSE: Verify all duplicate prevention mechanisms are in place
-- RUN THESE QUERIES BEFORE RE-ENABLING THE 5-MINUTE SCHEDULER
-- 
-- ============================================================================

-- ============================================================================
-- VERIFICATION 1: CHECK UNIQUE INDEXES EXIST
-- ============================================================================

-- Query 1.1: Count unique indexes (MUST return 4)
SELECT COUNT(*) as unique_index_count
FROM pg_indexes
WHERE tablename = 'email_reminder_logs'
AND indexdef LIKE '%UNIQUE%';

-- Expected Result: 4
-- If NOT 4, run: database/add_document_unique_indexes_to_reminder_logs.sql


-- Query 1.2: List all unique indexes (verify details)
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'email_reminder_logs'
AND indexdef LIKE '%UNIQUE%'
ORDER BY indexname;

-- Expected Result: Should see these 4 indexes:
-- 1. idx_email_reminder_logs_unique_reminder
--    (service_billing_id, days_before_expiry, DATE(email_sent_at))
-- 2. idx_email_reminder_logs_unique_company_doc_reminder
--    (company_document_id, days_before_expiry, DATE(email_sent_at))
-- 3. idx_email_reminder_logs_unique_individual_doc_reminder
--    (individual_document_id, days_before_expiry, DATE(email_sent_at))
-- 4. idx_email_reminder_logs_unique_employee_doc_reminder
--    (employee_document_id, days_before_expiry, DATE(email_sent_at))


-- ============================================================================
-- VERIFICATION 2: CHECK FOR EXISTING DUPLICATES TODAY
-- ============================================================================

-- Query 2.1: Count duplicates today (MUST return 0)
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

-- Expected Result: 0
-- If NOT 0, there are duplicates that need investigation


-- Query 2.2: View duplicate details (if any exist)
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

-- If this returns rows, investigate before re-enabling scheduler


-- ============================================================================
-- VERIFICATION 3: CHECK TABLE STRUCTURE
-- ============================================================================

-- Query 3.1: Verify document ID columns exist (MUST return 3)
SELECT COUNT(*) as document_column_count
FROM information_schema.columns
WHERE table_name = 'email_reminder_logs'
AND column_name IN ('company_document_id', 'individual_document_id', 'employee_document_id');

-- Expected Result: 3
-- If NOT 3, the table structure is incorrect


-- ============================================================================
-- VERIFICATION 4: COMPREHENSIVE SUMMARY
-- ============================================================================

-- Query 4.1: Complete verification summary
SELECT 
    'Unique indexes on table' as check_name,
    (SELECT COUNT(*)::text FROM pg_indexes
     WHERE tablename = 'email_reminder_logs'
     AND indexdef LIKE '%UNIQUE%') as actual_value,
    '4' as expected_value,
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_indexes
              WHERE tablename = 'email_reminder_logs'
              AND indexdef LIKE '%UNIQUE%') = 4 
        THEN '✅ PASS' 
        ELSE '❌ FAIL' 
    END as status

UNION ALL

SELECT 
    'Document ID columns exist' as check_name,
    (SELECT COUNT(*)::text FROM information_schema.columns
     WHERE table_name = 'email_reminder_logs'
     AND column_name IN ('company_document_id', 'individual_document_id', 'employee_document_id')) as actual_value,
    '3' as expected_value,
    CASE 
        WHEN (SELECT COUNT(*) FROM information_schema.columns
              WHERE table_name = 'email_reminder_logs'
              AND column_name IN ('company_document_id', 'individual_document_id', 'employee_document_id')) = 3 
        THEN '✅ PASS' 
        ELSE '❌ FAIL' 
    END as status

UNION ALL

SELECT 
    'Duplicate reminders today' as check_name,
    (SELECT COUNT(*)::text FROM (
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
    ) duplicates) as actual_value,
    '0' as expected_value,
    CASE 
        WHEN (SELECT COUNT(*) FROM (
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
        ) duplicates) = 0 
        THEN '✅ PASS' 
        ELSE '❌ FAIL' 
    END as status;

-- ============================================================================
-- DECISION: SAFE TO RE-ENABLE SCHEDULER?
-- ============================================================================

-- If ALL checks show "✅ PASS", it is SAFE to re-enable the scheduler
-- If ANY check shows "❌ FAIL", DO NOT re-enable until issue is fixed


