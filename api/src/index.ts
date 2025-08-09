import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { paymentRoutes } from './routes/payment';
import organizationRoutes from './routes/organization';
import leadsRoutes from './routes/leads';
import { HttpError } from './error/httpError';
import { requireAuth } from './middleware/auth';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

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

// Test endpoint to debug authentication
app.get('/api/test-auth', requireAuth, (req, res) => {
	res.json({ 
		message: 'Authentication successful!', 
		user: req.user 
	});
});

// Routes
app.use('/api/payments', paymentRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/leads', leadsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
	res.json({ status: 'ok' });
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
