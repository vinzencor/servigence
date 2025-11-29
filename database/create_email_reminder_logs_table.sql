-- Create email_reminder_logs table to track sent reminder emails
-- This prevents duplicate emails and provides audit trail

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

-- Add comment for documentation
COMMENT ON TABLE email_reminder_logs IS 'Tracks all sent reminder emails to prevent duplicates and provide audit trail';
COMMENT ON COLUMN email_reminder_logs.days_before_expiry IS 'Number of days before expiry when this reminder was sent';
COMMENT ON INDEX idx_email_reminder_logs_unique_reminder IS 'Prevents sending duplicate reminders for the same service on the same day';

