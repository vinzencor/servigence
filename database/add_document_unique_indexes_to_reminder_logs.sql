-- ============================================================================
-- Add Unique Indexes for Document Reminders to Prevent Duplicates
-- ============================================================================
-- 
-- PURPOSE: Prevent duplicate reminder emails for document expiries
-- 
-- ISSUE: The email_reminder_logs table has a unique index for service_billing_id
--        to prevent duplicate service reminders, but is missing similar unique
--        indexes for company_document_id, individual_document_id, and 
--        employee_document_id. This means document reminders could potentially
--        be sent multiple times on the same day.
--
-- FIX: Add unique partial indexes for each document type to enforce
--      database-level duplicate prevention
-- ============================================================================

-- First, add the missing document ID columns if they don't exist
-- (These should already exist from previous migrations, but adding for safety)

ALTER TABLE email_reminder_logs 
ADD COLUMN IF NOT EXISTS company_document_id UUID REFERENCES company_documents(id) ON DELETE CASCADE;

ALTER TABLE email_reminder_logs 
ADD COLUMN IF NOT EXISTS individual_document_id UUID REFERENCES individual_documents(id) ON DELETE CASCADE;

ALTER TABLE email_reminder_logs 
ADD COLUMN IF NOT EXISTS employee_document_id UUID REFERENCES employee_documents(id) ON DELETE CASCADE;

ALTER TABLE email_reminder_logs 
ADD COLUMN IF NOT EXISTS document_title VARCHAR(255);

-- Add indexes for efficient document queries (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_email_reminder_logs_company_document 
ON email_reminder_logs(company_document_id) 
WHERE company_document_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_reminder_logs_individual_document 
ON email_reminder_logs(individual_document_id) 
WHERE individual_document_id IS NOT NULL;

-- ============================================================================
-- UNIQUE INDEXES FOR DUPLICATE PREVENTION
-- ============================================================================

-- 1. Unique index for COMPANY DOCUMENT reminders
-- Prevents sending duplicate reminders for the same company document on the same day
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_reminder_logs_unique_company_doc_reminder 
ON email_reminder_logs(company_document_id, days_before_expiry, DATE(email_sent_at))
WHERE company_document_id IS NOT NULL;

-- 2. Unique index for INDIVIDUAL DOCUMENT reminders
-- Prevents sending duplicate reminders for the same individual document on the same day
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_reminder_logs_unique_individual_doc_reminder 
ON email_reminder_logs(individual_document_id, days_before_expiry, DATE(email_sent_at))
WHERE individual_document_id IS NOT NULL;

-- 3. Unique index for EMPLOYEE DOCUMENT reminders
-- Prevents sending duplicate reminders for the same employee document on the same day
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_reminder_logs_unique_employee_doc_reminder 
ON email_reminder_logs(employee_document_id, days_before_expiry, DATE(email_sent_at))
WHERE employee_document_id IS NOT NULL;

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN email_reminder_logs.company_document_id IS 'Reference to company document for company document expiry reminders';
COMMENT ON COLUMN email_reminder_logs.individual_document_id IS 'Reference to individual document for individual document expiry reminders';
COMMENT ON COLUMN email_reminder_logs.employee_document_id IS 'Reference to employee document for employee document expiry reminders';
COMMENT ON COLUMN email_reminder_logs.document_title IS 'Title of the document (denormalized for historical record)';

COMMENT ON INDEX idx_email_reminder_logs_unique_company_doc_reminder IS 'Prevents sending duplicate reminders for the same company document on the same day';
COMMENT ON INDEX idx_email_reminder_logs_unique_individual_doc_reminder IS 'Prevents sending duplicate reminders for the same individual document on the same day';
COMMENT ON INDEX idx_email_reminder_logs_unique_employee_doc_reminder IS 'Prevents sending duplicate reminders for the same employee document on the same day';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Show all unique indexes on email_reminder_logs table
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'email_reminder_logs'
AND indexdef LIKE '%UNIQUE%'
ORDER BY indexname;

-- Show all columns in email_reminder_logs table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'email_reminder_logs' 
AND column_name LIKE '%document%'
ORDER BY column_name;

-- ============================================================================
-- TESTING
-- ============================================================================

-- Test 1: Try to insert duplicate service reminder (should fail)
-- INSERT INTO email_reminder_logs (service_billing_id, days_before_expiry, recipient_email, expiry_date)
-- VALUES ('same-id', 30, 'test@example.com', '2025-12-31');
-- INSERT INTO email_reminder_logs (service_billing_id, days_before_expiry, recipient_email, expiry_date)
-- VALUES ('same-id', 30, 'test@example.com', '2025-12-31');
-- Expected: ERROR - duplicate key value violates unique constraint

-- Test 2: Try to insert duplicate company document reminder (should fail)
-- INSERT INTO email_reminder_logs (company_document_id, days_before_expiry, recipient_email, expiry_date, reminder_type)
-- VALUES ('same-doc-id', 30, 'test@example.com', '2025-12-31', 'document_expiry');
-- INSERT INTO email_reminder_logs (company_document_id, days_before_expiry, recipient_email, expiry_date, reminder_type)
-- VALUES ('same-doc-id', 30, 'test@example.com', '2025-12-31', 'document_expiry');
-- Expected: ERROR - duplicate key value violates unique constraint

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- 1. These unique indexes use partial indexes (WHERE clause) to only apply
--    when the document ID is NOT NULL. This allows the same table to handle
--    both service reminders and document reminders without conflicts.
--
-- 2. The unique constraint is on (document_id, days_before_expiry, DATE(email_sent_at))
--    which means:
--    - Same document + same interval + same day = DUPLICATE (prevented)
--    - Same document + different interval + same day = ALLOWED
--    - Same document + same interval + different day = ALLOWED
--
-- 3. This works in conjunction with the application-level checks in
--    hasDocumentReminderBeenSent() function, providing defense-in-depth.
--
-- 4. If you try to insert a duplicate, you'll get an error like:
--    ERROR: duplicate key value violates unique constraint 
--    "idx_email_reminder_logs_unique_company_doc_reminder"
--
-- ============================================================================

