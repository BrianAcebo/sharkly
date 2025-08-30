# Twilio Setup Guide for Outgoing Calls

## Prerequisites
- Twilio Account with Account SID and Auth Token
- Twilio API Key and Secret (for client tokens)

## Required Environment Variables

Make sure you have these environment variables set in your `.env` file:

```bash
# Twilio Account
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here

# Twilio API Keys (for client tokens)
TWILIO_API_KEY_SID=your_api_key_sid_here
TWILIO_API_KEY_SECRET=your_api_key_secret_here

# Twilio Phone Number
TWILIO_PHONE_NUMBER=+1234567890

# TwiML App SID (you need to create this)
TWILIO_TWIML_APP_SID=your_twiml_app_sid_here
```

## Creating a TwiML App

1. **Go to Twilio Console**: https://console.twilio.com/
2. **Navigate to Voice > TwiML Apps**
3. **Click "Create new TwiML App"**
4. **Configure the app**:
   - **Friendly Name**: `PaperBoat CRM Voice App`
   - **Voice Configuration**: 
     - **Request URL**: `https://your-domain.com/api/twilio/voice/call`
     - **HTTP Method**: `GET`
   - **Request URL Fallback**: (leave empty)
   - **HTTP Method Fallback**: (leave empty)

5. **Save the app** and copy the **TwiML App SID**
6. **Add the SID to your environment variables**:
   ```bash
   TWILIO_TWIML_APP_SID=APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

## How It Works

1. **WebRTC Client** calls `device.connect()` with phone number
2. **Twilio** receives the request and looks up the TwiML app
3. **Twilio** calls your TwiML app endpoint (`/api/twilio/voice/call`)
4. **Your server** generates TwiML with `<Dial>` instruction
5. **Twilio** executes the TwiML and connects the call

## Testing

After setting up:
1. Restart your API server
2. Try making a call from the dial pad
3. Check the browser console for any errors
4. Check your API server logs for TwiML requests

## Troubleshooting

- **MalformedRequestError (31100)**: Usually means missing or invalid TwiML app SID
- **Device not ready**: Check if the Twilio token is being generated correctly
- **Call fails**: Verify the TwiML app URL is accessible and returns valid XML
