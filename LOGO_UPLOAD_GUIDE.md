# Email Logo Upload Guide

## Problem Fixed
The automated email reminder system was not displaying logos because the email templates were pointing to `https://www.servigens.com/servigens.png`, which is not accessible or doesn't exist.

## Solution Implemented
Updated all email templates in `src/lib/emailService.ts` to use Supabase Storage URLs for reliable logo delivery in emails.

---

## Step 1: Upload Logos to Supabase Storage

You need to upload the logo files from your `public` directory to Supabase Storage so they can be accessed via public URLs in emails.

### Option A: Upload via Supabase Dashboard (Recommended - Easiest)

1. **Open Supabase Dashboard:**
   - Go to https://supabase.com/dashboard
   - Select your project: `servigence@gmail.com's Project`

2. **Navigate to Storage:**
   - Click on "Storage" in the left sidebar
   - Click on the "documents" bucket

3. **Create email-assets folder:**
   - Click "Create folder" button
   - Name it: `email-assets`
   - Click "Create"

4. **Upload logo files:**
   - Click on the `email-assets` folder
   - Click "Upload files" button
   - Upload these files from your `public` directory:
     - `servigens.png` → rename to `servigens.png`
     - `Daman Health Insurance Logo Vector.svg .png` → rename to `daman-logo.png`
     - `abu-dhabi-judicial-department-adjd-logo-vector-1.png` → rename to `adjd-logo.png`
     - `tamm abu dhabi government Logo Vector.svg .png` → rename to `tamm-logo.png`
     - `tas-heel-dubai-uae-seeklogo.png` → rename to `tasheel-logo.png`
     - `the-emirates-new-seeklogo.png` → rename to `emirates-logo.png`
     - `uaeicp-federal-authority-for-identity-citizenshi-seeklogo.png` → rename to `icp-logo.png`

5. **Verify public access:**
   - After uploading, click on any logo file
   - Click "Get URL" or "Copy URL"
   - The URL should look like: `https://[your-project-id].supabase.co/storage/v1/object/public/documents/email-assets/servigens.png`
   - Test the URL in your browser to ensure it loads

### Option B: Upload via Supabase CLI (Advanced)

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Upload files
supabase storage upload documents/email-assets/servigens.png public/servigens.png
supabase storage upload documents/email-assets/daman-logo.png "public/Daman Health Insurance Logo Vector.svg .png"
supabase storage upload documents/email-assets/adjd-logo.png public/abu-dhabi-judicial-department-adjd-logo-vector-1.png
supabase storage upload documents/email-assets/tamm-logo.png "public/tamm abu dhabi government Logo Vector.svg .png"
supabase storage upload documents/email-assets/tasheel-logo.png public/tas-heel-dubai-uae-seeklogo.png
supabase storage upload documents/email-assets/emirates-logo.png public/the-emirates-new-seeklogo.png
supabase storage upload documents/email-assets/icp-logo.png public/uaeicp-federal-authority-for-identity-citizenshi-seeklogo.png
```

---

## Step 2: Verify Logo URLs

After uploading, the logos should be accessible at these URLs:

```
Main Logo:
https://[your-supabase-url]/storage/v1/object/public/documents/email-assets/servigens.png

Partner Logos:
https://[your-supabase-url]/storage/v1/object/public/documents/email-assets/daman-logo.png
https://[your-supabase-url]/storage/v1/object/public/documents/email-assets/adjd-logo.png
https://[your-supabase-url]/storage/v1/object/public/documents/email-assets/tamm-logo.png
https://[your-supabase-url]/storage/v1/object/public/documents/email-assets/tasheel-logo.png
https://[your-supabase-url]/storage/v1/object/public/documents/email-assets/emirates-logo.png
https://[your-supabase-url]/storage/v1/object/public/documents/email-assets/icp-logo.png
```

Replace `[your-supabase-url]` with your actual Supabase project URL from `.env` file (`VITE_SUPABASE_URL`).

---

## Step 3: Test Email Logos

1. **Navigate to Email Diagnostic Tool:**
   - Go to `http://localhost:5173/#email-diagnostic`

2. **Send Test Email:**
   - Click "Send Test Email" button
   - Check your email inbox
   - Verify that the Servigens logo appears at the top
   - Verify that partner logos appear at the bottom

3. **Check for Broken Images:**
   - If logos don't appear, check browser console for errors
   - Verify the URLs are correct and publicly accessible
   - Ensure the `documents` bucket has public access enabled

---

## Step 4: Troubleshooting

### Logos Not Showing in Emails

**Issue:** Logos appear as broken images in emails

**Solutions:**
1. **Check bucket is public:**
   - Go to Supabase Dashboard → Storage → documents bucket
   - Ensure "Public bucket" is enabled

2. **Verify file paths:**
   - Files should be in `documents/email-assets/` folder
   - File names should match exactly (case-sensitive)

3. **Test URLs directly:**
   - Copy the logo URL from the code
   - Paste it in a new browser tab
   - If it doesn't load, the file isn't publicly accessible

4. **Check CORS settings:**
   - Email clients may block images from certain domains
   - Supabase Storage should handle CORS automatically

### Alternative: Use Base64 Encoding (Not Recommended)

If Supabase Storage doesn't work, you can use base64-encoded images:
- This increases email size significantly
- Not recommended for production
- See `LOGO_BASE64_FALLBACK.md` for instructions (if needed)

---

## Files Modified

- `src/lib/emailService.ts` - Updated all email templates to use Supabase Storage URLs

## Email Templates Updated

1. ✅ Service Expiry Reminder Email
2. ✅ Document Expiry Reminder Email  
3. ✅ Payment Due Reminder Email
4. ✅ General Reminder Email
5. ✅ Service Document Expiry Email (sendReminderEmail)

All templates now use the `EMAIL_LOGO_URLS` constant which dynamically constructs URLs based on your Supabase project URL.

---

## Next Steps

1. Upload logos to Supabase Storage (Step 1)
2. Test email sending with diagnostic tool (Step 3)
3. Verify logos display correctly in received emails
4. If issues persist, check troubleshooting section (Step 4)

