# Twilio Calling Setup Guide

This guide explains how to set up and use the new Twilio calling functionality for leads.

## 🔧 **Environment Variables Required**

Add these to your `.env` file:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here

# For testing purposes, use your existing Twilio phone number
VITE_TWILIO_PHONE_NUMBER=+1234567890

# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Public URL for webhooks (use your actual domain in production)
PUBLIC_URL=http://localhost:3001

# Feature Flags
DISABLE_NUMBER_PURCHASE_UI=true
```

## 📱 **How It Works**

### **1. Call Flow**
```
User clicks Call button → 
Confirmation dialog shows → 
User confirms → 
API calls Twilio → 
Twilio initiates call → 
Lead receives call from your Twilio number
```

### **2. Call Confirmation Dialog**
- Shows the phone numbers (from/to)
- Displays important warning about real calls
- Requires explicit confirmation
- Shows loading state during call initiation

### **3. Twilio Integration**
- Uses your existing Twilio phone number (from env var)
- Creates outbound calls via Twilio API
- Handles webhooks for call status updates
- Logs all call activities

## 🚀 **Testing the Setup**

### **1. Start the API Server**
```bash
npm run dev:server
```

### **2. Set Environment Variables**
Make sure you have:
- `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` from your Twilio console
- `VITE_TWILIO_PHONE_NUMBER` set to your existing Twilio number
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` configured

### **3. Test a Call**
1. Go to any lead's profile page
2. Click the "Call" button
3. Review the confirmation dialog
4. Click "Make Call" to initiate

## 🔒 **Security & Best Practices**

### **1. Phone Number Validation**
- All phone numbers are normalized to E.164 format
- US numbers automatically get +1 prefix
- Invalid numbers are rejected

### **2. Call Confirmation**
- Users must explicitly confirm before making calls
- Clear warning about real phone calls
- Prevents accidental calls

### **3. Error Handling**
- Graceful fallbacks for API failures
- User-friendly error messages
- Logging for debugging

## 📊 **Call Status Tracking**

The system tracks call status through Twilio webhooks:
- `initiated` - Call is being set up
- `ringing` - Lead's phone is ringing
- `answered` - Call was answered
- `completed` - Call ended normally
- `failed` - Call failed to connect
- `busy` - Lead's phone was busy
- `no-answer` - Call wasn't answered

## 🎯 **Future Enhancements**

### **1. Call Logging**
- Save call records to database
- Track call duration and outcome
- Add call notes and follow-up tasks

### **2. Advanced Features**
- Call scheduling
- Call recording
- Call analytics
- Integration with CRM workflows

### **3. User Experience**
- Call history in lead profile
- Call outcome tracking
- Automated follow-up reminders

## ⚠️ **Important Notes**

1. **Real Calls**: This initiates actual phone calls - test carefully!
2. **Twilio Costs**: Each call will incur Twilio charges
3. **Phone Number**: Must be a verified Twilio number
4. **Webhooks**: Ensure your server is accessible for webhook callbacks

## 🧪 **Troubleshooting**

### **Common Issues**

1. **"Twilio phone number not configured"**
   - Check `VITE_TWILIO_PHONE_NUMBER` in your `.env` file

2. **"Failed to make call"**
   - Verify Twilio credentials are correct
   - Check API server logs for detailed errors

3. **Webhook errors**
   - Ensure `PUBLIC_URL` is accessible
   - Check firewall/network settings

### **Debug Steps**

1. Check API server console for logs
2. Verify environment variables are loaded
3. Test Twilio credentials manually
4. Check network connectivity for webhooks

The calling functionality is now ready to use! Make sure to test with a known good phone number first. 📞✨
