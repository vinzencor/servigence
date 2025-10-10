-- Create advance_payments table for tracking advance payments on invoices
CREATE TABLE IF NOT EXISTS advance_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    billing_id UUID NOT NULL REFERENCES service_billings(id) ON DELETE CASCADE,
    
    -- Payment details
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(50) NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'cheque', 'online')),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Reference and tracking
    payment_reference VARCHAR(100), -- For bank transfers, cheque numbers, etc.
    receipt_number VARCHAR(100), -- Generated receipt number
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255),
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'refunded')),
    
    -- Additional fields for reconciliation
    bank_name VARCHAR(100), -- For bank transfers
    cheque_number VARCHAR(50), -- For cheque payments
    card_last_four VARCHAR(4), -- For card payments
    transaction_id VARCHAR(100) -- For online payments
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_advance_payments_billing_id ON advance_payments(billing_id);
CREATE INDEX IF NOT EXISTS idx_advance_payments_payment_date ON advance_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_advance_payments_payment_method ON advance_payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_advance_payments_status ON advance_payments(status);

-- Add paid_amount and last_payment_date columns to service_billings if they don't exist
ALTER TABLE service_billings 
ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) DEFAULT 0.00;

ALTER TABLE service_billings 
ADD COLUMN IF NOT EXISTS last_payment_date DATE;

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for advance_payments table
DROP TRIGGER IF EXISTS update_advance_payments_updated_at ON advance_payments;
CREATE TRIGGER update_advance_payments_updated_at
    BEFORE UPDATE ON advance_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE advance_payments IS 'Tracks advance payments made against service billings/invoices';
COMMENT ON COLUMN advance_payments.billing_id IS 'Reference to the service billing/invoice';
COMMENT ON COLUMN advance_payments.amount IS 'Amount paid in advance';
COMMENT ON COLUMN advance_payments.payment_method IS 'Method used for payment (cash, card, bank_transfer, etc.)';
COMMENT ON COLUMN advance_payments.payment_reference IS 'Reference number for the payment (bank ref, cheque no, etc.)';
COMMENT ON COLUMN advance_payments.receipt_number IS 'Generated receipt number for this payment';

-- Grant necessary permissions (adjust based on your RLS policies)
-- GRANT SELECT, INSERT, UPDATE ON advance_payments TO authenticated;
-- GRANT USAGE ON SEQUENCE advance_payments_id_seq TO authenticated;
