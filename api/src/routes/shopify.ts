/**
 * Shopify routes
 * OAuth, connection status, blogs, publish.
 */

import { Router } from 'express';
import {
	startShopifyOAuth,
	handleShopifyOAuthCallback,
	shopifyAppRedirect,
	attachPendingShopifyToken,
	getShopifyStatus,
	postShopifyDisconnect,
	getShopifyBlogs,
	publishToShopify
} from '../controllers/shopifyController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireSiteAccess } from '../middleware/siteAccess.js';

const router = Router();

// OAuth (no auth required — callback comes from Shopify)
router.get('/oauth/start', startShopifyOAuth);
router.get('/oauth/callback', handleShopifyOAuthCallback);

// App redirect: when merchant opens app in Shopify Admin (no embedded UI), redirect to signup
router.get('/app-redirect', shopifyAppRedirect);

// Attach pending token (companion app: after OAuth, user logs in, we consume token and attach to site)
router.post('/attach-pending', requireAuth, attachPendingShopifyToken);

// Protected routes
router.get('/status/:siteId', requireAuth, requireSiteAccess, getShopifyStatus);
router.post('/disconnect/:siteId', requireAuth, requireSiteAccess, postShopifyDisconnect);
router.get('/blogs/:siteId', requireAuth, requireSiteAccess, getShopifyBlogs);
router.post('/publish/:siteId', requireAuth, requireSiteAccess, publishToShopify);

export default router;
