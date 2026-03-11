import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
	createCluster,
	regenerateCluster,
	getClusterIntelligence
} from '../controllers/clusters.js';

const router = express.Router();

router.post('/', requireAuth, createCluster);
router.get('/:id/intelligence', requireAuth, getClusterIntelligence);
router.post('/:id/regenerate', requireAuth, regenerateCluster);

export default router;
