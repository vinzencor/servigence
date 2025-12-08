# Employee Document Expiry Reminders - Implementation Complete

## ✅ **IMPLEMENTATION SUMMARY**

The automated email reminder system has been successfully extended to support employee document expiry reminders. Employee documents added through the Edit Employee form will now trigger automated reminder emails based on custom reminder intervals, custom reminder dates, or global settings.

---

## 📁 **FILES MODIFIED**

### 1. **Database Migration Scripts**

#### `database/add_custom_reminder_fields_to_employee_documents.sql` (Created)
- Adds `custom_reminder_intervals` column to `employee_documents` table
- Adds `custom_reminder_dates` column to `employee_documents` table
- Adds documentation comments for both columns

#### `database/add_employee_document_support_to_reminder_logs.sql` (Created)
- Adds `employee_document_id` column to `email_reminder_logs` table
- Adds `employee_id` column to `email_reminder_logs` table
- Updates `recipient_type` constraint to include 'employee'
- Creates indexes for efficient queries

### 2. **Reminder Service**

#### `src/lib/serviceExpiryReminder.ts` (Modified)
**Changes Made:**

1. **Updated `DocumentWithDetails` interface** (Lines 37-74)
   - Added `employee_id?: string` field
   - Added `employee` object with employee details and company information

2. **Updated `hasDocumentReminderBeenSent` method** (Lines 165-194)
   - Extended `documentType` parameter to accept `'employee'`
   - Added logic to check `employee_document_id` column

3. **Updated `logDocumentReminderEmail` method** (Lines 231-275)
   - Added support for employee documents in log entries
   - Includes `employee_document_id` and `employee_id` in log records
   - Sets `recipient_type` to 'employee' for employee documents

4. **Updated `sendDocumentReminderEmail` method** (Lines 359-450)
   - Added employee email resolution logic
   - Falls back to company email if employee email not available
   - Includes `employeeName` in email data

5. **Added employee document processing** (Lines 1031-1217)
   - Queries `employee_documents` table with expiry dates
   - Processes custom reminder intervals and dates
   - Sends reminder emails to employees or company HR
   - Logs all reminder activities

### 3. **Email Service**

#### `src/lib/emailService.ts` (Modified)
**Changes Made:**

1. **Updated `DocumentExpiryReminderEmailData` interface** (Lines 71-83)
   - Added `employeeName?: string` field
   - Supports employee-specific email templates

---

## 🔧 **HOW IT WORKS**

### **Employee Document Reminder Flow**

1. **Document Creation/Update**
   - User adds/edits employee document through Edit Employee form
   - Document includes expiry date and optional custom reminder settings
   - Data saved to `employee_documents` table

2. **Automated Reminder Check**
   - Background job runs periodically (e.g., daily)
   - Queries all employee documents with expiry dates
   - For each document, checks:
     - **Custom Reminder Dates**: If today matches any custom date, send reminder
     - **Custom Reminder Intervals**: If days until expiry matches any interval, send reminder
     - **Global Settings**: If no custom settings, uses global reminder intervals

3. **Email Delivery**
   - Determines recipient email:
     - Primary: Employee's email address
     - Fallback: Company's HR email (email1)
   - Sends document expiry reminder email
   - Logs the reminder in `email_reminder_logs` table

4. **Duplicate Prevention**
   - Checks if reminder already sent today for same document and interval
   - Prevents duplicate emails for the same reminder trigger

---

## 📋 **SETUP INSTRUCTIONS**

### **Step 1: Run Database Migrations**

You MUST run both migration scripts before using this feature:

```bash
# Connect to your Supabase database
psql -h <your-supabase-host> -U postgres -d postgres

# Run migration 1: Add custom reminder fields to employee_documents
\i database/add_custom_reminder_fields_to_employee_documents.sql

# Run migration 2: Add employee document support to reminder logs
\i database/add_employee_document_support_to_reminder_logs.sql
```

**Or use Supabase SQL Editor:**
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste contents of `database/add_custom_reminder_fields_to_employee_documents.sql`
3. Click "Run"
4. Copy and paste contents of `database/add_employee_document_support_to_reminder_logs.sql`
5. Click "Run"

### **Step 2: Verify Database Changes**

```sql
-- Verify employee_documents table has new columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'employee_documents'
AND column_name IN ('custom_reminder_intervals', 'custom_reminder_dates');

-- Verify email_reminder_logs table has new columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'email_reminder_logs'
AND column_name IN ('employee_document_id', 'employee_id');

-- Verify recipient_type constraint includes 'employee'
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'email_reminder_logs_recipient_type_check';
```

### **Step 3: Test the Implementation**

See the **TESTING GUIDE** section below for detailed testing steps.

---

## 🧪 **TESTING GUIDE**

### **Test 1: Add Employee Document with Custom Reminder Intervals**

1. Navigate to Employee Management
2. Click "Edit" on an existing employee
3. Scroll to "Documents & Certificates" section
4. Click "Add Document"
5. Fill in:
   - **Related Service**: Select a service (e.g., "Passport Renewal")
   - **Expiry Date**: Set to 30 days from today (e.g., if today is 2025-01-08, set to 2025-02-07)
   - **Custom Reminder Intervals**: Enter "30, 15, 7, 3"
   - **Upload File**: (Optional)
6. Click "Update Employee"
7. Verify document is saved successfully

**Expected Result:**
- Document saved with custom reminder intervals
- Reminder emails will be sent 30, 15, 7, and 3 days before expiry

### **Test 2: Add Employee Document with Custom Reminder Dates**

1. Edit the same employee
2. Add another document
3. Fill in:
   - **Related Service**: Select a service
   - **Expiry Date**: Set to any future date
   - **Custom Reminder Dates**: Enter "2025-02-15, 2025-03-01"
4. Click "Update Employee"

**Expected Result:**
- Document saved with custom reminder dates
- Reminder emails will be sent on 2025-02-15 and 2025-03-01

### **Test 3: Trigger Reminder Manually**

```typescript
// In browser console or test script
import { serviceExpiryReminderService } from './lib/serviceExpiryReminder';

// Run reminder check manually
const result = await serviceExpiryReminderService.checkAndSendReminders();
console.log('Reminder check result:', result);
```

**Expected Console Output:**
```
🔔 Starting service & document expiry reminder check...
📋 Checking SERVICE expiries...
📄 Checking DOCUMENT expiries...
  ✅ Found X employee document(s) with expiry dates
  🔍 Processing employee document <id>:
    - Employee: John Doe
    - Company: ABC Company
    - Document: Passport
    - Type: passport
    - Email: john@example.com
    - Expiry Date: 2025-02-07
    - Days Until Expiry: 30
    - Reminder Reason: 30 days before expiry
    📤 Sending employee document reminder email (30 days before expiry)...
    ✅ Document expiry email sent successfully to john@example.com
```

### **Test 4: Verify Email Reminder Logs**

```sql
-- Check recent employee document reminder logs
SELECT
  id,
  recipient_email,
  recipient_name,
  recipient_type,
  reminder_type,
  days_before_expiry,
  expiry_date,
  email_status,
  email_sent_at,
  document_title,
  service_name
FROM email_reminder_logs
WHERE recipient_type = 'employee'
AND reminder_type = 'document_expiry'
ORDER BY email_sent_at DESC
LIMIT 10;
```

**Expected Result:**
- Rows with `recipient_type = 'employee'`
- `employee_document_id` populated
- `employee_id` populated
- `email_status = 'sent'`

### **Test 5: Verify Duplicate Prevention**

1. Run the reminder check twice in the same day
2. Verify that the second run does NOT send duplicate emails

```typescript
// First run
const result1 = await serviceExpiryReminderService.checkAndSendReminders();
console.log('First run:', result1);

// Second run (same day)
const result2 = await serviceExpiryReminderService.checkAndSendReminders();
console.log('Second run:', result2);
```

**Expected Result:**
- First run: Sends reminder emails
- Second run: Skips reminders with message "Reminder already sent today"

### **Test 6: Test Email Fallback Logic**

1. Create an employee document for an employee WITHOUT an email address
2. Ensure the employee's company has an email address
3. Run reminder check

**Expected Result:**
- Reminder email sent to company's email address (fallback)
- Log shows company email as recipient

---

## 📊 **DATABASE SCHEMA CHANGES**

### **employee_documents Table**

```sql
-- New columns added
custom_reminder_intervals TEXT  -- Comma-separated days (e.g., "30,15,7,3")
custom_reminder_dates TEXT      -- Comma-separated dates (e.g., "2025-02-15,2025-03-01")
```

### **email_reminder_logs Table**

```sql
-- New columns added
employee_document_id UUID REFERENCES employee_documents(id) ON DELETE CASCADE
employee_id UUID REFERENCES employees(id) ON DELETE SET NULL

-- Updated constraint
recipient_type CHECK (recipient_type IN ('company', 'individual', 'employee'))
```

---

## 🔍 **TROUBLESHOOTING**

### **Issue: Reminders not being sent**

**Possible Causes:**
1. Database migrations not applied
2. Employee has no email address and company has no email address
3. Document status is not 'valid'
4. Expiry date is null or in the past

**Solution:**
```sql
-- Check employee document status
SELECT id, name, expiry_date, status, employee_id
FROM employee_documents
WHERE expiry_date IS NOT NULL
ORDER BY expiry_date;

-- Check employee email addresses
SELECT e.id, e.name, e.email, c.company_name, c.email1
FROM employees e
LEFT JOIN companies c ON e.company_id = c.id
WHERE e.id IN (
  SELECT employee_id FROM employee_documents WHERE expiry_date IS NOT NULL
);
```

### **Issue: Duplicate emails being sent**

**Possible Cause:**
- `email_reminder_logs` table not properly tracking sent reminders

**Solution:**
```sql
-- Check for duplicate log entries
SELECT
  employee_document_id,
  days_before_expiry,
  DATE(email_sent_at) as sent_date,
  COUNT(*) as count
FROM email_reminder_logs
WHERE employee_document_id IS NOT NULL
GROUP BY employee_document_id, days_before_expiry, DATE(email_sent_at)
HAVING COUNT(*) > 1;
```

### **Issue: Custom reminder intervals not working**

**Possible Cause:**
- Invalid format in `custom_reminder_intervals` field

**Solution:**
```sql
-- Check custom reminder intervals format
SELECT id, name, custom_reminder_intervals, custom_reminder_dates
FROM employee_documents
WHERE custom_reminder_intervals IS NOT NULL
OR custom_reminder_dates IS NOT NULL;
```

**Valid Format:**
- Intervals: `"30,15,7,3"` (comma-separated numbers)
- Dates: `"2025-02-15,2025-03-01"` (comma-separated YYYY-MM-DD dates)

---

## 📧 **EMAIL TEMPLATE**

The system uses the existing `sendDocumentExpiryReminderEmail` method from `emailService.ts`. The email includes:

- **Subject**: `🚨 URGENT: Document Expiry Reminder - [Document Title] ([X] days remaining)`
- **Recipient**: Employee email or company HR email
- **Content**:
  - Employee name
  - Company name
  - Document title and type
  - Expiry date
  - Days until expiry
  - Service name (if linked)
  - Urgency indicator (color-coded based on days remaining)

---

## ✅ **VERIFICATION CHECKLIST**

Before deploying to production, verify:

- [ ] Database migration 1 applied successfully (`custom_reminder_intervals` and `custom_reminder_dates` columns exist)
- [ ] Database migration 2 applied successfully (`employee_document_id` and `employee_id` columns exist)
- [ ] `recipient_type` constraint updated to include 'employee'
- [ ] Test employee document created with expiry date
- [ ] Test reminder sent successfully
- [ ] Email received by employee or company
- [ ] Reminder logged in `email_reminder_logs` table
- [ ] Duplicate prevention working (no duplicate emails on same day)
- [ ] Custom reminder intervals working
- [ ] Custom reminder dates working
- [ ] Fallback to company email working when employee has no email

---

## 🎯 **SUMMARY**

The employee document expiry reminder system is now fully functional and integrated with the existing reminder infrastructure. Key features:

✅ **Automated Reminders**: Employee documents trigger automated expiry reminder emails
✅ **Custom Intervals**: Support for document-specific reminder intervals
✅ **Custom Dates**: Support for specific calendar date reminders
✅ **Email Fallback**: Falls back to company email if employee has no email
✅ **Duplicate Prevention**: Prevents sending duplicate reminders on the same day
✅ **Comprehensive Logging**: All reminders logged for audit trail
✅ **Consistent with Existing System**: Uses same patterns as company/individual document reminders

**Next Steps:**
1. Run database migrations
2. Test with sample employee documents
3. Monitor email logs for successful delivery
4. Set up automated background job to run reminder checks daily

---

## 📅 **SERVICE & DOCUMENT EXPIRY CALENDAR - EMPLOYEE DOCUMENTS ADDED**

The Service & Document Expiry Calendar has been updated to display employee documents alongside company documents, individual documents, and service expiries.

### **Files Modified:**

#### **`src/components/ServiceExpiryCalendar.tsx`**

**Changes Made:**

1. **Updated `DocumentExpiry` interface** (Lines 40-94)
   - Added `employee_id?: string` field
   - Added `type: 'company_document' | 'individual_document' | 'employee_document'`
   - Added `employees` and `employee` objects with employee and company details

2. **Added employee document query** (Lines 259-305)
   - Queries `employee_documents` table with expiry dates
   - Includes joins to `employees`, `companies`, and `service_types` tables
   - Filters by `status = 'valid'` and date range
   - Normalizes data structure to match interface

3. **Updated document state** (Line 354)
   - Combines company, individual, and employee documents into single array
   - All document types displayed together on calendar

4. **Updated console logging** (Lines 356-360)
   - Shows breakdown of document types (company, individual, employee)
   - Includes employee documents in total count

5. **Updated debug data** (Lines 362-374)
   - Includes `employeeDocs` in debug panel
   - Shows employee document count in total

6. **Added employee documents to database check** (Lines 519-547)
   - Queries all employee documents with expiry dates
   - Logs detailed employee document information
   - Includes in total count and toast notification

7. **Updated calendar grid display** (Lines 678-694)
   - Shows employee documents with purple color
   - Displays User icon for employee documents
   - Adds "(Employee)" label for clarity

8. **Updated modal display** (Lines 1059-1093)
   - Shows employee name and email
   - Displays company name if available
   - Uses purple badge for employee documents
   - Distinguishes employee docs from company/individual docs

### **Visual Changes:**

**Calendar Grid:**
- Employee documents appear with **purple text** and **User icon**
- Label shows "(Employee)" for clarity
- Counts toward total expiries for the day

**Modal Display:**
- Employee documents shown in Documents section
- **Purple badge** labeled "Employee Doc"
- Shows employee name, email, and company
- Same layout as company/individual documents

### **Testing Steps:**

1. **Add Employee Document with Expiry Date:**
   - Navigate to Employee Management
   - Edit an employee
   - Add a document with expiry date in current month
   - Save the employee

2. **Open Service & Document Expiry Calendar:**
   - Navigate to calendar view
   - Verify employee document appears on correct date
   - Should see purple text with User icon

3. **Click on Date with Employee Document:**
   - Modal should open showing employee document
   - Should display employee name, email, company
   - Purple badge should say "Employee Doc"

4. **Run Database Check:**
   - Click "Run Database Check" button
   - Console should show employee documents section
   - Toast should include employee document count

### **Expected Results:**

✅ Employee documents visible on calendar grid
✅ Purple color distinguishes employee docs from others
✅ Modal shows employee information correctly
✅ Database check includes employee documents
✅ Console logs show employee document details
✅ Total counts include employee documents


