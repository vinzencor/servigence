# Payment Cards Integration - Testing Guide

## Database Setup Verification

### 1. Verify Database Schema
The following database changes have been applied:

```sql
-- Check if card_id column exists in service_billings
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'service_billings' AND column_name = 'card_id';

-- Check foreign key constraint
SELECT tc.constraint_name, tc.table_name, kcu.column_name, 
       ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name 
JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name 
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'service_billings' AND kcu.column_name = 'card_id';
```

### 2. Test Data Setup
Before testing, ensure you have:
- At least 2-3 payment cards in the `payment_cards` table
- Some service billings with `cash_type = 'card'` and proper `card_id` values

## Testing Steps

### 1. Test Card Selection in Service Billing Form

#### Steps:
1. Navigate to Service Billing page
2. Click "Create New Billing"
3. Select "Card" as Cash Type
4. Verify the card dropdown appears
5. Check that cards show: `{card_name} - Available: AED {amount} ({percentage}% used)`

#### Expected Results:
- ✅ Card dropdown only appears when Cash Type = "card"
- ✅ Cards are fetched from Payment Cards Management (same data source)
- ✅ Cards display available credit and utilization percentage
- ✅ Only active cards are shown
- ✅ Default card (if any) appears first or is highlighted

#### Troubleshooting:
- If cards don't load: Check browser console for API errors
- If balance calculation fails: Verify `card_id` column exists in `service_billings`
- If dropdown is empty: Check that `payment_cards` table has active cards

### 2. Test Card Balance Widget on Dashboard

#### Steps:
1. Navigate to Dashboard
2. Locate the "Card Balances" widget
3. Verify it shows all active payment cards
4. Check balance calculations and utilization bars
5. Test the refresh button

#### Expected Results:
- ✅ Widget displays all active payment cards
- ✅ Shows current balance/available credit for each card
- ✅ Visual progress bars with color coding (green/yellow/orange/red)
- ✅ Total available credit across all cards
- ✅ Today's usage summary
- ✅ Refresh functionality works

#### Troubleshooting:
- If widget shows loading forever: Check API calls in browser console
- If balances are incorrect: Verify service billings have correct `card_id` values
- If no cards show: Check `payment_cards` table has `is_active = true` records

### 3. Test Daily Card Usage Summary

#### Steps:
1. Navigate to Dashboard
2. Locate the "Daily Card Summary" widget
3. Change the date to test historical data
4. Click "Show Transaction Details" to expand
5. Test the "Day Close" report download

#### Expected Results:
- ✅ Shows all card transactions for selected date
- ✅ Card-by-card breakdown with usage amounts
- ✅ Remaining balance calculations
- ✅ Transaction details toggle works
- ✅ Day close report downloads successfully
- ✅ Date selector works for historical data

#### Troubleshooting:
- If no transactions show: Create test service billings with `cash_type = 'card'`
- If balances are wrong: Check that `card_id` is properly set in service billings
- If report download fails: Check browser console for errors

### 4. Test Service Billing Integration

#### Steps:
1. Navigate to Service Billing page
2. Click on "Billing List" tab
3. Verify the compact daily summary appears at the top
4. Create a new service billing with card payment
5. Verify it appears in the daily summary

#### Expected Results:
- ✅ Daily summary appears in billing list view
- ✅ New card transactions appear immediately
- ✅ Balance calculations update in real-time
- ✅ Card selection works in both create and edit forms

## API Testing

### Test API Functions Directly
Open browser console and test:

```javascript
// Test card balances
dbHelpers.getCardBalances().then(console.log);

// Test today's transactions
dbHelpers.getTodayCardTransactions().then(console.log);

// Test daily summary
dbHelpers.getDailyCardSummary().then(console.log);

// Test payment cards
dbHelpers.getPaymentCards().then(console.log);
```

## Common Issues and Solutions

### Issue 1: "column service_billings.card_id does not exist"
**Solution:** Run the database migration:
```sql
ALTER TABLE service_billings ADD COLUMN IF NOT EXISTS card_id UUID;
ALTER TABLE service_billings ADD CONSTRAINT fk_service_billings_card_id 
FOREIGN KEY (card_id) REFERENCES payment_cards(id) ON DELETE SET NULL;
```

### Issue 2: "Could not find a relationship between service_billings and payment_cards"
**Solution:** The foreign key constraint needs to be properly created. Verify with:
```sql
SELECT * FROM information_schema.table_constraints 
WHERE constraint_type = 'FOREIGN KEY' AND table_name = 'service_billings';
```

### Issue 3: Card balances showing as 0 or incorrect
**Solution:** 
1. Verify existing service billings have `card_id` set when `cash_type = 'card'`
2. Update existing records if needed:
```sql
-- Example: Update existing card transactions (adjust card IDs as needed)
UPDATE service_billings 
SET card_id = 'your-card-id-here' 
WHERE cash_type = 'card' AND card_id IS NULL;
```

### Issue 4: Cards not appearing in dropdown
**Solution:**
1. Check that cards exist: `SELECT * FROM payment_cards WHERE is_active = true;`
2. Verify API function: `dbHelpers.getPaymentCards()`
3. Check browser console for errors

## Performance Testing

### Load Testing
1. Create multiple service billings with card payments
2. Test dashboard loading with 50+ transactions
3. Verify day-close report generation with large datasets
4. Check API response times

### Expected Performance:
- Dashboard widgets should load within 2-3 seconds
- Card balance calculations should complete within 1 second
- Day-close reports should generate within 5 seconds for 100+ transactions

## Security Testing

### Verify RLS Policies
1. Test that users only see their authorized cards
2. Verify service billings are properly filtered by user permissions
3. Check that card transactions respect existing security policies

## Success Criteria

All tests pass when:
- ✅ Card selection works in Service Billing forms
- ✅ Dashboard widgets display correctly
- ✅ Balance calculations are accurate
- ✅ Daily summaries show correct data
- ✅ Day-close reports generate successfully
- ✅ No console errors during normal operation
- ✅ Performance is acceptable (< 3 seconds for most operations)
- ✅ Security policies are maintained

## Next Steps After Testing

1. **Production Deployment**: Deploy database migrations to production
2. **User Training**: Train users on new card management features
3. **Monitoring**: Set up monitoring for API performance
4. **Backup**: Ensure day-close reports are properly archived
5. **Documentation**: Update user documentation with new features
