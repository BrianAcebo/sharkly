import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { paymentRoutes } from './routes/payment';
import organizationRoutes from './routes/organization';
import leadsRoutes from './routes/leads';
import { HttpError } from './error/httpError';

// Twilio SMS routes
import seatHookRoutes from './routes/twilio/seatHooks';
import provisionRoutes from './routes/twilio/provision';
import sendSmsRoutes from './routes/twilio/sendSms';
import inboundWebhookRoutes from './routes/twilio/inbound';
import statusWebhookRoutes from './routes/twilio/status';

// Twilio Voice routes
import callRoutes from './routes/twilio/calls';
import voiceWebhookRoutes from './routes/twilio/voice';
import callStatusWebhookRoutes from './routes/twilio/callStatus';

// Twilio Client routes for WebRTC
import clientTokenRoutes from './routes/twilio/clientTokens';

// Billing routes
import billingRoutes from './routes/billing';



dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

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

// Parse JSON bodies for all routes except Stripe webhook
app.use((req, res, next) => {
	if (req.originalUrl === '/api/payments/webhook') {
		next();
	} else {
		express.json()(req, res, (err) => {
			if (err) {
				console.error('Error parsing JSON:', err);
				throw new HttpError('Invalid JSON', 400);
			}
			next();
		});
	}
});

// Routes
app.use('/api/payments', paymentRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/leads', leadsRoutes);

// Twilio SMS routes
app.use('/internal', seatHookRoutes);
app.use('/admin', seatHookRoutes);
app.use('/me', seatHookRoutes);

// Mount provision routes behind feature flag (disabled by default)
if (process.env.DISABLE_NUMBER_PURCHASE_UI !== 'true') {
	app.use('/admin/twilio', provisionRoutes);
}

app.use('/api/sms', sendSmsRoutes);
app.use('/api/webhooks/twilio', inboundWebhookRoutes);
app.use('/api/webhooks/twilio', statusWebhookRoutes);

// Twilio Voice routes
app.use('/api/calls', callRoutes);
app.use('/api/twilio/voice', voiceWebhookRoutes); // Mount voice TwiML route
app.use('/api/webhooks/twilio', callStatusWebhookRoutes);

// Twilio Client routes for WebRTC
app.use('/api/twilio/tokens', clientTokenRoutes);

// Billing routes
app.use('/api/billing', billingRoutes);



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
