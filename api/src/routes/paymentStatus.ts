import express from 'express';
import { getPaymentStatus, checkResumeEligibility, getOrganizationsNeedingPaymentAttention } from '../controllers/paymentStatus';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Get payment status for a specific organization
router.get('/organizations/:organizationId/payment-status', requireAuth, getPaymentStatus);

// Check if organization can be resumed after payment
router.get('/organizations/:organizationId/resume-eligibility', requireAuth, checkResumeEligibility);

// Get all organizations needing payment attention (admin endpoint)
router.get('/organizations/payment-attention', requireAuth, getOrganizationsNeedingPaymentAttention);

export default router;
