import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createCluster } from '../controllers/clusters.js';

const router = express.Router();

router.post('/', requireAuth, createCluster);

export default router;
