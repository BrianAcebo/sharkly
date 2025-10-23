import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getTrialStatusForOrg } from '../controllers/trialStatus.js';

const router = express.Router();

// Get trial status for an organization
router.get('/:orgId', requireAuth, getTrialStatusForOrg);

export default router;
