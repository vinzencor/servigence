-- Add card_id column to service_billings table for payment card integration
-- This enables tracking which payment card was used for each service billing

-- Add the card_id column
ALTER TABLE service_billings 
ADD COLUMN IF NOT EXISTS card_id UUID;

-- Add foreign key constraint to payment_cards table
ALTER TABLE service_billings 
ADD CONSTRAINT fk_service_billings_card_id 
FOREIGN KEY (card_id) REFERENCES payment_cards(id) ON DELETE SET NULL;

-- Create index for better performance on card_id queries
CREATE INDEX IF NOT EXISTS idx_service_billings_card_id ON service_billings(card_id);

-- Create index for cash_type queries (used frequently in card-related queries)
CREATE INDEX IF NOT EXISTS idx_service_billings_cash_type ON service_billings(cash_type);

-- Create composite index for card transactions by date
CREATE INDEX IF NOT EXISTS idx_service_billings_card_date ON service_billings(card_id, service_date) WHERE card_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN service_billings.card_id IS 'Reference to payment card used for this billing when cash_type is card';

-- Update existing records where cash_type = 'card' but card_id is null
-- This is a safety measure - in practice, you might want to set specific card IDs
-- For now, we'll leave them as NULL and they can be updated manually if needed

-- Add constraint to ensure card_id is set when cash_type is 'card'
-- Note: This constraint is commented out initially to allow existing data
-- Uncomment after ensuring all card transactions have proper card_id values
-- ALTER TABLE service_billings 
-- ADD CONSTRAINT check_card_id_when_card_payment 
-- CHECK (cash_type != 'card' OR card_id IS NOT NULL);

-- Grant necessary permissions (adjust as needed for your RLS policies)
-- These are examples - adjust based on your security requirements
-- GRANT SELECT, INSERT, UPDATE ON service_billings TO authenticated;
-- GRANT SELECT ON payment_cards TO authenticated;
