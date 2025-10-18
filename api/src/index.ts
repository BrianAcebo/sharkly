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

console.log('[api] PID', process.pid);

app.use((req, _res, next) => {
  console.log('[hit]', req.method, req.originalUrl, 'host=', req.headers.host, 'pid=', process.pid);
  next();
});

app.use((req, _res, next) => {
	// On Vercel the serverless function is mounted under /api/*,
	// so Express receives "/billing/..." etc. Add "/api" so our
	// mounts like "/api/billing" still match.
	if (process.env.VERCEL && !req.url.startsWith('/api/')) {
	  req.url = '/api' + req.url;
	}
	next();
});

// CORS
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

/**
 * Webhooks BEFORE json() (e.g., Stripe). If your handlers are inside
 * routers that already manage raw body, you can remove these stubs.
 */
app.post('/api/billing/stripe/webhook', express.raw({ type: '*/*' }), (req, res) => {
  // TODO: call your actual webhook handler here (or keep handled inside router).
  res.status(200).end();
});
app.post('/api/payments/webhook', express.raw({ type: '*/*' }), (req, res) => {
  // TODO: call your actual webhook handler here (or keep handled inside router).
  res.status(200).end();
});

// Parse JSON for everything else
app.use(express.json());

// ---------------------- Routes (unchanged) ----------------------
app.use('/api/payments', paymentRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/leads', leadsRoutes);

// Voice webhook (public) before other /api/twilio routes
app.use('/api/twilio/voice', voiceWebhookRoutes);
app.use('/api/twilio', twilioPhoneRoutes);

// Twilio SMS routes
app.use('/api/sms', sendSmsRoutes);
app.use('/api/webhooks/twilio', inboundWebhookRoutes);
app.use('/api/webhooks/twilio', statusWebhookRoutes);

// Twilio Voice routes
app.use('/api/calls', callRoutes);

// Twilio Client tokens
app.use('/api/twilio/tokens', clientTokenRoutes);

// Billing routes – public/general before onboarding
app.use('/api/billing', billingRoutes);
app.use('/api/billing', billingOnboardingRoutes);

// Organization status
app.use('/api/organizations', organizationStatusRoutes);

// SMS verification
app.use('/api/sms', smsVerificationRoutes);

// Trial/subscription/payment status
app.use('/api/trial', trialStatusRoutes);
app.use('/api/subscription', subscriptionStatusRoutes);
app.use('/api', paymentStatusRoutes);

// Health
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/__whoami', (_req, res) => {
  res.json({
    pid: process.pid,
    cwd: process.cwd(),
    main: (process as any).mainModule?.filename || 'esm',
    indexFile: import.meta.url,
    startedAt: new Date().toISOString(),
  });
});

// Error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof HttpError) {
    const e = err as unknown as { message: string; statusCode: number };
    console.error(`Error ${e.statusCode}: ${e.message}`);
    return res.status(e.statusCode).json({ error: { message: e.message } });
  }
  console.error('Unexpected error:', err);
  return res.status(500).json({ error: { message: 'Internal server error' } });
});

// ----------------- Local only listen; Vercel uses serverless -----------------
if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Local API listening on http://localhost:${port}`);
  });
}

// Vercel serverless handler
export default serverless(app);
