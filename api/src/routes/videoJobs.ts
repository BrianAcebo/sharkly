/**
 * Blog-to-video job API — proxies to video-service (VIDEO_SERVICE_URL).
 * Tier: Builder+ for job endpoints (per docs/blog-to-video-spec.md).
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireTier } from '../middleware/requireTier.js';
import {
	proxyCreateVideoJob,
	proxyGenerateVideoScript,
	proxyGetVideoFontCatalog,
	proxyGetVideoJob,
	proxyDownloadVideo,
	proxyDeleteVideoJob,
	proxyVideoServiceHealth
} from '../controllers/videoServiceProxyController.js';

const router = express.Router();
const builder = [requireAuth, requireTier('builder')];

router.post('/create', ...builder, proxyCreateVideoJob);
router.post('/generate-script', ...builder, proxyGenerateVideoScript);
router.get('/font-catalog', ...builder, proxyGetVideoFontCatalog);
router.get('/job/:jobId', ...builder, proxyGetVideoJob);
router.get('/download/:jobId', ...builder, proxyDownloadVideo);
router.delete('/job/:jobId', ...builder, proxyDeleteVideoJob);
router.get('/service-health', requireAuth, proxyVideoServiceHealth);

export default router;
