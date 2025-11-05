-- Fix RLS policy for quotation_items table
-- The previous policy was too restrictive and caused 401 Unauthorized errors

-- Drop the existing policy
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON quotation_items;

-- Create a more permissive policy that allows all operations for authenticated users
-- This matches the pattern used in other tables in the application
CREATE POLICY "Enable all access for authenticated users" 
ON quotation_items
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Verify the policy was created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'quotation_items';

SELECT 'quotation_items RLS policy updated successfully' as result;

