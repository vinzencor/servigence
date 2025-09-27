-- Add VAT fields to service_billings table
ALTER TABLE service_billings 
ADD COLUMN IF NOT EXISTS vat_percentage DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_amount_with_vat DECIMAL(10,2);

-- Add constraints to ensure valid VAT values
ALTER TABLE service_billings 
ADD CONSTRAINT check_vat_percentage CHECK (vat_percentage >= 0 AND vat_percentage <= 100),
ADD CONSTRAINT check_vat_amount CHECK (vat_amount >= 0);

-- Update existing records to calculate total_amount_with_vat
UPDATE service_billings 
SET total_amount_with_vat = total_amount 
WHERE total_amount_with_vat IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN service_billings.vat_percentage IS 'VAT percentage applied to the service (0-100)';
COMMENT ON COLUMN service_billings.vat_amount IS 'Calculated VAT amount based on percentage';
COMMENT ON COLUMN service_billings.total_amount_with_vat IS 'Total amount including VAT';
