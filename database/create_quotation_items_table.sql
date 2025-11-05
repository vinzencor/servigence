-- Create quotation_items table for storing multiple services per quotation
-- This enables quotations to have multiple line items similar to invoices

CREATE TABLE IF NOT EXISTS quotation_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    service_id UUID REFERENCES service_types(id) ON DELETE SET NULL,
    
    -- Service details (denormalized for historical accuracy)
    service_name VARCHAR(255) NOT NULL,
    service_category VARCHAR(100),
    
    -- Pricing details
    quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
    service_charge DECIMAL(10,2) DEFAULT 0.00 CHECK (service_charge >= 0),
    government_charge DECIMAL(10,2) DEFAULT 0.00 CHECK (government_charge >= 0),
    line_total DECIMAL(10,2) NOT NULL CHECK (line_total >= 0),
    
    -- Metadata
    display_order INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id ON quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_service_id ON quotation_items(service_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_display_order ON quotation_items(quotation_id, display_order);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_quotation_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_quotation_items_updated_at
    BEFORE UPDATE ON quotation_items
    FOR EACH ROW
    EXECUTE FUNCTION update_quotation_items_updated_at();

-- Note: RLS is DISABLED to match other tables in the application
-- All other tables (quotations, companies, service_billings, etc.) have RLS disabled
-- This ensures consistent behavior across the application
ALTER TABLE quotation_items DISABLE ROW LEVEL SECURITY;

-- Comments for documentation
COMMENT ON TABLE quotation_items IS 'Stores individual service line items for quotations, enabling multi-service quotations';
COMMENT ON COLUMN quotation_items.quotation_id IS 'Reference to the parent quotation';
COMMENT ON COLUMN quotation_items.service_id IS 'Reference to service_types table (nullable for historical data)';
COMMENT ON COLUMN quotation_items.service_name IS 'Denormalized service name for historical accuracy';
COMMENT ON COLUMN quotation_items.quantity IS 'Number of units for this service';
COMMENT ON COLUMN quotation_items.service_charge IS 'Service/typing charges per unit';
COMMENT ON COLUMN quotation_items.government_charge IS 'Government fees per unit';
COMMENT ON COLUMN quotation_items.line_total IS 'Total for this line: (service_charge + government_charge) × quantity';
COMMENT ON COLUMN quotation_items.display_order IS 'Order in which items should be displayed';

