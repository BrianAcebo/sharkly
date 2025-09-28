import express from 'express';
import { requireAuth } from '../middleware/auth';
import { onboardOrganization, getPlanCatalog, getCustomerPaymentMethodSummary, getCustomerPaymentMethods } from '../controllers/billingOnboarding';
import { handleStripeWebhook } from '../controllers/stripeWebhook';

const router = express.Router();

const jsonParser = express.json();

// Apply JSON parsing to all non-webhook routes so req.body is populated
router.use((req, res, next) => {
  if (req.path === '/stripe/webhook') {
    return next();
  }
  return jsonParser(req, res, next);
});

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
router.get('/orgs/payment-methods/default', getCustomerPaymentMethodSummary);
router.get('/orgs/payment-methods', getCustomerPaymentMethods);

// Onboard organization to billing
router.post('/orgs/onboard', onboardOrganization);

// Stripe webhook (no auth required)
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

export default router;
