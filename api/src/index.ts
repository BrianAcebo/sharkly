import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import paymentRoutes from './routes/payment.js';
import organizationRoutes from './routes/organization.js';
import billingRoutes from './routes/billing.js';
import billingOnboardingRoutes from './routes/billingOnboarding.js';
import organizationStatusRoutes from './routes/organizationStatus.js';
import subscriptionStatusRoutes from './routes/subscriptionStatus.js';
import paymentStatusRoutes from './routes/paymentStatus.js';
import emailRoutes from './routes/email.js';
import trialStatusRoutes from './routes/trialStatus.js';

dotenv.config();

const app = express();
const isFly = Boolean(process.env.FLY_APP_NAME);
const PORT = Number(process.env.PORT ?? 3000);
const allowedOrigins = ['http://localhost:5173', 'https://paperboatcrm.com', 'https://www.paperboatcrm.com'];

// CORS: allow local dev + production domains via env
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Webhooks BEFORE JSON parsing (replace stubs with real handlers if needed)
app.post('/api/billing/stripe/webhook', express.raw({ type: '*/*' }), (_req, res) => res.sendStatus(200));
app.post('/api/payments/webhook',       express.raw({ type: '*/*' }), (_req, res) => res.sendStatus(200));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use('/api/payments', paymentRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/billing', billingOnboardingRoutes);
app.use('/api/organizations', organizationStatusRoutes);
app.use('/api/trial', trialStatusRoutes);
app.use('/api/subscription', subscriptionStatusRoutes);
app.use('/api', paymentStatusRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/trial', trialStatusRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Error handler
type HttpError = Error & { statusCode?: number };
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const e: HttpError = err as HttpError;
  void _next;
  if (typeof e?.statusCode === 'number') {
    return res.status(e.statusCode).json({ error: { message: e.message } });
  }
  console.error(err);
  res.status(500).json({ error: { message: 'Internal server error' } });
});

// ==== Listener: local vs Fly ====
const LISTEN_HOST = isFly ? '0.0.0.0' : '127.0.0.1';

app.listen(PORT, LISTEN_HOST, () => {
	console.log(`API listening on http://${LISTEN_HOST}:${PORT} ${isFly ? '(Fly)' : '(Local)'}`);
});
