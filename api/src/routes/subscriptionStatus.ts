import { Router } from 'express';
import { getSubscriptionStatus } from '../controllers/subscriptionStatus.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Get subscription status for an organization
router.get('/:organizationId', requireAuth, getSubscriptionStatus);

export default router;
