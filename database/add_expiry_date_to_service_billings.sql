-- Add expiry_date and renewal_date columns to service_billings table
-- This enables tracking service expiry dates for automated email reminders

-- Add expiry_date column
ALTER TABLE service_billings 
ADD COLUMN IF NOT EXISTS expiry_date DATE;

-- Add renewal_date column (when the service was last renewed)
ALTER TABLE service_billings 
ADD COLUMN IF NOT EXISTS renewal_date DATE;

-- Add reminder_sent column to track if reminder email was sent
ALTER TABLE service_billings 
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;

-- Add last_reminder_sent_at to track when the last reminder was sent
ALTER TABLE service_billings 
ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMP WITH TIME ZONE;

-- Create index for efficient expiry date queries
CREATE INDEX IF NOT EXISTS idx_service_billings_expiry_date 
ON service_billings(expiry_date) 
WHERE expiry_date IS NOT NULL;

-- Create index for reminder queries
CREATE INDEX IF NOT EXISTS idx_service_billings_reminder_pending 
ON service_billings(expiry_date, reminder_sent) 
WHERE expiry_date IS NOT NULL AND reminder_sent = FALSE;

-- Add comment for documentation
COMMENT ON COLUMN service_billings.expiry_date IS 'Date when the service expires and needs renewal';
COMMENT ON COLUMN service_billings.renewal_date IS 'Date when the service was last renewed';
COMMENT ON COLUMN service_billings.reminder_sent IS 'Flag to track if expiry reminder email was sent';
COMMENT ON COLUMN service_billings.last_reminder_sent_at IS 'Timestamp of the last reminder email sent';

