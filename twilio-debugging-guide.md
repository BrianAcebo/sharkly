# Twilio Device Registration Debugging Guide

## What to Look For in the Console

After adding the enhanced logging, you'll see detailed information about why the device is staying unregistered. Here's what to check:

### 1. **Environment Check Logs**
```javascript
Environment check: {
  hasSession: true,
  sessionLength: 1234,
  timestamp: "2024-01-01T12:00:00.000Z"
}
```
**What it means**: Confirms your Supabase session is valid.

### 2. **Token Generation Response**
```javascript
Token generation response: {
  hasToken: true,
  hasPhoneNumber: true,
  responseKeys: ["token", "phoneNumber"],
  timestamp: "2024-01-01T12:00:00.000Z"
}
```
**What it means**: Confirms your API is returning the expected data.

### 3. **Token Details**
```javascript
Token details: {
  hasToken: true,
  tokenLength: 1234,
  tokenStart: "eyJ0eXBlIjoiand0Ijoi...",
  timestamp: "2024-01-01T12:00:00.000Z"
}
```
**What it means**: Confirms the token is properly formatted.

### 4. **Device Properties**
```javascript
Device properties: {
  state: "unregistered",
  hasConnect: true,
  hasToken: true,
  eventNames: ["ready", "error", "unregistered", "registering", "incoming", "connect", "disconnect", "stateChanged"]
}
```
**What it means**: Confirms the device object is properly created.

### 5. **Device State Changes**
```javascript
Device state changed: {
  from: "unregistered",
  to: "registering",
  timestamp: "2024-01-01T12:00:00.000Z"
}
```
**What it means**: Shows the device is attempting to register.

### 6. **Registration Attempt Details**
```javascript
Registration attempt details: {
  deviceState: "registering",
  hasToken: true,
  tokenLength: 1234,
  timestamp: "2024-01-01T12:00:00.000Z"
}
```
**What it means**: Shows the device is actively trying to register.

### 7. **Periodic State Checks**
```javascript
Device state check: {
  state: "unregistered",
  status: "Registering",
  hasToken: true,
  timestamp: "2024-01-01T12:00:00.000Z"
}
```
**What it means**: Tracks the device state over time.

## Common Issues and Solutions

### **Issue 1: Device Never Changes from "unregistered"**
**Symptoms**: Device state stays "unregistered" and never shows "registering"
**Possible Causes**:
- Invalid or expired Twilio token
- Missing `TWILIO_TWIML_APP_SID` environment variable
- Network connectivity issues to Twilio
- Incorrect Twilio account credentials

**Check**:
```bash
# Verify environment variables
echo $TWILIO_TWILIO_APP_SID
echo $TWILIO_ACCOUNT_SID
echo $TWILIO_API_KEY_SID
echo $TWILIO_API_KEY_SECRET
```

### **Issue 2: Device Shows "registering" but Never "ready"**
**Symptoms**: Device goes to "registering" but times out
**Possible Causes**:
- TwiML app URL is not accessible
- TwiML app returns invalid XML
- Twilio service issues
- Firewall blocking Twilio connections

**Check**:
- Visit your TwiML app URL directly: `https://your-domain.com/api/twilio/voice/call`
- Should return valid XML, not HTML or error pages

### **Issue 3: Token Generation Fails**
**Symptoms**: "Token generation failed" error
**Possible Causes**:
- Missing environment variables
- Invalid Twilio credentials
- Database connection issues (for agent phone numbers)

**Check**:
- API server logs for detailed error messages
- Verify all required environment variables are set

### **Issue 4: Device Shows "Error" Status**
**Symptoms**: Device goes to "Error" status immediately
**Check the detailed error log**:
```javascript
Detailed device error: {
  message: "Authentication failed",
  code: 20003,
  description: "Authentication failed",
  explanation: "The provided token is invalid or expired",
  deviceState: "unregistered",
  timestamp: "2024-01-01T12:00:00.000Z"
}
```

## Debugging Steps

### **Step 1: Check Environment Variables**
```bash
# In your API server environment
echo "TWILIO_ACCOUNT_SID: $TWILIO_ACCOUNT_SID"
echo "TWILIO_API_KEY_SID: $TWILIO_API_KEY_SID"
echo "TWILIO_API_KEY_SECRET: $TWILIO_API_KEY_SECRET"
echo "TWILIO_TWIML_APP_SID: $TWILIO_TWIML_APP_SID"
echo "TWILIO_PHONE_NUMBER: $TWILIO_PHONE_NUMBER"
```

### **Step 2: Test TwiML App Endpoint**
```bash
# Test if your TwiML app endpoint is accessible
curl -X GET "https://your-domain.com/api/twilio/voice/call?To=%2B1234567890"
# Should return valid XML, not HTML or errors
```

### **Step 3: Check Twilio Console**
- Go to https://console.twilio.com/
- Check if your TwiML app exists and is configured correctly
- Verify the Request URL points to your endpoint
- Check if there are any error logs in the Twilio console

### **Step 4: Test Token Generation**
```bash
# Test token generation endpoint directly
curl -X POST "https://your-domain.com/api/twilio/tokens/generate-token" \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN" \
  -H "Content-Type: application/json"
```

## Expected Flow

1. **Environment Check** ✅ - Session valid
2. **Token Generation** ✅ - Token received
3. **Device Creation** ✅ - Device object created
4. **State Change** ✅ - "unregistered" → "registering"
5. **Registration** ✅ - Device connects to Twilio
6. **Ready Event** ✅ - Device becomes "ready"

If any step fails, the logs will show exactly where and why.

## Quick Fixes

### **Most Common Fix**: Missing TwiML App SID
```bash
# Set this environment variable
export TWILIO_TWIML_APP_SID=APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### **Token Expiration**: Regenerate tokens
- Check if your Supabase session is still valid
- The device will automatically try to reconnect

### **Network Issues**: Check connectivity
- Ensure your server can reach Twilio's servers
- Check firewall rules for outbound HTTPS connections
