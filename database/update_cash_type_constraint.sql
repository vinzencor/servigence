-- Update cash_type constraint in service_billings table to support standard payment methods
-- This migration updates the check constraint to accept the new standard payment method values

-- Step 1: Drop the existing check constraint
DO $$
BEGIN
    -- Check if the constraint exists and drop it
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'service_billings_cash_type_check'
        AND table_name = 'service_billings'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE service_billings DROP CONSTRAINT service_billings_cash_type_check;
        RAISE NOTICE 'Dropped existing cash_type check constraint';
    END IF;
END $$;

-- Step 2: Add the new check constraint with standard payment methods
ALTER TABLE service_billings 
ADD CONSTRAINT service_billings_cash_type_check 
CHECK (cash_type IN ('cash', 'bank', 'card', 'cheque', 'online'));

-- Step 3: Add card_id column if it doesn't exist (for credit card payments)
ALTER TABLE service_billings 
ADD COLUMN IF NOT EXISTS card_id UUID;

-- Step 4: Add foreign key constraint to payment_cards table
DO $$
BEGIN
    -- Check if the foreign key constraint doesn't exist and add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_service_billings_card_id'
        AND table_name = 'service_billings'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE service_billings 
        ADD CONSTRAINT fk_service_billings_card_id 
        FOREIGN KEY (card_id) REFERENCES payment_cards(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added foreign key constraint for card_id';
    END IF;
END $$;

-- Step 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_billings_cash_type ON service_billings(cash_type);
CREATE INDEX IF NOT EXISTS idx_service_billings_card_id ON service_billings(card_id);

-- Step 6: Create composite index for card transactions by date
CREATE INDEX IF NOT EXISTS idx_service_billings_card_date 
ON service_billings(card_id, service_date) 
WHERE card_id IS NOT NULL;

-- Step 7: Add constraint to ensure card_id is set when cash_type is 'card'
-- Note: This constraint is optional and can be enabled after data migration
-- ALTER TABLE service_billings 
-- ADD CONSTRAINT check_card_id_when_card_payment 
-- CHECK (cash_type != 'card' OR card_id IS NOT NULL);

-- Step 8: Update existing records if needed
-- Convert any existing business-specific cash_type values to standard ones
UPDATE service_billings 
SET cash_type = 'cash' 
WHERE cash_type IN ('house', 'car', 'service_agency', 'service_building');

-- Step 9: Add comments for documentation
COMMENT ON COLUMN service_billings.cash_type IS 'Payment method: cash, bank, card, cheque, or online';
COMMENT ON COLUMN service_billings.card_id IS 'Reference to payment card when cash_type is card';

-- Step 10: Grant necessary permissions (adjust as needed for your RLS policies)
-- GRANT SELECT, INSERT, UPDATE ON service_billings TO authenticated;
-- GRANT SELECT ON payment_cards TO authenticated;

-- Verification query to check the constraint
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'service_billings' 
    AND tc.constraint_name = 'service_billings_cash_type_check';

RAISE NOTICE 'Cash type constraint migration completed successfully';
RAISE NOTICE 'Supported cash_type values: cash, bank, card, cheque, online';
RAISE NOTICE 'Card selection will be required when cash_type = card';
