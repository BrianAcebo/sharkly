import { Router } from 'express';
import { listActivePlans, getPublicUsageRates } from '../controllers/billingPublic.js';

const router = Router();

router.get('/plans', listActivePlans);
router.get('/usage-catalog', getPublicUsageRates);

export default router;

