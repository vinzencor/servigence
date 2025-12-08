-- ============================================================================
-- Add Document Expiry Reminder Settings to email_reminder_settings Table
-- ============================================================================
-- 
-- PURPOSE: Enable automated document expiry reminder emails
-- 
-- ISSUE: The email_reminder_settings table only has a row for 'service_expiry'
--        but is missing a row for 'document_expiry', causing document reminders
--        to not be sent automatically.
--
-- FIX: Insert default settings for document expiry reminders
-- ============================================================================

-- Insert default settings for document expiry reminders
INSERT INTO email_reminder_settings (
    reminder_type, 
    enabled, 
    reminder_intervals, 
    email_subject, 
    email_template,
    created_by
)
VALUES (
    'document_expiry',
    TRUE,
    ARRAY[30, 15, 7, 3, 1],
    'Document Expiry Reminder - {{document_title}}',
    'Dear {{client_name}},

This is a friendly reminder that your document "{{document_title}}" will expire on {{expiry_date}} (in {{days_until_expiry}} days).

Document Details:
- Document: {{document_title}}
- Document Type: {{document_type}}
- Expiry Date: {{expiry_date}}

Please renew or update this document before the expiry date to ensure compliance and avoid any service interruption.

Thank you for choosing Servigens Business Group.

Best regards,
The Servigens Team',
    'System'
)
ON CONFLICT DO NOTHING;

-- Verify the insertion
SELECT 
    id,
    reminder_type,
    enabled,
    reminder_intervals,
    email_subject,
    created_at
FROM email_reminder_settings
WHERE reminder_type = 'document_expiry';

-- Display all reminder settings for verification
SELECT 
    reminder_type,
    enabled,
    reminder_intervals,
    SUBSTRING(email_subject, 1, 50) as email_subject_preview
FROM email_reminder_settings
ORDER BY reminder_type;

