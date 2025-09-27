# 📧 Servigence Email System - Resend Integration

## 🚀 Overview

The Servigence CRM system now uses **Resend** for all email communications, replacing the previous Brevo integration. The system automatically sends professional emails for registration confirmations and reminders.

## 🔧 System Architecture

### Backend Email Server
- **File**: `server.js`
- **Port**: `3001`
- **API Endpoint**: `http://localhost:3001/api/send-email`
- **Health Check**: `http://localhost:3001/api/health`

### Frontend Email Service
- **File**: `src/lib/emailService.ts`
- **Integration**: Communicates with backend server
- **Error Handling**: Comprehensive logging and fallback messages

## 📨 Email Types

### 1. Company Welcome Email
- **Trigger**: Company registration completion
- **Recipients**: Primary Email + Secondary Email (if different)
- **Template**: Professional welcome with company branding
- **Subject**: `Welcome to Servigence - [Company Name]`

### 2. Individual Welcome Email
- **Trigger**: Individual registration completion
- **Recipients**: Primary Email + Secondary Email (if different)
- **Template**: Personalized welcome message
- **Subject**: `Welcome to Servigence - [Individual Name]`

### 3. Due Payment Reminders
- **Trigger**: 10 days before payment due date
- **Recipients**: Company primary/secondary email
- **Template**: Payment details with urgency indicators
- **Subject**: `[URGENT/IMPORTANT/REMINDER]: Payment Due in X days`

### 4. Document Expiry Reminders
- **Trigger**: 10 days before document expiry
- **Recipients**: Company or individual email
- **Template**: Document renewal notice
- **Subject**: `[URGENT/IMPORTANT/REMINDER]: [Document Type] Expiring in X days`

## 🎛️ Control Features

### Global Email Toggle
- **Location**: Reminders & Services → Settings
- **Default**: Enabled
- **Function**: Master switch for all email notifications

### Individual Reminder Toggles
- **Location**: Each reminder item
- **Icon**: Toggle switch (Green = Enabled, Gray = Disabled)
- **Function**: Enable/disable specific reminder emails

## 🚀 Getting Started

### 1. Start Both Servers
```bash
# Option 1: Use the batch file
./start-servers.bat

# Option 2: Manual start
# Terminal 1: Email Server
node server.js

# Terminal 2: Main App
npm run dev
```

### 2. Verify Email System
```bash
# Test email functionality
npm run test-email
```

### 3. Check Server Status
- Email Server: http://localhost:3001/api/health
- Main App: http://localhost:5175

## 🔍 Troubleshooting

### Email Not Sending
1. **Check Email Server**: Ensure `node server.js` is running on port 3001
2. **Check Console**: Look for error messages in browser console
3. **Test API**: Run `npm run test-email` to verify backend
4. **Check Logs**: Monitor email server terminal for error messages

### Common Issues

#### "Email server is not available"
- **Cause**: Email server (port 3001) is not running
- **Solution**: Start email server with `node server.js`

#### "CORS Error"
- **Cause**: Frontend trying to access backend
- **Solution**: Ensure both servers are running on correct ports

#### "Resend API Error"
- **Cause**: Invalid API key or rate limits
- **Solution**: Check API key in `server.js`

## 📋 Configuration

### Resend API Settings
```javascript
// server.js
const resend = new Resend('re_auAuU6Bd_4ojqhGZV3UCofptuZ2pj7phB');
```

### Email Templates
- **From**: `Servigence <onboarding@resend.dev>`
- **Styling**: Professional HTML with inline CSS
- **Branding**: Servigence colors and logo

## 🔄 Email Flow

### Company Registration
1. User completes company registration form
2. System saves company to database
3. System calls `emailService.sendWelcomeEmail()`
4. Email service sends request to backend server
5. Backend server calls Resend API
6. Welcome email sent to primary + secondary emails
7. Success/failure message shown to user

### Automatic Reminders
1. System checks for due dates every time Reminders page loads
2. Filters items due within 10 days
3. Sends reminder emails if notifications enabled
4. Logs success/failure for each email

## 📊 Monitoring

### Success Indicators
- ✅ Green checkmarks in console logs
- ✅ Toast notifications with email addresses
- ✅ Email server logs showing successful sends

### Error Indicators
- ❌ Red error messages in console
- ⚠️ Warning toast notifications
- ❌ Email server error logs

## 🛠️ Development

### Adding New Email Types
1. Add interface to `emailService.ts`
2. Create email template method
3. Add trigger logic in appropriate component
4. Test with `npm run test-email`

### Modifying Templates
- Edit HTML templates in `emailService.ts`
- Use inline CSS for email client compatibility
- Test across different email clients

## 📞 Support

For email system issues:
1. Check this README
2. Review console logs
3. Test with `npm run test-email`
4. Verify both servers are running
5. Check Resend API status

---

**System Status**: ✅ Operational
**Last Updated**: Current
**API Provider**: Resend
**Integration**: Complete
