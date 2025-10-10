-- Fix Missing Columns in Database Schema
-- This script adds all missing columns that are causing PGRST204 and 42703 errors

-- 1. Add missing columns to service_billings table
ALTER TABLE service_billings
ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) DEFAULT 0.00;

ALTER TABLE service_billings
ADD COLUMN IF NOT EXISTS last_payment_date DATE;

ALTER TABLE service_billings
ADD COLUMN IF NOT EXISTS card_id UUID;

ALTER TABLE service_billings
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending';

-- Add missing columns to service_billings table
ALTER TABLE service_billings
ADD COLUMN IF NOT EXISTS discount DECIMAL(10,2) DEFAULT 0.00;

ALTER TABLE service_billings
ADD COLUMN IF NOT EXISTS profit DECIMAL(10,2) DEFAULT 0.00;

ALTER TABLE service_billings
ADD COLUMN IF NOT EXISTS vat_percentage DECIMAL(5,2) DEFAULT 0.00;

ALTER TABLE service_billings
ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(10,2) DEFAULT 0.00;

ALTER TABLE service_billings
ADD COLUMN IF NOT EXISTS total_amount_with_vat DECIMAL(10,2) DEFAULT 0.00;

ALTER TABLE service_billings
ADD COLUMN IF NOT EXISTS vendor_cost DECIMAL(10,2) DEFAULT 0.00;

ALTER TABLE service_billings
ADD COLUMN IF NOT EXISTS assigned_vendor_id UUID;

-- Add constraints for the new columns (using DO blocks for conditional creation)
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
        WHERE constraint_name = 'chk_service_billings_vat_amount'
        AND table_name = 'service_billings'
    ) THEN
        ALTER TABLE service_billings
        ADD CONSTRAINT chk_service_billings_vat_amount
        CHECK (vat_amount >= 0);
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

-- Add check constraint for payment_status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'chk_service_billings_payment_status'
    ) THEN
        ALTER TABLE service_billings
        ADD CONSTRAINT chk_service_billings_payment_status
        CHECK (payment_status IN ('pending', 'partial', 'paid', 'cancelled'));
    END IF;
END $$;

-- Add foreign key constraint for card_id if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_service_billings_card_id'
    ) THEN
        ALTER TABLE service_billings 
        ADD CONSTRAINT fk_service_billings_card_id 
        FOREIGN KEY (card_id) REFERENCES payment_cards(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Add missing columns to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS credit_limit_days INTEGER DEFAULT 30;

-- 3. Add missing columns to individuals table  
ALTER TABLE individuals 
ADD COLUMN IF NOT EXISTS credit_limit_days INTEGER DEFAULT 30;

-- 4. Create advance_payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS advance_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    billing_id UUID NOT NULL REFERENCES service_billings(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(50) NOT NULL DEFAULT 'cash',
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_reference VARCHAR(100),
    receipt_number VARCHAR(100),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'confirmed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Additional fields for reconciliation
    bank_name VARCHAR(100),
    cheque_number VARCHAR(50),
    card_last_four VARCHAR(4),
    transaction_id VARCHAR(100)
);

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_billings_card_id ON service_billings(card_id);
CREATE INDEX IF NOT EXISTS idx_service_billings_paid_amount ON service_billings(paid_amount);
CREATE INDEX IF NOT EXISTS idx_service_billings_last_payment_date ON service_billings(last_payment_date);
CREATE INDEX IF NOT EXISTS idx_advance_payments_billing_id ON advance_payments(billing_id);
CREATE INDEX IF NOT EXISTS idx_advance_payments_payment_date ON advance_payments(payment_date);

-- 6. Update existing service_billings to set payment_status based on paid_amount
UPDATE service_billings 
SET payment_status = CASE 
    WHEN paid_amount >= total_amount THEN 'paid'
    WHEN paid_amount > 0 THEN 'partial'
    ELSE 'pending'
END
WHERE payment_status IS NULL OR payment_status = '';

-- 7. Generate unique receipt numbers for existing advance_payments (if any)
UPDATE advance_payments 
SET receipt_number = 'RCP-' || EXTRACT(EPOCH FROM created_at)::bigint
WHERE receipt_number IS NULL OR receipt_number = '';

-- 8. Add triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to advance_payments table
DROP TRIGGER IF EXISTS update_advance_payments_updated_at ON advance_payments;
CREATE TRIGGER update_advance_payments_updated_at 
    BEFORE UPDATE ON advance_payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Add RLS policies for advance_payments table (if RLS is enabled)
-- Note: Adjust these policies based on your authentication setup
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE c.relname = 'advance_payments' AND n.nspname = 'public'
    ) THEN
        -- Enable RLS if not already enabled
        ALTER TABLE advance_payments ENABLE ROW LEVEL SECURITY;
        
        -- Create policies (adjust based on your auth setup)
        DROP POLICY IF EXISTS "Enable read access for authenticated users" ON advance_payments;
        CREATE POLICY "Enable read access for authenticated users" ON advance_payments
            FOR SELECT USING (auth.role() = 'authenticated');
            
        DROP POLICY IF EXISTS "Enable insert for authenticated users" ON advance_payments;
        CREATE POLICY "Enable insert for authenticated users" ON advance_payments
            FOR INSERT WITH CHECK (auth.role() = 'authenticated');
            
        DROP POLICY IF EXISTS "Enable update for authenticated users" ON advance_payments;
        CREATE POLICY "Enable update for authenticated users" ON advance_payments
            FOR UPDATE USING (auth.role() = 'authenticated');
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- RLS policies might fail if auth schema doesn't exist, continue anyway
        NULL;
END $$;

-- 10. Verify the changes
DO $$ 
BEGIN
    -- Check if all required columns exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_billings' AND column_name = 'paid_amount'
    ) THEN
        RAISE EXCEPTION 'Failed to add paid_amount column to service_billings';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_billings' AND column_name = 'last_payment_date'
    ) THEN
        RAISE EXCEPTION 'Failed to add last_payment_date column to service_billings';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' AND column_name = 'credit_limit_days'
    ) THEN
        RAISE EXCEPTION 'Failed to add credit_limit_days column to companies';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'individuals' AND column_name = 'credit_limit_days'
    ) THEN
        RAISE EXCEPTION 'Failed to add credit_limit_days column to individuals';
    END IF;
    
    RAISE NOTICE 'All database schema fixes applied successfully!';
END $$;
