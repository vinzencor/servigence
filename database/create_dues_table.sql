-- Create dues table for tracking unpaid amounts when companies exceed credit limits
CREATE TABLE IF NOT EXISTS dues (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    service_billing_id UUID REFERENCES service_billings(id) ON DELETE SET NULL,
    
    -- Amount tracking
    original_amount DECIMAL(10,2) NOT NULL, -- Original service amount
    paid_amount DECIMAL(10,2) DEFAULT 0.00, -- Amount paid by company
    due_amount DECIMAL(10,2) NOT NULL, -- Amount we covered (original - paid)
    
    -- Date tracking
    service_date DATE NOT NULL, -- Date when service was provided
    due_date DATE NOT NULL, -- Date when payment is due
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Status and metadata
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'cancelled')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    
    -- Service details
    service_name VARCHAR(255),
    service_description TEXT,
    invoice_number VARCHAR(100),
    
    -- Payment tracking
    last_payment_date DATE,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    
    -- Notes and additional info
    notes TEXT,
    created_by VARCHAR(100) DEFAULT 'System',
    updated_by VARCHAR(100),
    
    -- Constraints
    CONSTRAINT positive_amounts CHECK (
        original_amount > 0 AND 
        paid_amount >= 0 AND 
        due_amount >= 0 AND
        paid_amount <= original_amount
    ),
    CONSTRAINT valid_dates CHECK (due_date >= service_date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dues_company_id ON dues(company_id);
CREATE INDEX IF NOT EXISTS idx_dues_employee_id ON dues(employee_id);
CREATE INDEX IF NOT EXISTS idx_dues_service_billing_id ON dues(service_billing_id);
CREATE INDEX IF NOT EXISTS idx_dues_status ON dues(status);
CREATE INDEX IF NOT EXISTS idx_dues_due_date ON dues(due_date);
CREATE INDEX IF NOT EXISTS idx_dues_created_at ON dues(created_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_dues_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_dues_updated_at
    BEFORE UPDATE ON dues
    FOR EACH ROW
    EXECUTE FUNCTION update_dues_updated_at();

-- Add RLS (Row Level Security) policies if needed
ALTER TABLE dues ENABLE ROW LEVEL SECURITY;

-- Policy to allow all operations for authenticated users (adjust as needed)
CREATE POLICY "Allow all operations for authenticated users" ON dues
    FOR ALL USING (auth.role() = 'authenticated');

-- Comments for documentation
COMMENT ON TABLE dues IS 'Tracks unpaid amounts when companies exceed their credit limits';
COMMENT ON COLUMN dues.original_amount IS 'Total amount of the service billing';
COMMENT ON COLUMN dues.paid_amount IS 'Amount actually paid by the company';
COMMENT ON COLUMN dues.due_amount IS 'Amount we covered (original_amount - paid_amount)';
COMMENT ON COLUMN dues.service_date IS 'Date when the service was provided';
COMMENT ON COLUMN dues.due_date IS 'Date when the payment is expected';
COMMENT ON COLUMN dues.status IS 'Current status of the due amount';
