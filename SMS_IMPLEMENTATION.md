# Twilio SMS Implementation for Paperboat CRM

This document outlines the complete implementation of Twilio SMS functionality for the Paperboat CRM system.

## 🏗️ Architecture Overview

The system consists of two main parts:
1. **Backend Server** (`/server`) - Express.js server with Twilio integration
2. **Frontend UI** (`/src`) - React components for SMS management

## 🚀 Backend Server

### Setup & Installation

1. **Navigate to server directory:**
   ```bash
   cd server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Configuration:**
   ```bash
   cp env.example .env
   ```
   
   Fill in your credentials:
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   PUBLIC_URL=https://api.yourdomain.com
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

### API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/admin/twilio/buy-number` | ✅ | Purchase new phone number |
| `GET` | `/me/number` | ✅ | Get agent's phone number |
| `POST` | `/api/sms/send` | ✅ | Send SMS message |
| `POST` | `/webhooks/twilio/sms-inbound` | ❌ | Handle incoming SMS |
| `POST` | `/webhooks/twilio/sms-status` | ❌ | Handle status updates |

### Database Schema

The server expects these tables in Supabase:

```sql
-- Agent phone number assignments
create table agent_phone_numbers (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references auth.users(id) on delete cascade not null,
  phone_number text not null unique,
  twilio_sid text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- SMS message history
create table sms_messages (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references auth.users(id) on delete cascade not null,
  phone_number text not null,
  to_number text not null,
  from_number text not null,
  direction text check (direction in ('inbound','outbound')) not null,
  body text,
  status text,
  twilio_sid text unique,
  created_at timestamptz default now()
);
```

## 🎨 Frontend Components

### Core Components

1. **`MyNumberCard`** - Manage business phone numbers
2. **`SmsComposer`** - Send SMS messages with character counter
3. **`SmsThread`** - Display threaded conversations with real-time updates

### Pages

1. **`/settings/number`** - Phone number management
2. **`/leads/[leadId]/sms`** - Lead SMS conversations

### API Integration

The frontend uses a centralized API client (`src/lib/api.ts`) that:
- Handles authentication via `x-user-id` header (development)
- Provides SMS-specific API functions
- Manages error handling and responses

## 🔧 Development Setup

### Prerequisites

- **Twilio Account** with SMS capabilities
- **Supabase Project** with the required tables
- **Node.js 18+** for the server
- **Vite + React** for the frontend

### Local Development

1. **Start the backend server:**
   ```bash
   cd server
   npm run dev
   ```

2. **Set user ID for testing:**
   ```javascript
   // In browser console or localStorage
   localStorage.setItem('currentUserId', 'your-test-user-id');
   ```

3. **Configure environment variables:**
   ```env
   VITE_TWILIO_API_URL=http://localhost:3001
   ```

### Testing the System

1. **Get a Business Number:**
   - Navigate to `/settings/number`
   - Click "Get Business Number"
   - Optionally specify an area code

2. **Send SMS to Lead:**
   - Navigate to `/leads/[leadId]/sms`
   - Use the SMS composer to send messages
   - Messages appear immediately in the thread

3. **Test Inbound SMS:**
   - Text your business number from your phone
   - Messages should appear in real-time in the UI

## 🔒 Security Considerations

- **Service Role Key**: Never expose Supabase service role key in frontend
- **Webhook Validation**: All incoming webhooks are validated
- **Authentication**: Server uses `x-user-id` header (replace with JWT in production)
- **Rate Limiting**: Consider implementing rate limiting for SMS sending

## 📱 Twilio Configuration

### Webhook URLs

Configure these in your Twilio console:

- **Inbound SMS**: `{PUBLIC_URL}/webhooks/twilio/sms-inbound`
- **Status Updates**: `{PUBLIC_URL}/webhooks/twilio/sms-status`

### Phone Number Requirements

- SMS-enabled (voice not required)
- US local numbers preferred
- Area code selection supported

## 🚀 Production Deployment

### Server Deployment

1. **Build the server:**
   ```bash
   npm run build
   ```

2. **Set production environment variables:**
   - `NODE_ENV=production`
   - `PUBLIC_URL=https://api.yourdomain.com`
   - Valid Twilio and Supabase credentials

3. **Use PM2 or similar process manager:**
   ```bash
   npm start
   ```

### Frontend Integration

1. **Update API URL:**
   ```env
   VITE_TWILIO_API_URL=https://api.yourdomain.com
   ```

2. **Replace authentication:**
   - Remove `x-user-id` header logic
   - Integrate with your existing auth system
   - Use JWT tokens or session cookies

## 🧪 Testing

### Manual Testing

1. **Phone Number Provisioning:**
   - Test area code selection
   - Verify duplicate number prevention
   - Check database insertion

2. **SMS Functionality:**
   - Send messages to various numbers
   - Verify character counting
   - Test multi-segment messages

3. **Real-time Updates:**
   - Send SMS from your phone
   - Verify immediate UI updates
   - Check status updates

### Automated Testing

Consider adding:
- Unit tests for API endpoints
- Integration tests for webhooks
- E2E tests for UI components

## 🐛 Troubleshooting

### Common Issues

1. **"No active business number" error:**
   - Ensure agent has purchased a number
   - Check `agent_phone_numbers` table

2. **Webhook not receiving messages:**
   - Verify webhook URLs in Twilio console
   - Check server logs for errors
   - Ensure server is publicly accessible

3. **Real-time updates not working:**
   - Check Supabase Realtime subscription
   - Verify RLS policies allow reading
   - Check browser console for errors

### Debug Mode

Enable detailed logging:
```bash
# Server
DEBUG=* npm run dev

# Frontend
# Check browser console and network tab
```

## 📈 Monitoring & Analytics

### Key Metrics

- SMS delivery rates
- Webhook response times
- Error rates by endpoint
- Phone number usage

### Logging

The server logs:
- All SMS operations
- Webhook requests
- Error conditions
- Performance metrics

## 🔮 Future Enhancements

- **Consent Management**: Handle STOP/HELP commands properly
- **Message Templates**: Pre-built SMS templates
- **Scheduling**: Send SMS at specific times
- **Analytics**: Detailed SMS performance metrics
- **Multi-language**: Support for international SMS
- **File Attachments**: MMS support

## 📚 Resources

- [Twilio SMS API Documentation](https://www.twilio.com/docs/sms)
- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [Express.js Best Practices](https://expressjs.com/en/advanced/best-practices-performance.html)

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section
2. Review server logs
3. Verify Twilio and Supabase configurations
4. Test with minimal examples

---

**Note**: This implementation is designed for development and testing. For production use, ensure proper authentication, rate limiting, and security measures are in place.
