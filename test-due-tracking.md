# Due Tracking System - Testing Guide

## Overview
The Due tracking system has been implemented to track unpaid amounts when companies exceed their credit limits during service billing.

## Components Implemented

### 1. Database Schema
- **File**: `project/database/create_dues_table.sql`
- **Table**: `dues`
- **Key Fields**: 
  - `company_id`, `employee_id`, `service_billing_id`
  - `original_amount`, `paid_amount`, `due_amount`
  - `service_date`, `due_date`, `status`, `priority`

### 2. Database Helper Functions
- **File**: `project/src/lib/supabase.ts`
- **Functions Added**:
  - `getDues()` - Retrieve all dues with company/employee details
  - `createDue()` - Create new due record
  - `updateDue()` - Update existing due record
  - `markDueAsPaid()` - Record payment and update status
  - `getDuesByCompany()` - Get dues for specific company
  - `getCompanyCreditUsage()` - Calculate credit usage statistics

### 3. Types and Interfaces
- **File**: `project/src/types.ts`
- **Added**: `Due` interface with all necessary fields

### 4. Service Billing Integration
- **File**: `project/src/components/ServiceBilling.tsx`
- **Changes**: 
  - Added credit limit checking during billing creation
  - Automatic due creation when credit limit exceeded
  - Enhanced success messages with due information

### 5. RemindersServices Component
- **File**: `project/src/components/RemindersServices.tsx`
- **Changes**:
  - Added "Due" tab to navigation
  - Created `renderDuesList()` function
  - Added payment recording modal
  - Updated overview stats to include due information
  - Added search and filtering for dues

### 6. Company Management
- **File**: `project/src/components/CompanyEditModal.tsx`
- **Changes**:
  - Added credit usage summary display
  - Shows current credit usage, outstanding dues, available credit
  - Visual progress bar for credit usage percentage

## Testing Steps

### 1. Database Setup
```sql
-- Run the SQL script to create the dues table
-- File: project/database/create_dues_table.sql
```

### 2. Test Service Billing with Credit Limit
1. Navigate to Service Billing
2. Create a billing for a company
3. Ensure the total amount exceeds the company's available credit
4. Verify that a due entry is created automatically
5. Check the success message shows due information

### 3. Test Due Management
1. Navigate to Reminders & Services
2. Click on the "Due" tab
3. Verify dues are displayed with company and employee details
4. Test search and filtering functionality
5. Click "Record Payment" on a due entry
6. Enter payment details and submit
7. Verify the due amount is updated correctly

### 4. Test Credit Usage Display
1. Navigate to a company's edit modal
2. Verify the credit usage summary is displayed
3. Check that it shows:
   - Credit limit
   - Outstanding dues
   - Available credit
   - Usage percentage with color-coded progress bar

## Expected Behavior

### Credit Limit Logic
- When service billing total ≤ available credit: Normal billing, no due created
- When service billing total > available credit: 
  - Company pays up to available credit
  - Remaining amount becomes due
  - Due entry created with appropriate status

### Due Status Flow
- `pending`: No payment received
- `partial`: Some payment received, amount still outstanding
- `paid`: Full payment received
- `overdue`: Past due date
- `cancelled`: Due cancelled/written off

### Payment Recording
- Partial payments allowed
- Status automatically updated based on payment amount
- Payment history tracked with dates and methods

## Key Features

1. **Automatic Due Creation**: When companies exceed credit limits
2. **Comprehensive Due Management**: View, search, filter, and manage dues
3. **Payment Recording**: Easy payment entry with status updates
4. **Credit Usage Tracking**: Real-time credit usage display
5. **Integration**: Seamless integration with existing billing system

## Files Modified/Created

### New Files
- `project/database/create_dues_table.sql`

### Modified Files
- `project/src/types.ts` - Added Due interface
- `project/src/lib/supabase.ts` - Added due management functions
- `project/src/components/ServiceBilling.tsx` - Added credit limit checking
- `project/src/components/RemindersServices.tsx` - Added Due tab and management
- `project/src/components/CompanyEditModal.tsx` - Added credit usage display

## Next Steps for Production

1. **Database Migration**: Run the SQL script to create the dues table
2. **Testing**: Thoroughly test all scenarios with different credit limits
3. **User Training**: Train users on the new due management features
4. **Monitoring**: Monitor credit usage and due creation patterns
5. **Reporting**: Consider adding due reports and analytics

## Notes

- The system preserves existing functionality while adding due tracking
- All due-related operations are logged for audit purposes
- The UI provides clear feedback when dues are created or updated
- Credit usage is calculated in real-time for accurate display
