import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { suggestTopics, getKeywordMetricsHandler } from '../controllers/strategy.js';

const router = express.Router();

router.post('/suggest', requireAuth, suggestTopics);
router.post('/keyword-metrics', requireAuth, getKeywordMetricsHandler);

export default router;
