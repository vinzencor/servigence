-- Add vat_applies_to column to service_billings table
-- This column determines whether VAT is calculated on service charges only or total amount

-- Add the vat_applies_to column
ALTER TABLE service_billings 
ADD COLUMN IF NOT EXISTS vat_applies_to VARCHAR(20) DEFAULT 'service_charge' 
CHECK (vat_applies_to IN ('service_charge', 'total_amount'));

-- Add comment for documentation
COMMENT ON COLUMN service_billings.vat_applies_to IS 'Determines VAT calculation base: service_charge (VAT on service charges only) or total_amount (VAT on service charges + government charges)';

-- Update existing records to use default value
UPDATE service_billings 
SET vat_applies_to = 'service_charge' 
WHERE vat_applies_to IS NULL;

