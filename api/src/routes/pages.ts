import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { generateBrief, generateArticle } from '../controllers/pages.js';

const router = express.Router();

router.post('/:id/brief', requireAuth, generateBrief);
router.post('/:id/article', requireAuth, generateArticle);

export default router;
