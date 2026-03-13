import { Router } from 'express';
import { lookupKeyword } from '../controllers/keywordsController.js';

const router = Router();

// POST /api/keywords/lookup — Keyword metrics lookup (5 credits)
router.post('/lookup', lookupKeyword);

export default router;
