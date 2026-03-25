import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  onboardOrganization,
  getPlanCatalog,
  getCustomerPaymentMethodSummary,
  getCustomerPaymentMethods,
  syncDeferredOrganizationAfterPayment
} from '../controllers/billingOnboarding.js';

const router = express.Router();

const jsonParser = express.json();

router.use(jsonParser);

router.use((req, res, next) => {
  if (req.path.startsWith('/public')) {
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
router.post('/orgs/onboard/sync-deferred', syncDeferredOrganizationAfterPayment);

export default router;
