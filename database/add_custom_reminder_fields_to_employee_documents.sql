-- Add custom reminder fields to employee_documents table
-- This enables custom reminder intervals and dates for employee document expiry reminders

-- Add custom_reminder_intervals column to employee_documents table
ALTER TABLE employee_documents 
ADD COLUMN IF NOT EXISTS custom_reminder_intervals TEXT;

-- Add custom_reminder_dates column to employee_documents table
ALTER TABLE employee_documents 
ADD COLUMN IF NOT EXISTS custom_reminder_dates TEXT;

-- Add comments for documentation
COMMENT ON COLUMN employee_documents.custom_reminder_intervals IS 'Comma-separated list of days before expiry to send reminders (e.g., "30,15,7,3"). Overrides global settings if specified.';
COMMENT ON COLUMN employee_documents.custom_reminder_dates IS 'Comma-separated list of specific calendar dates to send reminders (e.g., "2025-02-15,2025-03-01"). Independent of expiry date.';

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    col_description('employee_documents'::regclass, ordinal_position) as description
FROM information_schema.columns 
WHERE table_name = 'employee_documents' 
AND column_name IN ('custom_reminder_intervals', 'custom_reminder_dates')
ORDER BY column_name;

-- Show sample of updated table structure
\d employee_documents;

