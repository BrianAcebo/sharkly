import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { completeOnboarding } from '../controllers/onboarding.js';

const router = express.Router();

router.post('/complete', requireAuth, completeOnboarding);

export default router;
