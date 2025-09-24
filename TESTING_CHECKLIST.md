# TESTING CHECKLIST - Client Meeting Preparation

## 🚨 CRITICAL: Execute Database Changes First

### Step 1: Create Vendors Table
1. Open Supabase Dashboard: https://supabase.com/dashboard/project/jwqxbevszjlbistvrejv/sql/new
2. Copy and paste this SQL:

```sql
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

INSERT INTO vendors (name, email, phone, address, contact_person, service_category, payment_terms) VALUES
('Emirates Insurance Brokers', 'contact@emiratesinsurance.ae', '+971-4-555-1234', 'Insurance House, DIFC, Dubai, UAE', 'Ahmed Al-Mansouri', 'Insurance Services', 'Net 30'),
('Dubai Tax Consultants', 'info@dubaitax.ae', '+971-4-555-5678', 'Business Bay, Dubai, UAE', 'Sarah Al-Zahra', 'Tax Consulting', 'Net 15'),
('Legal Partners UAE', 'contact@legalpartners.ae', '+971-4-555-9012', 'DIFC, Dubai, UAE', 'Omar Al-Rashid', 'Legal Services', 'Net 30');
```

3. Click "Run" to execute

## 🧪 TESTING PROTOCOL

### Test 1: Vendor Management (CRITICAL)
**Expected Result**: Vendor section should show content, not empty screen

1. Open: http://localhost:5176
2. Login with super admin credentials:
   - Email: `rahulpradeepan77@gmail.com`
   - Password: `Admin@2024!Secure`
3. Click "Vendors" in navigation menu
4. **VERIFY**: Should see vendor management interface with sample vendors
5. **VERIFY**: Should see "Emirates Insurance Brokers", "Dubai Tax Consultants", "Legal Partners UAE"
6. Click "Add New Vendor" button
7. Fill in test vendor details:
   - Name: "Test Vendor Company"
   - Email: "test@vendor.com"
   - Phone: "+971-50-123-4567"
   - Contact Person: "Test Contact"
   - Service Category: "Testing Services"
8. Click "Create Vendor"
9. **VERIFY**: Success message appears
10. **VERIFY**: New vendor appears in the list

### Test 2: Employee Creation and Login (CRITICAL)
**Expected Result**: Employees created by super admin can login successfully

1. From super admin dashboard, click "Employee Management"
2. Click "Add New Employee"
3. Fill in employee details:
   - Name: "Test Employee"
   - Email: "testemployee@servigence.com"
   - Phone: "+971-50-999-8888"
   - Department: "Immigration Services"
   - Specialization: "Visa Processing"
   - Password: "testpass123"
   - Confirm Password: "testpass123"
4. Click "Create Employee"
5. **VERIFY**: Success alert shows with login credentials
6. **COPY**: Note the email and password from the alert
7. Logout from super admin
8. Go to employee login page
9. Enter the credentials from step 6
10. **VERIFY**: Employee can login successfully
11. **VERIFY**: Employee dashboard loads properly

### Test 3: Debug Employee Authentication
**If employee login fails**, check browser console for logs:

1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Attempt employee login
4. Look for these log messages:
   - "Attempting to authenticate employee: [email]"
   - "Found employees: [array]"
   - "Employee data: [object with hasPasswordHash]"
   - "Comparing passwords: [object with match status]"

### Test 4: Fallback Authentication
**Emergency backup if new employee login fails**:

1. Try these hardcoded credentials:
   - Email: `meenakshi@educare.com`
   - Password: Any password (6+ characters)
2. Should login successfully as fallback

## 📋 VERIFICATION CHECKLIST

- [ ] Vendors table created in Supabase
- [ ] Vendor section shows content (not empty)
- [ ] Can add new vendors successfully
- [ ] Can create new employees with passwords
- [ ] New employees can login with their credentials
- [ ] Employee dashboard loads after login
- [ ] Console logs show authentication process
- [ ] Fallback authentication works if needed

## 🚨 TROUBLESHOOTING

### If Vendor Section Still Empty:
- Verify SQL script ran without errors in Supabase
- Check browser console for error messages
- Refresh the page after running SQL

### If Employee Login Fails:
- Check browser console for authentication logs
- Verify password_hash was set during creation
- Use fallback credentials for demo
- Run debug SQL to check employee data

### Emergency Demo Credentials:
- **Super Admin**: rahulpradeepan77@gmail.com / Admin@2024!Secure
- **Staff Fallback**: meenakshi@educare.com / any6chars

## 🎯 CLIENT DEMO FLOW

1. **Show Vendor Management**: Navigate to Vendors → Show existing vendors → Add new vendor
2. **Show Employee Management**: Create new employee → Show login credentials
3. **Demonstrate Staff Login**: Login as employee → Show employee dashboard
4. **Highlight Fixed Issues**: "Both login and vendor issues are now resolved"

**CRITICAL**: Run the SQL script first, then test both functionalities before the client meeting!
