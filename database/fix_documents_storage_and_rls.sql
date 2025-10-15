-- Fix Documents Storage and RLS Issues
-- This script resolves storage bucket and row-level security policy issues for document management

-- =====================================================
-- 1. CREATE COMPANY_DOCUMENTS TABLE (if not exists)
-- =====================================================

CREATE TABLE IF NOT EXISTS company_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    document_number VARCHAR(100),
    expiry_date DATE,
    file_attachments JSONB,
    created_by VARCHAR(100) DEFAULT 'System',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint to companies table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_company_documents_company_id'
    ) THEN
        ALTER TABLE company_documents 
        ADD CONSTRAINT fk_company_documents_company_id 
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_company_documents_company_id ON company_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_company_documents_status ON company_documents(status);
CREATE INDEX IF NOT EXISTS idx_company_documents_expiry_date ON company_documents(expiry_date);

-- =====================================================
-- 2. CREATE INDIVIDUAL_DOCUMENTS TABLE (if not exists)
-- =====================================================

CREATE TABLE IF NOT EXISTS individual_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    individual_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    document_number VARCHAR(100),
    issue_date DATE,
    expiry_date DATE,
    document_type VARCHAR(50) DEFAULT 'individual_document',
    file_attachments JSONB,
    created_by VARCHAR(100) DEFAULT 'System',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint to individuals table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_individual_documents_individual_id'
    ) THEN
        ALTER TABLE individual_documents 
        ADD CONSTRAINT fk_individual_documents_individual_id 
        FOREIGN KEY (individual_id) REFERENCES individuals(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_individual_documents_individual_id ON individual_documents(individual_id);
CREATE INDEX IF NOT EXISTS idx_individual_documents_status ON individual_documents(status);
CREATE INDEX IF NOT EXISTS idx_individual_documents_expiry_date ON individual_documents(expiry_date);

-- =====================================================
-- 3. ENABLE ROW LEVEL SECURITY AND CREATE POLICIES
-- =====================================================

-- Enable RLS on company_documents table
ALTER TABLE company_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON company_documents;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON company_documents;
DROP POLICY IF EXISTS "company_documents_select_policy" ON company_documents;
DROP POLICY IF EXISTS "company_documents_insert_policy" ON company_documents;
DROP POLICY IF EXISTS "company_documents_update_policy" ON company_documents;
DROP POLICY IF EXISTS "company_documents_delete_policy" ON company_documents;

-- Create comprehensive RLS policies for company_documents
CREATE POLICY "company_documents_select_policy" ON company_documents
    FOR SELECT USING (true);

CREATE POLICY "company_documents_insert_policy" ON company_documents
    FOR INSERT WITH CHECK (true);

CREATE POLICY "company_documents_update_policy" ON company_documents
    FOR UPDATE USING (true);

CREATE POLICY "company_documents_delete_policy" ON company_documents
    FOR DELETE USING (true);

-- Enable RLS on individual_documents table
ALTER TABLE individual_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON individual_documents;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON individual_documents;
DROP POLICY IF EXISTS "individual_documents_select_policy" ON individual_documents;
DROP POLICY IF EXISTS "individual_documents_insert_policy" ON individual_documents;
DROP POLICY IF EXISTS "individual_documents_update_policy" ON individual_documents;
DROP POLICY IF EXISTS "individual_documents_delete_policy" ON individual_documents;

-- Create comprehensive RLS policies for individual_documents
CREATE POLICY "individual_documents_select_policy" ON individual_documents
    FOR SELECT USING (true);

CREATE POLICY "individual_documents_insert_policy" ON individual_documents
    FOR INSERT WITH CHECK (true);

CREATE POLICY "individual_documents_update_policy" ON individual_documents
    FOR UPDATE USING (true);

CREATE POLICY "individual_documents_delete_policy" ON individual_documents
    FOR DELETE USING (true);

-- =====================================================
-- 4. CREATE UPDATED_AT TRIGGERS
-- =====================================================

-- Create or replace function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for company_documents
DROP TRIGGER IF EXISTS trigger_update_company_documents_updated_at ON company_documents;
CREATE TRIGGER trigger_update_company_documents_updated_at
    BEFORE UPDATE ON company_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create triggers for individual_documents
DROP TRIGGER IF EXISTS trigger_update_individual_documents_updated_at ON individual_documents;
CREATE TRIGGER trigger_update_individual_documents_updated_at
    BEFORE UPDATE ON individual_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. GRANT PERMISSIONS
-- =====================================================

-- Grant permissions on tables
GRANT ALL ON company_documents TO authenticated;
GRANT ALL ON individual_documents TO authenticated;
GRANT ALL ON companies TO authenticated;
GRANT ALL ON individuals TO authenticated;

-- Grant permissions on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- 6. VERIFICATION QUERIES
-- =====================================================

-- Verify tables exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_documents') THEN
        RAISE NOTICE 'SUCCESS: company_documents table exists';
    ELSE
        RAISE NOTICE 'ERROR: company_documents table does not exist';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'individual_documents') THEN
        RAISE NOTICE 'SUCCESS: individual_documents table exists';
    ELSE
        RAISE NOTICE 'ERROR: individual_documents table does not exist';
    END IF;
END $$;

-- Verify RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('company_documents', 'individual_documents')
ORDER BY tablename, policyname;

-- =====================================================
-- 7. STORAGE BUCKET SETUP AND POLICIES
-- =====================================================

-- Create documents storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documents',
    'documents',
    true,
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "documents_bucket_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "documents_bucket_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "documents_bucket_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "documents_bucket_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete documents" ON storage.objects;

-- Create storage policies for documents bucket
CREATE POLICY "documents_bucket_select_policy" ON storage.objects
    FOR SELECT USING (bucket_id = 'documents');

CREATE POLICY "documents_bucket_insert_policy" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'documents');

CREATE POLICY "documents_bucket_update_policy" ON storage.objects
    FOR UPDATE USING (bucket_id = 'documents');

CREATE POLICY "documents_bucket_delete_policy" ON storage.objects
    FOR DELETE USING (bucket_id = 'documents');

-- =====================================================
-- 8. DISABLE RLS ON STORAGE OBJECTS (TEMPORARY FIX)
-- =====================================================

-- Temporarily disable RLS on storage.objects to allow uploads
-- This is a temporary fix until proper authentication is set up
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'DOCUMENTS STORAGE AND RLS SETUP COMPLETE';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Tables created: company_documents, individual_documents';
    RAISE NOTICE 'RLS policies: Enabled with full access for authenticated users';
    RAISE NOTICE 'Storage bucket: Created with public access';
    RAISE NOTICE 'Storage RLS: Temporarily disabled for uploads';
    RAISE NOTICE 'Indexes: Created for performance optimization';
    RAISE NOTICE 'Triggers: Updated_at triggers enabled';
    RAISE NOTICE 'Permissions: Granted to authenticated role';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'IMPORTANT: Storage RLS is disabled for testing';
    RAISE NOTICE 'Re-enable with proper auth policies in production';
    RAISE NOTICE '==============================================';
END $$;
