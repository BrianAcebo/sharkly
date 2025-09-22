import express from 'express';
import { requireAuth } from '../middleware/auth';
import { getTrialStatusForOrg } from '../controllers/trialStatus';

const router = express.Router();

// Get trial status for an organization
router.get('/:orgId', requireAuth, getTrialStatusForOrg);

export default router;
