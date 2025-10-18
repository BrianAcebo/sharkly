import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import serverless from 'serverless-http';

import { paymentRoutes } from './routes/payment';
import organizationRoutes from './routes/organization';
import leadsRoutes from './routes/leads';
import { HttpError } from './error/httpError';

// Twilio SMS routes
import sendSmsRoutes from './routes/twilio/sendSms';
import inboundWebhookRoutes from './routes/twilio/inbound';
import statusWebhookRoutes from './routes/twilio/status';

// Twilio Voice routes
import callRoutes from './routes/twilio/calls';
import voiceWebhookRoutes from './routes/twilio/voice';

// Twilio Client routes for WebRTC
import clientTokenRoutes from './routes/twilio/clientTokens';

// Billing routes
import billingRoutes from './routes/billing';
import billingOnboardingRoutes from './routes/billingOnboarding';
import twilioPhoneRoutes from './routes/twilioPhone';

// Organization status routes
import organizationStatusRoutes from './routes/organizationStatus';

// SMS Verification routes
import smsVerificationRoutes from './routes/smsVerification';

// Trial Status routes
import trialStatusRoutes from './routes/trialStatus';

// Subscription Status routes
import subscriptionStatusRoutes from './routes/subscriptionStatus';

// Payment Status routes
import paymentStatusRoutes from './routes/paymentStatus';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(express.urlencoded({ extended: false }));

app.use((req, _res, next) => {
  console.log('[hit]', req.method, req.originalUrl);
  next();
});

// CORS
app.use(cors({ origin: true, credentials: true }));

/** Webhooks BEFORE json() (if you really need raw body, wire the real handlers here) */
app.post('/api/billing/stripe/webhook', express.raw({ type: '*/*' }), (_req, res) => res.sendStatus(200));
app.post('/api/payments/webhook', express.raw({ type: '*/*' }), (_req, res) => res.sendStatus(200));

// JSON for everything else
app.use(express.json());

/** Your routes (UNCHANGED — keep the /api/... mounts) */
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
  if (err instanceof HttpError) {
    const { message, statusCode } = err as any;
    console.error(`Error ${statusCode}: ${message}`);
    return res.status(statusCode).json({ error: { message } });
  }
  console.error('Unexpected error:', err);
  return res.status(500).json({ error: { message: 'Internal server error' } });
});

// Local only; Vercel uses the serverless handler
if (!process.env.VERCEL) {
  app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
}

export default serverless(app);
