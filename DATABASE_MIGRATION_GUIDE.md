# Database Migration Guide - Fix Service Billing Discount Column

## 🎯 **IMMEDIATE FIX NEEDED**

### Issue:
- **Error**: `PGRST204: Could not find the 'discount' column of 'service_billings' in the schema cache`
- **Impact**: Service billing creation failing
- **Solution**: Add missing discount column to database

## 🚀 **QUICK FIX - Execute This Script**

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Create a new query

### Step 2: Execute Discount Column Fix
Copy and paste this SQL script:

```sql
-- Add discount column to service_billings table
-- This fixes the immediate PGRST204 error for the discount column

-- Add the discount column if it doesn't exist
ALTER TABLE service_billings 
ADD COLUMN IF NOT EXISTS discount DECIMAL(10,2) DEFAULT 0.00;

-- Add constraint for discount to ensure it's not negative
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'chk_service_billings_discount'
        AND table_name = 'service_billings'
    ) THEN
        ALTER TABLE service_billings
        ADD CONSTRAINT chk_service_billings_discount
        CHECK (discount >= 0);
    END IF;
END $$;

-- Create index for discount column for better performance
CREATE INDEX IF NOT EXISTS idx_service_billings_discount ON service_billings(discount);

-- Verify the column was added successfully
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_billings' AND column_name = 'discount'
    ) THEN
        RAISE EXCEPTION 'Failed to add discount column to service_billings table';
    ELSE
        RAISE NOTICE 'Discount column added successfully to service_billings table!';
    END IF;
END $$;
```

### Step 3: Execute the Script
1. Click **Run** button
2. Wait for completion
3. You should see: `Discount column added successfully to service_billings table!`

## ✅ **VERIFICATION**

### Check if Fix Worked:
1. **Test Service Billing Creation**: Try creating a new service billing
2. **No More Errors**: Should not see PGRST204 discount column error
3. **Discount Functionality**: Discount field should work in UI

### Expected Results:
- ✅ Service billing creation works without errors
- ✅ Discount amounts can be entered and saved
- ✅ Total amounts calculated correctly with discounts
- ✅ Invoices generated with discount information

## 🔧 **COMPLETE MIGRATION (OPTIONAL)**

### For Full System Enhancement:
If you want to add all missing columns (payment tracking, etc.), execute the complete migration script:

**File**: `database/fix_missing_columns.sql`

**Includes**:
- ✅ discount column (immediate fix)
- ✅ paid_amount column (payment tracking)
- ✅ last_payment_date column (payment history)
- ✅ payment_status column (payment status)
- ✅ card_id column (payment cards)
- ✅ advance_payments table (detailed payments)

## 📊 **TROUBLESHOOTING**

### If Script Fails:
1. **Check Permissions**: Ensure you have admin access to database
2. **Check Table Exists**: Verify service_billings table exists
3. **Check Syntax**: Ensure no copy/paste errors in SQL

### Common Issues:
- **Timeout**: If connection times out, try again
- **Permissions**: Contact database admin if access denied
- **Existing Column**: If column already exists, script will skip safely

### Error Messages:
- **"column already exists"**: Safe to ignore, column already added
- **"constraint already exists"**: Safe to ignore, constraint already added
- **"Failed to add discount column"**: Contact support, manual intervention needed

## 🎉 **SUCCESS CONFIRMATION**

### After Successful Migration:
1. **Service Billing Works**: Create test service billing with discount
2. **No Database Errors**: No more PGRST204 errors
3. **Discount Calculations**: Total amounts properly calculated
4. **Invoice Generation**: Discounts appear on invoices

### Test Checklist:
- [ ] Create new service billing
- [ ] Enter discount amount
- [ ] Verify total calculation
- [ ] Generate invoice
- [ ] Check discount appears on invoice

## 📞 **SUPPORT**

### If Issues Persist:
1. **Check Error Messages**: Note exact error text
2. **Verify Column Exists**: Run `SELECT discount FROM service_billings LIMIT 1;`
3. **Contact Support**: Provide error details and steps taken

### Quick Verification Query:
```sql
-- Check if discount column exists
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'service_billings' 
AND column_name = 'discount';
```

**Expected Result**: Should return one row showing discount column details

## 🎯 **SUMMARY**

**Immediate Action**: Execute the discount column script above
**Expected Time**: 1-2 minutes
**Impact**: Fixes service billing creation errors
**Risk**: Low (safe column addition with constraints)

**Status After Fix**: Service billing system will be fully operational with discount functionality! 🎉
