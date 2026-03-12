/**
 * Ecommerce SEO routes (L6b)
 * Product/collection description generation, import, publish to Shopify.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
	listEcommercePages,
	getEcommercePage,
	generateProduct,
	generateCollection,
	publishToShopify,
	importFromShopify,
	getShopifyProducts,
	getShopifyCollections
} from '../controllers/ecommerce.js';

const router = Router();

router.use(requireAuth);

// List and get (no credits)
router.get('/', listEcommercePages);
router.get('/shopify-products', getShopifyProducts);
router.get('/shopify-collections', getShopifyCollections);
router.get('/:id', getEcommercePage);

// Generate (10 credits each)
router.post('/:id/generate-product', generateProduct);
router.post('/:id/generate-collection', generateCollection);

// Publish to Shopify (no credits)
router.post('/:id/publish-shopify', publishToShopify);

// Import from Shopify (no credits)
router.post('/import-shopify', importFromShopify);

export default router;
