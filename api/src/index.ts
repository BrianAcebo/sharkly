import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import paymentRoutes from './routes/payment.js';
import organizationRoutes from './routes/organization.js';
import leadsRoutes from './routes/leads.js';
import sendSmsRoutes from './routes/twilio/sendSms.js';
import inboundWebhookRoutes from './routes/twilio/inbound.js';
import statusWebhookRoutes from './routes/twilio/status.js';
import callRoutes from './routes/twilio/calls.js';
import voiceWebhookRoutes from './routes/twilio/voice.js';
import clientTokenRoutes from './routes/twilio/clientTokens.js';
import billingRoutes from './routes/billing.js';
import billingOnboardingRoutes from './routes/billingOnboarding.js';
import twilioPhoneRoutes from './routes/twilioPhone.js';
import organizationStatusRoutes from './routes/organizationStatus.js';
import smsVerificationRoutes from './routes/smsVerification.js';
import trialStatusRoutes from './routes/trialStatus.js';
import subscriptionStatusRoutes from './routes/subscriptionStatus.js';
import paymentStatusRoutes from './routes/paymentStatus.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3001);

// CORS: allow local dev + production domains via env
app.use(cors({
  origin: (process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:5173']),
  credentials: true
}));

// Webhooks BEFORE JSON parsing (replace stubs with real handlers if needed)
app.post('/api/billing/stripe/webhook', express.raw({ type: '*/*' }), (_req, res) => res.sendStatus(200));
app.post('/api/payments/webhook',       express.raw({ type: '*/*' }), (_req, res) => res.sendStatus(200));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use('/api/payments', paymentRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/twilio/voice', voiceWebhookRoutes);
app.use('/api/twilio', twilioPhoneRoutes);
app.use('/api/sms', sendSmsRoutes);
app.use('/api/webhooks/twilio', inboundWebhookRoutes);
app.use('/api/webhooks/twilio', statusWebhookRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/twilio/tokens', clientTokenRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/billing', billingOnboardingRoutes);
app.use('/api/organizations', organizationStatusRoutes);
app.use('/api/sms', smsVerificationRoutes);
app.use('/api/trial', trialStatusRoutes);
app.use('/api/subscription', subscriptionStatusRoutes);
app.use('/api', paymentStatusRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const e = err as any;
  if (typeof e?.statusCode === 'number') {
    return res.status(e.statusCode).json({ error: { message: e.message } });
  }
  console.error(err);
  res.status(500).json({ error: { message: 'Internal server error' } });
});

// ==== Listener: local vs Fly ====
const isFly = !!process.env.FLY_APP_NAME;
const LISTEN_PORT = isFly ? PORT : 3000;           // local = 3000
const LISTEN_HOST = isFly ? '0.0.0.0' : 'localhost';

app.listen(LISTEN_PORT, LISTEN_HOST, () => {
  console.log(`API listening on http://${LISTEN_HOST}:${LISTEN_PORT}`);
});
