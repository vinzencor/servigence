-- Add employee document support to email_reminder_logs table
-- This enables tracking reminder emails sent for employee document expiries

-- Add employee_document_id column to email_reminder_logs table
ALTER TABLE email_reminder_logs 
ADD COLUMN IF NOT EXISTS employee_document_id UUID REFERENCES employee_documents(id) ON DELETE CASCADE;

-- Add employee_id column to email_reminder_logs table
ALTER TABLE email_reminder_logs 
ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id) ON DELETE SET NULL;

-- Create index for efficient employee document queries
CREATE INDEX IF NOT EXISTS idx_email_reminder_logs_employee_document 
ON email_reminder_logs(employee_document_id) 
WHERE employee_document_id IS NOT NULL;

-- Create index for efficient employee queries
CREATE INDEX IF NOT EXISTS idx_email_reminder_logs_employee 
ON email_reminder_logs(employee_id) 
WHERE employee_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN email_reminder_logs.employee_document_id IS 'Reference to employee document for employee document expiry reminders';
COMMENT ON COLUMN email_reminder_logs.employee_id IS 'Reference to employee for employee document expiry reminders';

-- Update recipient_type check constraint to include 'employee'
ALTER TABLE email_reminder_logs 
DROP CONSTRAINT IF EXISTS email_reminder_logs_recipient_type_check;

ALTER TABLE email_reminder_logs 
ADD CONSTRAINT email_reminder_logs_recipient_type_check 
CHECK (recipient_type IN ('company', 'individual', 'employee'));

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'email_reminder_logs' 
AND column_name IN ('employee_document_id', 'employee_id')
ORDER BY column_name;

-- Show sample of updated table structure
\d email_reminder_logs;

