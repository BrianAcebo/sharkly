import { Router } from 'express';
import { listActivePlans } from '../controllers/billingPublic';

const router = Router();

router.get('/plans', listActivePlans);

export default router;

