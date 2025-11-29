-- ============================================================================
-- SERVICE EXPIRY REMINDER SYSTEM - COMPLETE SETUP SCRIPT
-- ============================================================================
-- This script sets up all necessary database tables and configurations
-- for the automated service expiry reminder system.
--
-- Run this script in your Supabase SQL Editor to set up the system.
-- ============================================================================

-- ============================================================================
-- STEP 1: Add expiry_date and related columns to service_billings table
-- ============================================================================

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

-- Add comments for documentation
COMMENT ON COLUMN service_billings.expiry_date IS 'Date when the service expires and needs renewal';
COMMENT ON COLUMN service_billings.renewal_date IS 'Date when the service was last renewed';
COMMENT ON COLUMN service_billings.reminder_sent IS 'Flag to track if expiry reminder email was sent';
COMMENT ON COLUMN service_billings.last_reminder_sent_at IS 'Timestamp of the last reminder email sent';

-- ============================================================================
-- STEP 2: Create email_reminder_settings table
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_reminder_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- General settings
    enabled BOOLEAN DEFAULT TRUE,
    reminder_type VARCHAR(50) DEFAULT 'service_expiry' CHECK (reminder_type IN ('service_expiry', 'document_expiry', 'payment_due')),
    
    -- Reminder intervals (days before expiry)
    reminder_intervals INTEGER[] DEFAULT ARRAY[30, 15, 7, 3, 1], -- Send reminders at these intervals
    
    -- Email template customization
    email_subject VARCHAR(255) DEFAULT 'Service Expiry Reminder - {{service_name}}',
    email_template TEXT DEFAULT 'Your service {{service_name}} will expire on {{expiry_date}}. Please renew to continue service.',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100) DEFAULT 'System',
    updated_by VARCHAR(100)
);

-- Create default settings for service expiry reminders
INSERT INTO email_reminder_settings (reminder_type, enabled, reminder_intervals, email_subject, email_template)
VALUES (
    'service_expiry',
    TRUE,
    ARRAY[30, 15, 7, 3, 1],
    'Service Expiry Reminder - {{service_name}}',
    'Dear {{client_name}},

This is a friendly reminder that your service "{{service_name}}" will expire on {{expiry_date}} (in {{days_until_expiry}} days).

Service Details:
- Service: {{service_name}}
- Invoice Number: {{invoice_number}}
- Expiry Date: {{expiry_date}}
- Total Amount: AED {{total_amount}}

Please contact us to renew your service before the expiry date to avoid any service interruption.

Thank you for choosing Servigens Business Group.

Best regards,
The Servigens Team'
)
ON CONFLICT DO NOTHING;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_reminder_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_email_reminder_settings_updated_at
    BEFORE UPDATE ON email_reminder_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_email_reminder_settings_updated_at();

-- Add comment for documentation
COMMENT ON TABLE email_reminder_settings IS 'Stores admin configuration for automated email reminder intervals and templates';

-- ============================================================================
-- STEP 3: Create email_reminder_logs table
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_reminder_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Reference to the service billing
    service_billing_id UUID REFERENCES service_billings(id) ON DELETE CASCADE,
    
    -- Recipient information
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    recipient_type VARCHAR(20) CHECK (recipient_type IN ('company', 'individual')),
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    individual_id UUID REFERENCES individuals(id) ON DELETE SET NULL,
    
    -- Reminder details
    reminder_type VARCHAR(50) DEFAULT 'service_expiry',
    days_before_expiry INTEGER NOT NULL,
    expiry_date DATE NOT NULL,
    
    -- Email details
    email_subject VARCHAR(255),
    email_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    email_status VARCHAR(20) DEFAULT 'sent' CHECK (email_status IN ('sent', 'failed', 'pending')),
    error_message TEXT,
    
    -- Service details (denormalized for historical record)
    service_name VARCHAR(255),
    invoice_number VARCHAR(100),
    total_amount DECIMAL(10,2),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_email_reminder_logs_service_billing 
ON email_reminder_logs(service_billing_id);

CREATE INDEX IF NOT EXISTS idx_email_reminder_logs_company 
ON email_reminder_logs(company_id) 
WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_reminder_logs_individual 
ON email_reminder_logs(individual_id) 
WHERE individual_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_reminder_logs_expiry_date 
ON email_reminder_logs(expiry_date);

CREATE INDEX IF NOT EXISTS idx_email_reminder_logs_sent_at 
ON email_reminder_logs(email_sent_at);

-- Create composite index for duplicate prevention
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_reminder_logs_unique_reminder 
ON email_reminder_logs(service_billing_id, days_before_expiry, DATE(email_sent_at));

-- Add comments for documentation
COMMENT ON TABLE email_reminder_logs IS 'Tracks all sent reminder emails to prevent duplicates and provide audit trail';
COMMENT ON COLUMN email_reminder_logs.days_before_expiry IS 'Number of days before expiry when this reminder was sent';
COMMENT ON INDEX idx_email_reminder_logs_unique_reminder IS 'Prevents sending duplicate reminders for the same service on the same day';

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================

-- Verify tables created successfully
SELECT 
    'service_billings columns' as check_type,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'service_billings'
AND column_name IN ('expiry_date', 'renewal_date', 'reminder_sent', 'last_reminder_sent_at')

UNION ALL

SELECT 
    'email_reminder_settings' as check_type,
    'Table exists' as column_name,
    CASE WHEN EXISTS (SELECT 1 FROM email_reminder_settings LIMIT 1) THEN 'YES' ELSE 'NO' END as data_type

UNION ALL

SELECT 
    'email_reminder_logs' as check_type,
    'Table exists' as column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_reminder_logs') THEN 'YES' ELSE 'NO' END as data_type;

-- ============================================================================
-- NEXT STEPS:
-- ============================================================================
-- 1. Verify all tables created successfully (check query results above)
-- 2. Navigate to "Service Expiry Reminders" in the application
-- 3. Configure reminder intervals in "Reminder Settings" tab
-- 4. Create service billings with expiry dates
-- 5. Click "Run Reminder Check Now" to test the system
-- 6. Check "Reminder Logs" tab to verify emails sent
-- 7. Set up scheduled task (optional) to run daily checks automatically
-- ============================================================================

