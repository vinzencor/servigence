-- Create email_reminder_settings table for admin configuration
-- This table stores customizable reminder intervals and email templates

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

