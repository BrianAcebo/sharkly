# Twilio Setup Guide

## Required Environment Variables

To fix the 500 error you're seeing, you need to set up the following environment variables in your `.env` file:

### Essential Variables (Required)
```bash
# Twilio Account Information
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here

# Twilio API Key (for Client SDK)
TWILIO_API_KEY_SID=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_KEY_SECRET=your_api_key_secret_here

# Phone Number for Development
VITE_TWILIO_PHONE_NUMBER=+1234567890
```

### Optional Variables (Recommended)
```bash
# TwiML Application SID (for outgoing calls)
TWILIO_TWIML_APP_SID=APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Alternative phone number variable
TWILIO_PHONE_NUMBER=+1234567890
```

## How to Get These Values

### 1. Twilio Account SID and Auth Token
1. Go to [Twilio Console](https://console.twilio.com/)
2. Your Account SID and Auth Token are on the main dashboard

### 2. API Key SID and Secret
1. In Twilio Console, go to **Account** → **API Keys & Tokens**
2. Click **Create API Key**
3. Give it a name (e.g., "WebRTC Client")
4. Copy the SID and Secret

### 3. Phone Number
1. Go to **Phone Numbers** → **Manage** → **Active Numbers**
2. Copy your Twilio phone number (should start with +1)

### 4. TwiML Application SID (Optional but Recommended)
1. Go to **Voice** → **TwiML** → **TwiML Apps**
2. Create a new TwiML App or use existing one
3. Set the Voice URL to: `https://your-domain.com/api/twilio/voice/call`
4. Copy the Application SID

## Testing Your Configuration

After setting up your environment variables, you can test the configuration by visiting:
```
http://localhost:3001/api/twilio/tokens/config-check
```

This will show you which environment variables are properly set.

## Common Issues

### 1. Missing API Key
- **Error**: "Missing required Twilio environment variables"
- **Solution**: Create an API Key in Twilio Console

### 2. Invalid Phone Number Format
- **Error**: Phone number validation fails
- **Solution**: Use E.164 format (+1234567890)

### 3. TwiML App Not Set
- **Warning**: "TWILIO_TWIML_APP_SID not set"
- **Solution**: Create a TwiML App in Twilio Console

## Development vs Production

### Development
- Use `VITE_TWILIO_PHONE_NUMBER` for easy testing
- TwiML App SID is optional but recommended

### Production
- Use proper TwiML App configuration
- Set up proper webhook URLs
- Use environment-specific phone numbers

## Next Steps

1. Set up the environment variables above
2. Restart your development server
3. Test the token generation endpoint
4. Try making a call from the calls page

If you're still getting errors, check the server logs for more detailed error messages.
