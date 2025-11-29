# Testing Guide: Unified Service & Document Expiry Reminder System

## 🚀 Quick Start Testing

### Prerequisites
1. Ensure you have at least one company or individual in the system
2. Access to the admin panel
3. Valid email addresses configured for test customers

---

## Test 1: Service Expiry Reminders

### Step 1: Create Test Service Billing
1. Navigate to **Service Billing**
2. Click **"Add New Service Billing"**
3. Fill in the form:
   - Select a company or individual
   - Select a service type
   - Set **Expiry Date** = 7 days from today
   - Fill in other required fields
4. Click **"Save Service Billing"**

### Step 2: Configure Service Reminder Settings
1. Navigate to **Settings → Expiry Reminder Settings**
2. In the **Service Expiry Reminders** section (left column):
   - Toggle **"Service Reminders"** to **Enabled**
   - Add interval: **7** days
   - Click **"Save All Settings"**

### Step 3: Run Manual Reminder Check
1. Navigate to **Service Expiry Reminder Manager**
2. Click **"Run Reminder Check Now"** button
3. **Expected Console Output:**
   ```
   🔔 Starting service & document expiry reminder check...
   📋 Checking SERVICE expiries...
   Service reminder intervals: [7]
     📅 Checking for services expiring on 2025-12-13 (7 days from now)...
     ✅ Found 1 service(s) expiring on 2025-12-13
     
     🔍 Processing service billing [ID]:
       - Client Type: Company
       - Client Name: [Company Name]
       - Service Type: [Service Type]
       - Email: [Email Address]
       - Invoice: [Invoice Number]
       - Expiry Date: 2025-12-13
       📤 Sending reminder email...
       ✅ Email sent successfully
   ```

### Step 4: Verify Email Sent
1. Check the email inbox for the configured email address
2. **Expected Email:**
   - Subject: `⚠️ IMPORTANT: Service Expiry Reminder - [Service Name] (7 days remaining)`
   - Professional HTML template with company logo
   - Service details displayed
   - Urgency indicator (orange for 7 days)

### Step 5: Check Calendar
1. Navigate to **Calendar** tab
2. Find the date 7 days from today
3. **Expected:**
   - Date cell shows a red badge with count "1"
   - Red file icon with service name displayed
4. Click on the date
5. **Expected Modal:**
   - Shows "Services (1)" section
   - Displays service details (client name, service type, invoice, etc.)

### Step 6: Check Reminder Logs
1. Navigate to **Logs** tab
2. **Expected:**
   - New log entry for the sent reminder
   - Shows: recipient email, reminder type "service_expiry", interval "7", timestamp

### Step 7: Test Duplicate Prevention
1. Click **"Run Reminder Check Now"** again
2. **Expected Console Output:**
   ```
   ✅ Reminder already sent today (7 days before)
   ```
3. **Expected:** No new email sent, no new log entry

---

## Test 2: Document Expiry Reminders

### Step 1: Create Test Document
1. Navigate to **Customer Registration → Companies** (or Individuals)
2. Select a company/individual
3. Click **"Documents & Certificates"** tab
4. Click **"Add Document"**
5. Fill in the form:
   - Title: "Trade License"
   - Document Type: "License"
   - Document Number: "TL-12345"
   - **Expiry Date** = 15 days from today
   - Upload a file
   - Status: "Active"
6. Click **"Save"**

### Step 2: Configure Document Reminder Settings
1. Navigate to **Settings → Expiry Reminder Settings**
2. In the **Document Expiry Reminders** section (right column):
   - Toggle **"Document Reminders"** to **Enabled**
   - Add interval: **15** days
   - Click **"Save All Settings"**

### Step 3: Run Manual Reminder Check
1. Navigate to **Service Expiry Reminder Manager**
2. Click **"Run Reminder Check Now"** button
3. **Expected Console Output:**
   ```
   📄 Checking DOCUMENT expiries...
   Document reminder intervals: [15]
     📅 Checking for documents expiring on 2025-12-21 (15 days from now)...
     ✅ Found 1 company document(s) expiring on 2025-12-21
     
     🔍 Processing company document [ID]:
       - Company: [Company Name]
       - Document: Trade License
       - Type: License
       - Email: [Email Address]
       - Expiry Date: 2025-12-21
       📤 Sending document reminder email...
       ✅ Email sent successfully
   ```

### Step 4: Verify Email Sent
1. Check the email inbox
2. **Expected Email:**
   - Subject: `📅 REMINDER: Document Expiry Reminder - Trade License (15 days remaining)`
   - Professional HTML template with company logo
   - Document details (title, type, number)
   - Urgency indicator (blue for 15 days)

### Step 5: Check Calendar
1. Navigate to **Calendar** tab
2. Find the date 15 days from today
3. **Expected:**
   - Date cell shows an orange badge with count
   - Orange file icon with document title displayed
4. Click on the date
5. **Expected Modal:**
   - Shows "Documents (1)" section
   - Displays document details (title, type, number, etc.)

### Step 6: Check Reminder Logs
1. Navigate to **Logs** tab
2. **Expected:**
   - New log entry for the document reminder
   - Shows: recipient email, reminder type "document_expiry", interval "15", timestamp

---

## Test 3: Combined Service & Document Expiries

### Step 1: Create Multiple Expiring Items
1. Create a service billing with expiry date = 30 days from today
2. Create a document with expiry date = 30 days from today (same date)

### Step 2: Configure Both Reminder Types
1. Navigate to **Settings → Expiry Reminder Settings**
2. Enable both service and document reminders
3. Add interval **30** days to both
4. Save settings

### Step 3: Run Manual Check
1. Click **"Run Reminder Check Now"**
2. **Expected Console Output:**
   ```
   📋 Checking SERVICE expiries...
     ✅ Found 1 service(s) expiring on [date]
     ✅ Email sent successfully
   
   📄 Checking DOCUMENT expiries...
     ✅ Found 1 company document(s) expiring on [date]
     ✅ Email sent successfully
   
   ✅ Expiry reminder check completed: Checked 2 item(s), sent 2 reminder(s), 0 error(s)
   ```

### Step 4: Check Calendar
1. Navigate to **Calendar** tab
2. Find the date 30 days from today
3. **Expected:**
   - Date cell shows badge with count "2"
   - Both red (service) and orange (document) icons displayed
4. Click on the date
5. **Expected Modal:**
   - Shows "Services (1)" section with service details
   - Shows "Documents (1)" section with document details

---

## Test 4: Multiple Intervals

### Step 1: Configure Multiple Intervals
1. Navigate to **Settings → Expiry Reminder Settings**
2. For service reminders, add intervals: **30, 15, 7, 3, 1** days
3. For document reminders, add intervals: **30, 15, 7** days
4. Save settings

### Step 2: Create Test Items
1. Create a service billing with expiry date = 30 days from today
2. Create a document with expiry date = 30 days from today

### Step 3: Run Manual Check
1. Click **"Run Reminder Check Now"**
2. **Expected:** Emails sent for 30-day interval

### Step 4: Wait and Test Again
1. After 15 days, run the check again
2. **Expected:** Emails sent for 15-day interval
3. After 7 more days, run the check again
4. **Expected:** Emails sent for 7-day interval

---

## ✅ Success Criteria

### Service Reminders
- [x] Service billings with expiry dates are detected
- [x] Emails are sent at configured intervals
- [x] Email contains correct service information
- [x] Calendar shows service expiries with red icon
- [x] Logs track all sent service reminders
- [x] Duplicate prevention works

### Document Reminders
- [x] Documents with expiry dates are detected
- [x] Emails are sent at configured intervals
- [x] Email contains correct document information
- [x] Calendar shows document expiries with orange icon
- [x] Logs track all sent document reminders
- [x] Duplicate prevention works

### Unified System
- [x] Both types work independently
- [x] Both types can be enabled/disabled separately
- [x] Calendar shows both types on same date
- [x] Logs show both types
- [x] Settings save correctly for both types

---

## 🐛 Troubleshooting

### No Emails Sent
1. Check that reminders are enabled in settings
2. Verify expiry date matches a configured interval
3. Check that email addresses are valid
4. Check console logs for errors
5. Verify Supabase Edge Function is working

### Emails Not Received
1. Check spam/junk folder
2. Verify email address is correct in customer record
3. Check reminder logs to confirm email was sent
4. Test with a different email address

### Calendar Not Showing Items
1. Verify expiry dates are set correctly
2. Check that items are within the current month view
3. Refresh the page
4. Check browser console for errors

### Duplicate Emails
1. This should not happen - check logs
2. Verify `last_reminder_sent_at` is being updated
3. Check for multiple manual runs on same day

---

**Testing Complete!** 🎉


