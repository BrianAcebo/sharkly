/**
 * Shopify mandatory webhooks (GDPR + app uninstall).
 * Must respond 200. Verify HMAC using raw body.
 * Register routes with express.raw() before express.json().
 */

import { Request, Response } from 'express';
import crypto from 'crypto';
import { clearShopifyConnectionByDomain } from '../services/shopifyService.js';

const secret = process.env.SHOPIFY_API_SECRET || '';

function verifyShopifyWebhookHmac(rawBody: Buffer, hmacHeader: string): boolean {
	if (!secret || !hmacHeader) return false;
	const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
	return crypto.timingSafeEqual(Buffer.from(hmacHeader, 'base64'), Buffer.from(computed, 'base64'));
}

/**
 * Generic handler: verify HMAC, then run action. Always respond 200 after verification.
 * req.body is the raw Buffer (set by express.raw() middleware).
 */
async function handleWebhook(req: Request, res: Response, action: (shopDomain: string, body: unknown) => Promise<void>): Promise<void> {
	const hmac = req.headers['x-shopify-hmac-sha256'] as string | undefined;
	const rawBody = Buffer.isBuffer(req.body) ? req.body : null;
	if (!rawBody || !verifyShopifyWebhookHmac(rawBody, hmac || '')) {
		res.status(401).send('Invalid HMAC');
		return;
	}
	const shopDomain = (req.headers['x-shopify-shop-domain'] as string) || '';
	let body: unknown;
	try {
		body = JSON.parse(rawBody.toString('utf8'));
	} catch {
		body = {};
	}
	try {
		await action(shopDomain, body);
	} catch (err) {
		console.error('[Shopify Webhook] Action error:', err);
	}
	res.status(200).send();
}

/**
 * POST /webhooks/shopify/customers-redact
 * Customer requested deletion of their data. Sharkly stores no customer data.
 */
export async function customersRedact(req: Request, res: Response): Promise<void> {
	await handleWebhook(req, res, async () => {
		// No customer data stored; nothing to redact
	});
}

/**
 * POST /webhooks/shopify/shop-redact
 * Fires 48h after store uninstalls. Clear store data; we only have connection tokens.
 */
export async function shopRedact(req: Request, res: Response): Promise<void> {
	await handleWebhook(req, res, async (shopDomain) => {
		await clearShopifyConnectionByDomain(shopDomain);
	});
}

/**
 * POST /webhooks/shopify/customers-data-request
 * Customer requested their data. Respond with what we store: store domain + token reference only, no PII.
 */
export async function customersDataRequest(req: Request, res: Response): Promise<void> {
	await handleWebhook(req, res, async () => {
		// We store no customer PII. Store only has shop domain + access token for API.
		// No response body required; 200 acknowledges receipt.
	});
}

/**
 * POST /webhooks/shopify/app-uninstalled
 * App was uninstalled. Clear tokens, preserve site and content.
 */
export async function appUninstalled(req: Request, res: Response): Promise<void> {
	await handleWebhook(req, res, async (shopDomain) => {
		await clearShopifyConnectionByDomain(shopDomain);
	});
}
