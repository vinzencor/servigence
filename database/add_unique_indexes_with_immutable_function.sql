-- ============================================================================
-- Add Unique Indexes for Duplicate Prevention (Service + Document Reminders)
-- ============================================================================
-- 
-- PURPOSE: Prevent duplicate reminder emails for both service and document expiries
-- 
-- ISSUE: PostgreSQL requires functions in index expressions to be marked IMMUTABLE
--        The built-in DATE() function is not marked as IMMUTABLE, so we need to
--        create our own immutable function for date extraction
--
-- SOLUTION: Create an immutable function and use it in unique indexes
-- ============================================================================

-- Step 1: Create an immutable function to extract date from timestamp
CREATE OR REPLACE FUNCTION immutable_date(timestamp with time zone)
RETURNS date
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT $1::date;
$$;

-- Step 2: Add document ID columns if they don't exist
ALTER TABLE email_reminder_logs 
ADD COLUMN IF NOT EXISTS company_document_id UUID REFERENCES company_documents(id) ON DELETE CASCADE;

ALTER TABLE email_reminder_logs 
ADD COLUMN IF NOT EXISTS individual_document_id UUID REFERENCES individual_documents(id) ON DELETE CASCADE;

ALTER TABLE email_reminder_logs 
ADD COLUMN IF NOT EXISTS employee_document_id UUID REFERENCES employee_documents(id) ON DELETE CASCADE;

ALTER TABLE email_reminder_logs 
ADD COLUMN IF NOT EXISTS document_title VARCHAR(255);

-- Step 3: Add regular indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_email_reminder_logs_company_document 
ON email_reminder_logs(company_document_id) 
WHERE company_document_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_reminder_logs_individual_document 
ON email_reminder_logs(individual_document_id) 
WHERE individual_document_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_reminder_logs_employee_document 
ON email_reminder_logs(employee_document_id) 
WHERE employee_document_id IS NOT NULL;

-- ============================================================================
-- Step 4: Create UNIQUE indexes for duplicate prevention
-- ============================================================================

-- 1. Unique index for SERVICE reminders
-- Prevents sending duplicate reminders for the same service on the same day
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_reminder_logs_unique_service_reminder 
ON email_reminder_logs(service_billing_id, days_before_expiry, immutable_date(email_sent_at))
WHERE service_billing_id IS NOT NULL;

-- 2. Unique index for COMPANY DOCUMENT reminders
-- Prevents sending duplicate reminders for the same company document on the same day
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_reminder_logs_unique_company_doc_reminder 
ON email_reminder_logs(company_document_id, days_before_expiry, immutable_date(email_sent_at))
WHERE company_document_id IS NOT NULL;

-- 3. Unique index for INDIVIDUAL DOCUMENT reminders
-- Prevents sending duplicate reminders for the same individual document on the same day
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_reminder_logs_unique_individual_doc_reminder 
ON email_reminder_logs(individual_document_id, days_before_expiry, immutable_date(email_sent_at))
WHERE individual_document_id IS NOT NULL;

-- 4. Unique index for EMPLOYEE DOCUMENT reminders
-- Prevents sending duplicate reminders for the same employee document on the same day
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_reminder_logs_unique_employee_doc_reminder 
ON email_reminder_logs(employee_document_id, days_before_expiry, immutable_date(email_sent_at))
WHERE employee_document_id IS NOT NULL;

-- ============================================================================
-- Step 5: Add documentation
-- ============================================================================

COMMENT ON FUNCTION immutable_date(timestamp with time zone) IS 'Immutable function to extract date from timestamp for use in indexes';

COMMENT ON COLUMN email_reminder_logs.company_document_id IS 'Reference to company document for company document expiry reminders';
COMMENT ON COLUMN email_reminder_logs.individual_document_id IS 'Reference to individual document for individual document expiry reminders';
COMMENT ON COLUMN email_reminder_logs.employee_document_id IS 'Reference to employee document for employee document expiry reminders';
COMMENT ON COLUMN email_reminder_logs.document_title IS 'Title of the document (denormalized for historical record)';

COMMENT ON INDEX idx_email_reminder_logs_unique_service_reminder IS 'Prevents sending duplicate reminders for the same service on the same day';
COMMENT ON INDEX idx_email_reminder_logs_unique_company_doc_reminder IS 'Prevents sending duplicate reminders for the same company document on the same day';
COMMENT ON INDEX idx_email_reminder_logs_unique_individual_doc_reminder IS 'Prevents sending duplicate reminders for the same individual document on the same day';
COMMENT ON INDEX idx_email_reminder_logs_unique_employee_doc_reminder IS 'Prevents sending duplicate reminders for the same employee document on the same day';

-- ============================================================================
-- Step 6: Verification
-- ============================================================================

-- Show all unique indexes on email_reminder_logs table
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'email_reminder_logs'
AND indexdef LIKE '%UNIQUE%'
ORDER BY indexname;

-- Expected Result: Should show 5 unique indexes:
-- 1. email_reminder_logs_pkey (primary key on id)
-- 2. idx_email_reminder_logs_unique_service_reminder
-- 3. idx_email_reminder_logs_unique_company_doc_reminder
-- 4. idx_email_reminder_logs_unique_individual_doc_reminder
-- 5. idx_email_reminder_logs_unique_employee_doc_reminder

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- 1. The immutable_date() function is marked IMMUTABLE, which tells PostgreSQL
--    that it will always return the same result for the same input. This allows
--    it to be used in index expressions.
--
-- 2. These unique indexes use partial indexes (WHERE clause) to only apply
--    when the document/service ID is NOT NULL. This allows the same table to 
--    handle both service reminders and document reminders without conflicts.
--
-- 3. The unique constraint is on (id, days_before_expiry, date)
--    which means:
--    - Same item + same interval + same day = DUPLICATE (prevented)
--    - Same item + different interval + same day = ALLOWED
--    - Same item + same interval + different day = ALLOWED
--
-- 4. This works in conjunction with the application-level checks in
--    hasReminderBeenSent() and hasDocumentReminderBeenSent() functions,
--    providing defense-in-depth (two-layer protection).
--
-- 5. If you try to insert a duplicate, you'll get an error like:
--    ERROR: duplicate key value violates unique constraint 
--    "idx_email_reminder_logs_unique_company_doc_reminder"
--
-- ============================================================================


