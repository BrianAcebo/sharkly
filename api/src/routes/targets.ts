import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
	updateTarget,
	deleteTarget,
	listTopicsForTarget,
	acceptTopicsFromRun
} from '../controllers/targetsController.js';

const router = express.Router();

// GET /api/targets/:targetId/topics — list topics for target
router.get('/:targetId/topics', requireAuth, listTopicsForTarget);

// PATCH /api/targets/:targetId — update target
router.patch('/:targetId', requireAuth, updateTarget);

// DELETE /api/targets/:targetId — delete target (cascades to topics, clusters)
router.delete('/:targetId', requireAuth, deleteTarget);

// POST /api/targets/:targetId/topics/accept-from-run — accept suggestions from a strategy run
router.post('/:targetId/topics/accept-from-run', requireAuth, acceptTopicsFromRun);

export default router;
