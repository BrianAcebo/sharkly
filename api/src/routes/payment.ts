import express from 'express';
import { createPaymentIntent, handleWebhook, createSetupIntent } from '../controllers/payment';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Protect the create-intent route with both authentication and organization checks
router.post('/create-intent', requireAuth, createPaymentIntent);
router.post('/create-setup-intent', requireAuth, createSetupIntent);

// Webhook route doesn't need authentication as it's called by Stripe
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

export default router;
