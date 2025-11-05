-- Migration: Make service_id and service_name nullable in quotations table
-- This allows quotations to have multiple services stored in quotation_items table
-- instead of a single service in the quotations table

-- Make service_id nullable (if it exists)
ALTER TABLE quotations 
ALTER COLUMN service_id DROP NOT NULL;

-- Make service_name nullable (if it exists)
ALTER TABLE quotations 
ALTER COLUMN service_name DROP NOT NULL;

-- Add comment to document the change
COMMENT ON COLUMN quotations.service_id IS 'DEPRECATED: Service ID is now stored in quotation_items table. This column is kept for backward compatibility but should be NULL for new quotations.';

COMMENT ON COLUMN quotations.service_name IS 'DEPRECATED: Service name is now stored in quotation_items table. This column is kept for backward compatibility but should be NULL for new quotations.';

SELECT 'quotations table updated successfully - service_id and service_name are now nullable' as result;

