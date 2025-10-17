-- Add service_id column to employee_documents table for service-based document management
-- This enables linking employee documents to specific services for better organization and reminders

-- Add the service_id column to employee_documents table
ALTER TABLE employee_documents 
ADD COLUMN IF NOT EXISTS service_id UUID;

-- Add foreign key constraint to service_types table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_employee_documents_service_id'
    ) THEN
        ALTER TABLE employee_documents 
        ADD CONSTRAINT fk_employee_documents_service_id 
        FOREIGN KEY (service_id) REFERENCES service_types(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create index for better performance on service_id queries
CREATE INDEX IF NOT EXISTS idx_employee_documents_service_id ON employee_documents(service_id);

-- Create composite index for employee + service queries
CREATE INDEX IF NOT EXISTS idx_employee_documents_employee_service ON employee_documents(employee_id, service_id);

-- Add comment for documentation
COMMENT ON COLUMN employee_documents.service_id IS 'Reference to service type that this document is associated with for service-based document management';

-- Update existing employee documents to have a default service if needed
-- This is optional - you can leave existing documents with NULL service_id
-- UPDATE employee_documents 
-- SET service_id = (SELECT id FROM service_types WHERE name = 'General Service' LIMIT 1)
-- WHERE service_id IS NULL AND type IN ('passport', 'visa', 'emirates_id', 'labor_card');

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'employee_documents' 
AND column_name = 'service_id';

-- Show sample of updated table structure
\d employee_documents;
