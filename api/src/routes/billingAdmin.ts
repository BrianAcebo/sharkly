import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  adjustCredits,
  previewTierChange,
  getBillingHistory,
  getCreditSummary,
  changeTierCredits,
  adjustCreditsForSeats,
  createWalletCheckoutSession,
  getMonthlyUsage,
  resetMonthlyCreditsForOrg,
  lookupOrgForRefund,
  getRefundAudit,
  adminProcessSubscriptionRefund,
  adminProcessWalletRefund,
  adminCreditBackAction,
  verifyAdminPassword,
  cancelSubscription,
  pauseSubscription,
  resumeSubscription,
  syncFromStripe
} from '../controllers/billingAdmin.js';

const router = express.Router();

// All admin routes require authentication
router.use(requireAuth);

// =====================================================
// Credit Management
// =====================================================

// Get credit summary for an org
// GET /api/billing/admin/credits/:orgId
router.get('/credits/:orgId', getCreditSummary);

// Get monthly usage summary for an org
// GET /api/billing/admin/usage/:orgId
router.get('/usage/:orgId', getMonthlyUsage);

// Manually adjust credits (for support/refunds)
// POST /api/billing/admin/credits/adjust
// Body: { orgId, adjustment (positive or negative), reason }
router.post('/credits/adjust', adjustCredits);

// =====================================================
// Tier Management
// =====================================================

// Preview what would happen with a tier change
// POST /api/billing/admin/tier/preview
// Body: { orgId, newMonthlyCredits, prorate? }
router.post('/tier/preview', previewTierChange);

// Manually change tier credits (admin override)
// POST /api/billing/admin/tier/change
// Body: { orgId, newMonthlyCredits, prorate? }
router.post('/tier/change', changeTierCredits);

// =====================================================
// Extra Seats Credit Adjustment
// =====================================================

// Manually adjust credits for seat changes
// POST /api/billing/admin/seats/adjust-credits
// Body: { orgId, seatDelta (positive=add, negative=remove), immediate? }
router.post('/seats/adjust-credits', adjustCreditsForSeats);

// =====================================================
// Billing History
// =====================================================

// Get full billing history for an org
// GET /api/billing/admin/history/:orgId
router.get('/history/:orgId', getBillingHistory);

// =====================================================
// Wallet Top-up
// =====================================================

// Create a Stripe Checkout session for one-time wallet top-up
// POST /api/billing/admin/wallet/checkout
// Body: { orgId, amountCents, successUrl, cancelUrl }
router.post('/wallet/checkout', createWalletCheckoutSession);

// =====================================================
// Manual Credit Reset (Admin only)
// =====================================================
// Note: Primary reset happens automatically on invoice.paid webhook
// This endpoint is only for manual admin intervention

// Reset monthly credits for a specific org
// POST /api/billing/admin/credits/reset
// Body: { orgId }
router.post('/credits/reset', resetMonthlyCreditsForOrg);

// =====================================================
// Refund Admin
// =====================================================

// Search for org to process refund
// GET /api/billing/admin/refunds/lookup?query=...
router.get('/refunds/lookup', lookupOrgForRefund);

// Get full refund audit for an org (credits, usage, eligibility)
// GET /api/billing/admin/refunds/audit/:orgId
router.get('/refunds/audit/:orgId', getRefundAudit);

// Process subscription refund
// POST /api/billing/admin/refunds/subscription
// Body: { orgId, reason? }
router.post('/refunds/subscription', adminProcessSubscriptionRefund);

// Process wallet refund
// POST /api/billing/admin/refunds/wallet
// Body: { orgId, reason? }
router.post('/refunds/wallet', adminProcessWalletRefund);

// Credit back action (for failed actions)
// POST /api/billing/admin/refunds/credit-back
// Body: { orgId, actionKey, credits, reason }
router.post('/refunds/credit-back', adminCreditBackAction);

// =====================================================
// Admin Password Verification
// =====================================================

// Verify admin password (for protected pages)
// POST /api/billing/admin/verify-password
// Body: { password }
router.post('/verify-password', verifyAdminPassword);

// =====================================================
// Subscription Management
// =====================================================

// Cancel subscription
// POST /api/billing/admin/subscription/cancel
// Body: { orgId, immediately?: boolean }
router.post('/subscription/cancel', cancelSubscription);

// Pause subscription
// POST /api/billing/admin/subscription/pause
// Body: { orgId }
router.post('/subscription/pause', pauseSubscription);

// Resume subscription
// POST /api/billing/admin/subscription/resume
// Body: { orgId }
router.post('/subscription/resume', resumeSubscription);

// =====================================================
// Sync from Stripe
// =====================================================

// Pull latest data from Stripe API
// POST /api/billing/admin/stripe/sync
// Body: { orgId }
router.post('/stripe/sync', syncFromStripe);

export default router;

