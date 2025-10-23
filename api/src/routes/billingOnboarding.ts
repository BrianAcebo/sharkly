import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { onboardOrganization, getPlanCatalog, getCustomerPaymentMethodSummary, getCustomerPaymentMethods, provisionOrganization } from '../controllers/billingOnboarding.js';
import { handleStripeWebhook } from '../controllers/stripeWebhook.js';

const router = express.Router();

const jsonParser = express.json();

// Apply JSON parsing to all non-webhook routes so req.body is populated
router.use((req, res, next) => {
  if (req.path === '/stripe/webhook') {
    return next();
  }
  return jsonParser(req, res, next);
});

router.use((req, res, next) => {
  if (req.path === '/stripe/webhook' || req.path.startsWith('/public')) {
    return next();
  }
  return requireAuth(req, res, next);
});

// Get plan catalog
router.get('/plans', getPlanCatalog);
router.get('/orgs/payment-methods/default', getCustomerPaymentMethodSummary);
router.get('/orgs/payment-methods', getCustomerPaymentMethods);

// Onboard organization to billing
router.post('/orgs/onboard', onboardOrganization);

// Stage 2 provisioning
router.post('/orgs/provision', provisionOrganization);

// Stripe webhook (no auth required)
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

export default router;
