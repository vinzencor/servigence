-- Debug employee login issues
-- Run this SQL in your Supabase SQL Editor to check employee data

-- Check all service employees and their login credentials
SELECT 
  id,
  name,
  email,
  password_hash,
  is_active,
  created_at
FROM service_employees 
ORDER BY created_at DESC;

-- Check if any employees have password_hash set
SELECT 
  COUNT(*) as total_employees,
  COUNT(password_hash) as employees_with_password,
  COUNT(CASE WHEN password_hash IS NOT NULL AND password_hash != '' THEN 1 END) as employees_with_valid_password
FROM service_employees 
WHERE is_active = true;

-- Show employees without password_hash (these won't be able to login)
SELECT 
  id,
  name,
  email,
  'No password set' as issue
FROM service_employees 
WHERE is_active = true 
  AND (password_hash IS NULL OR password_hash = '');

-- If you need to set a temporary password for testing, uncomment and modify this:
-- UPDATE service_employees 
-- SET password_hash = encode(digest('temppass123', 'sha256'), 'base64')
-- WHERE email = 'test@example.com' AND password_hash IS NULL;
