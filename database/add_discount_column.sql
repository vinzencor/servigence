-- Add discount column to service_billings table
-- This fixes the immediate PGRST204 error for the discount column

-- Add the discount column if it doesn't exist
ALTER TABLE service_billings 
ADD COLUMN IF NOT EXISTS discount DECIMAL(10,2) DEFAULT 0.00;

-- Add constraint for discount to ensure it's not negative
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'chk_service_billings_discount'
        AND table_name = 'service_billings'
    ) THEN
        ALTER TABLE service_billings
        ADD CONSTRAINT chk_service_billings_discount
        CHECK (discount >= 0);
    END IF;
END $$;

-- Create index for discount column for better performance
CREATE INDEX IF NOT EXISTS idx_service_billings_discount ON service_billings(discount);

-- Verify the column was added successfully
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_billings' AND column_name = 'discount'
    ) THEN
        RAISE EXCEPTION 'Failed to add discount column to service_billings table';
    ELSE
        RAISE NOTICE 'Discount column added successfully to service_billings table!';
    END IF;
END $$;
