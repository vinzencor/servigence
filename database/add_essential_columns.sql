-- Add essential missing columns to service_billings table
-- This fixes the immediate PGRST204 errors for missing columns

-- Add the profit column (causing current error)
ALTER TABLE service_billings 
ADD COLUMN IF NOT EXISTS profit DECIMAL(10,2) DEFAULT 0.00;

-- Add the discount column (previously causing error)
ALTER TABLE service_billings 
ADD COLUMN IF NOT EXISTS discount DECIMAL(10,2) DEFAULT 0.00;

-- Add VAT related columns
ALTER TABLE service_billings 
ADD COLUMN IF NOT EXISTS vat_percentage DECIMAL(5,2) DEFAULT 0.00;

ALTER TABLE service_billings 
ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(10,2) DEFAULT 0.00;

ALTER TABLE service_billings 
ADD COLUMN IF NOT EXISTS total_amount_with_vat DECIMAL(10,2) DEFAULT 0.00;

-- Add vendor related columns
ALTER TABLE service_billings 
ADD COLUMN IF NOT EXISTS vendor_cost DECIMAL(10,2) DEFAULT 0.00;

ALTER TABLE service_billings 
ADD COLUMN IF NOT EXISTS assigned_vendor_id UUID;

-- Add constraints for data integrity
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'chk_service_billings_profit'
        AND table_name = 'service_billings'
    ) THEN
        ALTER TABLE service_billings
        ADD CONSTRAINT chk_service_billings_profit
        CHECK (profit >= 0);
    END IF;
END $$;

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

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'chk_service_billings_vat_percentage'
        AND table_name = 'service_billings'
    ) THEN
        ALTER TABLE service_billings
        ADD CONSTRAINT chk_service_billings_vat_percentage
        CHECK (vat_percentage >= 0 AND vat_percentage <= 100);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'chk_service_billings_vendor_cost'
        AND table_name = 'service_billings'
    ) THEN
        ALTER TABLE service_billings
        ADD CONSTRAINT chk_service_billings_vendor_cost
        CHECK (vendor_cost >= 0);
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_billings_profit ON service_billings(profit);
CREATE INDEX IF NOT EXISTS idx_service_billings_discount ON service_billings(discount);
CREATE INDEX IF NOT EXISTS idx_service_billings_assigned_vendor_id ON service_billings(assigned_vendor_id);

-- Verify the columns were added successfully
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_billings' AND column_name = 'profit'
    ) THEN
        RAISE EXCEPTION 'Failed to add profit column to service_billings table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_billings' AND column_name = 'discount'
    ) THEN
        RAISE EXCEPTION 'Failed to add discount column to service_billings table';
    END IF;
    
    RAISE NOTICE 'Essential columns added successfully to service_billings table!';
END $$;
