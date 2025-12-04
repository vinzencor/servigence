-- Add vat_calculation_method column to service_billings table
-- This enables tracking whether VAT is inclusive (reverse calculation) or exclusive (added on top)

-- Add the vat_calculation_method column
ALTER TABLE service_billings 
ADD COLUMN IF NOT EXISTS vat_calculation_method VARCHAR(20) DEFAULT 'inclusive';

-- Add check constraint to ensure valid values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'chk_service_billings_vat_calculation_method'
        AND table_name = 'service_billings'
    ) THEN
        ALTER TABLE service_billings
        ADD CONSTRAINT chk_service_billings_vat_calculation_method
        CHECK (vat_calculation_method IN ('inclusive', 'exclusive'));
    END IF;
END $$;

-- Create index for better performance on vat_calculation_method queries
CREATE INDEX IF NOT EXISTS idx_service_billings_vat_calculation_method 
ON service_billings(vat_calculation_method);

-- Add comment to explain the column
COMMENT ON COLUMN service_billings.vat_calculation_method IS 
'VAT calculation method: inclusive (VAT extracted from service charge) or exclusive (VAT added on top of service charge)';

