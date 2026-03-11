import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
	checkSubscriptionRefundEligibility,
	checkWalletRefundEligibility,
	requestSubscriptionRefund,
	requestWalletRefund,
	getRefundHistory
} from '../controllers/refunds.js';

const router = express.Router();

// All refund routes require authentication
router.use(requireAuth);

// Eligibility checks (GET)
router.get('/subscription/eligibility', checkSubscriptionRefundEligibility);
router.get('/wallet/eligibility', checkWalletRefundEligibility);

// Request refunds (POST)
router.post('/subscription', requestSubscriptionRefund);
router.post('/wallet', requestWalletRefund);

// Refund history (GET)
router.get('/history', getRefundHistory);

// NOTE: Action credit-backs are handled manually by support via the
// credit_back_action() database function. Users email hello@sharkly.co
// and support reviews usage_events + action_results to verify the issue.

export default router;
