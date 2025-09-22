import express from 'express';
import { requireAuth } from '../middleware/auth';
import { onboardOrganization, getPlanCatalog } from '../controllers/billingOnboarding';
import { handleStripeWebhook } from '../controllers/stripeWebhook';

const router = express.Router();

// All routes except webhook require authentication
router.use((req, res, next) => {
  if (req.path === '/stripe/webhook') {
    next();
  } else {
    requireAuth(req, res, next);
  }
});

// Get plan catalog
router.get('/plans', getPlanCatalog);

// Onboard organization to billing
router.post('/orgs/onboard', onboardOrganization);

// Stripe webhook (no auth required)
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

export default router;
