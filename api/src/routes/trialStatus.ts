import express from 'express';
import { getTrialStatusForOrg } from '../controllers/trialStatus.js';

const router = express.Router();

// Get trial status for an organization
router.get('/:orgId', getTrialStatusForOrg);

// POST /api/trial/notify
// Body: { token: string } must match CRON_SECRET; sends 2-day and 1-day reminders
// (Cron-based notify removed; relying on Stripe webhooks instead.)

export default router;
