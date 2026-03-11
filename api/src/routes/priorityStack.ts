import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getPriorityStack } from '../controllers/priorityStack.js';

const router = express.Router();
router.get('/', requireAuth, getPriorityStack);

export default router;
