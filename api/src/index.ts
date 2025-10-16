import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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
// import emailRoutes from './routes/email';



dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(express.urlencoded({ extended: false }));

console.log('[api] PID', process.pid);

app.use((req, _res, next) => {
	console.log('[hit]', req.method, req.originalUrl, 'host=', req.headers.host, 'pid=', process.pid);
	next();
});

// Middleware
app.use(
	cors({
		origin: true, // Allow all origins - we'll handle this dynamically
		credentials: true
	})
);

// Mount webhook routes first (before JSON parsing)
app.use('/api/billing', billingOnboardingRoutes);

// Parse JSON bodies for all other routes (excluding webhooks)
app.use((req, res, next) => {
	// Skip JSON parsing for webhook routes
	if (req.originalUrl === '/api/billing/stripe/webhook' || 
		req.originalUrl === '/api/payments/webhook') {
		next();
	} else {
		express.json()(req, res, next);
	}
});

// Routes
app.use('/api/payments', paymentRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/leads', leadsRoutes);
// IMPORTANT: Mount Twilio Voice webhook (no auth) before other /api/twilio routes
app.use('/api/twilio/voice', voiceWebhookRoutes);
app.use('/api/twilio', twilioPhoneRoutes);

// Twilio SMS routes
app.use('/api/sms', sendSmsRoutes);
app.use('/api/webhooks/twilio', inboundWebhookRoutes);
app.use('/api/webhooks/twilio', statusWebhookRoutes);

// Twilio Voice routes
app.use('/api/calls', callRoutes);

// Twilio Client routes for WebRTC
app.use('/api/twilio/tokens', clientTokenRoutes);

// Billing routes
app.use('/api/billing', billingRoutes);
// app.use('/api/email', emailRoutes);

// Organization status routes
app.use('/api/organizations', organizationStatusRoutes);

// SMS Verification routes
app.use('/api/sms', smsVerificationRoutes);

// Trial Status routes
app.use('/api/trial', trialStatusRoutes);

// Subscription Status routes
app.use('/api/subscription', subscriptionStatusRoutes);

// Payment Status routes
app.use('/api', paymentStatusRoutes);



// Health check endpoint
app.get('/api/health', (req, res) => {
	res.json({ status: 'ok' });
});

app.get('/__whoami', (_req, res) => {
	res.json({
		pid: process.pid,
		cwd: process.cwd(),
		main: (process as any).mainModule?.filename || 'esm',
		indexFile: import.meta.url, // proves this file
		startedAt: new Date().toISOString()
	});
});

// Error handling middleware
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
	if (err instanceof HttpError) {
		const error = err as { message: string; statusCode: number };
		console.error(`Error ${error.statusCode}: ${error.message}`);
		return res.status(error.statusCode).json({
			error: {
				message: error.message
			}
		});
	}

	console.error('An unexpected error occurred:', err);
	return res.status(500).json({
		error: {
			message: 'Internal server error'
		}
	});
});

app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
});
