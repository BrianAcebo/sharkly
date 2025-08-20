# Corrected API Structure - Twilio SMS Integration

This document shows the correct placement of all Twilio SMS code in the existing `/api` folder structure.

## 🏗️ **Corrected File Structure**

```
api/
├── src/
│   ├── twilio/                    # NEW: Twilio SMS functionality
│   │   ├── app.ts                 # Twilio & Supabase client initialization
│   │   ├── ensureAgentNumber.ts   # Core phone number provisioning logic
│   │   └── routes/
│   │       ├── seatHooks.ts       # Seat creation & bulk provisioning
│   │       ├── sendSms.ts         # SMS sending with self-healing
│   │       ├── inbound.ts         # Inbound SMS webhook handling
│   │       ├── status.ts          # SMS status webhook handling
│   │       └── provision.ts       # Manual number purchasing (feature-flagged)
│   ├── middleware/
│   │   ├── auth.ts                # UPDATED: Added userId support
│   │   └── ...                    # Other existing middleware
│   ├── types/
│   │   └── express.d.ts           # UPDATED: Extended Request interface
│   ├── index.ts                   # UPDATED: Mounted Twilio routes
│   └── ...                        # Other existing API code
├── tsconfig.json                  # TypeScript configuration
└── dist/                          # Build output
```

## 🔧 **Key Changes Made**

### **1. Moved from `/server` to `/api`**
- ❌ **Removed**: `/server` folder (incorrect location)
- ✅ **Added**: All Twilio code in `/api/src/twilio/`

### **2. Updated Dependencies**
- **Added**: `twilio`, `zod` packages to root `package.json`
- **Added**: `@types/twilio` for TypeScript support

### **3. Fixed TypeScript Issues**
- **Extended**: Express Request interface with `userId` property
- **Fixed**: Zod error handling (`error.issues` instead of `error.errors`)
- **Added**: Proper type annotations for error handling

## 🚀 **API Endpoints Now Available**

### **Internal Routes**
- `POST /internal/seat-created` - Auto-provision numbers for new agents
- `POST /admin/ensure-agent-numbers` - Bulk provisioning for existing agents

### **SMS Routes**
- `POST /api/sms/send` - Send SMS with auto-provisioning
- `GET /me/number` - Get agent's phone number

### **Webhooks**
- `POST /webhooks/twilio/sms-inbound` - Handle inbound SMS
- `POST /webhooks/twilio/sms-status` - Handle delivery status updates

### **Admin Routes (Feature-Flagged)**
- `POST /admin/twilio/buy-number` - Manual number purchasing (disabled by default)

## 🔒 **Authentication & Security**

### **Development Mode**
- Uses `x-user-id` header for authentication
- Simple middleware for development purposes

### **Production Ready**
- Can easily switch to proper JWT authentication
- All routes protected by `requireAuth` middleware

## 📱 **Phone Number Provisioning Flow**

### **1. Onboarding Integration**
```
User completes onboarding → 
Profile saves area code preference → 
Calls /internal/seat-created → 
ensureAgentNumber() provisions number
```

### **2. Self-Healing SMS**
```
User sends SMS → 
System checks for active number → 
If missing, auto-provisions → 
Continues with SMS sending
```

### **3. Area Code Priority**
```
1. Explicit area code from onboarding
2. Area code from user profile
3. Fallback to any available US number
```

## 🧪 **Testing the Integration**

### **1. Start the API Server**
```bash
npm run dev:server
# This runs: tsx watch api/src/index.ts
```

### **2. Test Seat Creation**
```bash
curl -X POST http://localhost:3001/internal/seat-created \
  -H "Content-Type: application/json" \
  -H "x-user-id: your-test-user-id" \
  -d '{"agentId": "uuid-here", "areaCode": "212"}'
```

### **3. Test SMS Sending**
```bash
curl -X POST http://localhost:3001/api/sms/send \
  -H "Content-Type: application/json" \
  -H "x-user-id: your-test-user-id" \
  -d '{"to": "1234567890", "body": "Test message"}'
```

## 🔧 **Environment Variables Required**

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Public URL for webhooks
PUBLIC_URL=https://api.yourdomain.com

# Feature Flags
DISABLE_NUMBER_PURCHASE_UI=true  # Disables manual purchasing
```

## ✅ **Build Status**

- **Frontend**: ✅ Builds successfully
- **API Server**: ✅ Builds successfully
- **TypeScript**: ✅ All type errors resolved
- **Dependencies**: ✅ All required packages installed

## 🎯 **Next Steps**

1. **Set Environment Variables**: Configure Twilio and Supabase credentials
2. **Run Database Migration**: Execute `add_area_code_to_profiles.sql`
3. **Test Integration**: Verify phone number provisioning works
4. **Deploy**: Move to production environment

The Twilio SMS integration is now correctly placed in the `/api` folder and fully integrated with your existing API structure! 🚀✨
