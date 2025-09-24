-- Create vendors table to fix empty vendor screen issue
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS vendors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  contact_person VARCHAR(255),
  service_category VARCHAR(100),
  payment_terms VARCHAR(50) DEFAULT 'Net 30',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_vendors_email ON vendors(email);

-- Create an index on is_active for filtering
CREATE INDEX IF NOT EXISTS idx_vendors_active ON vendors(is_active);

-- Insert some sample vendor data for testing
INSERT INTO vendors (name, email, phone, address, contact_person, service_category, payment_terms) VALUES
('Emirates Insurance Brokers', 'contact@emiratesinsurance.ae', '+971-4-555-1234', 'Insurance House, DIFC, Dubai, UAE', 'Ahmed Al-Mansouri', 'Insurance Services', 'Net 30'),
('Dubai Tax Consultants', 'info@dubaitax.ae', '+971-4-555-5678', 'Business Bay, Dubai, UAE', 'Sarah Al-Zahra', 'Tax Consulting', 'Net 15'),
('Legal Partners UAE', 'contact@legalpartners.ae', '+971-4-555-9012', 'DIFC, Dubai, UAE', 'Omar Al-Rashid', 'Legal Services', 'Net 30'),
('Translation Hub', 'info@translationhub.ae', '+971-4-555-3456', 'Deira, Dubai, UAE', 'Fatima Al-Mansouri', 'Translation Services', 'Net 15'),
('Attestation Services LLC', 'contact@attestation.ae', '+971-4-555-7890', 'Bur Dubai, UAE', 'Mohammed Al-Ahmad', 'Document Attestation', 'Net 30')
ON CONFLICT (email) DO NOTHING;

-- Verify the table was created successfully
SELECT COUNT(*) as vendor_count FROM vendors;
