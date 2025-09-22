import { Router } from 'express';
import { getSubscriptionStatus } from '../controllers/subscriptionStatus';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Get subscription status for an organization
router.get('/:organizationId', requireAuth, getSubscriptionStatus);

export default router;
