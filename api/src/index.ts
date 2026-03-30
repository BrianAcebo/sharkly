import './instrument.js';
import express from 'express';
import cors from 'cors';

import paymentRoutes from './routes/payment.js';
import organizationRoutes from './routes/organization.js';
import billingRoutes from './routes/billing.js';
import billingOnboardingRoutes from './routes/billingOnboarding.js';
import organizationStatusRoutes from './routes/organizationStatus.js';
import subscriptionStatusRoutes from './routes/subscriptionStatus.js';
import paymentStatusRoutes from './routes/paymentStatus.js';
import emailRoutes from './routes/email.js';
import imagesRoutes from './routes/images.js';
import documentsRoutes from './routes/documents.js';
import trialStatusRoutes from './routes/trialStatus.js';
import onboardingRoutes from './routes/onboarding.js';
import clustersRoutes from './routes/clusters.js';
import pagesRoutes from './routes/pages.js';
import gscRoutes from './routes/gsc.js';
import rankingsRoutes from './routes/rankings.js';
import contentGeneratorRoutes from './routes/contentGenerator.js';
import crawlerRoutes from './routes/crawler.js';
import auditRoutes from './routes/audit.js';
import keywordsRoutes from './routes/keywords.js';
import strategyRoutes from './routes/strategy.js';
import sitesRoutes from './routes/sites.js';
import targetsRoutes from './routes/targets.js';
import blogRoutes from './routes/blog.js';
import billingAdminRoutes from './routes/billingAdmin.js';
import refundsRoutes from './routes/refunds.js';
import aiChatRoutes from './routes/aiChat.js';
import chatFilesRoutes from './routes/chatFiles.js';
import priorityStackRoutes from './routes/priorityStack.js';
import shopifyRoutes from './routes/shopify.js';
import ecommerceRoutes from './routes/ecommerce.js';
import croStudioRoutes from './routes/croStudio.js';
import seoChecksRoutes from './routes/seoChecks.js';
import {
	handleShopifyOAuthCallback,
	startShopifyOAuthInstall
} from './controllers/shopifyController.js';
import { handleStripeWebhook } from './controllers/stripeWebhook.js';
import {
	customersRedact,
	shopRedact,
	customersDataRequest,
	appUninstalled,
	shopifyComplianceUnified
} from './controllers/shopifyWebhooks.js';
import { handleSupabaseAuthEmailHook } from './controllers/supabaseAuthEmailHook.js';
import { isServerWebhookPath } from './utils/webhookPaths.js';
import { captureApiError, logSentryConfigStatus, sentryEnabled } from './utils/sentryCapture.js';
import * as Sentry from '@sentry/node';

const app = express();
const isFly = Boolean(process.env.FLY_APP_NAME);
const PORT = Number(process.env.PORT ?? 3000);

// Build allowed origins from env + always allow local dev
const allowedOrigins: string[] = [
	'http://localhost:5173', // Vite app
	'http://localhost:4321', // Astro dev server
	'http://localhost:4321'
];
// Support comma-separated list e.g. FRONTEND_URL=https://app.sharkly.co,https://sharkly.co
if (process.env.FRONTEND_URL) {
	allowedOrigins.push(...process.env.FRONTEND_URL.split(',').map((u) => u.trim()));
}

const corsMiddleware = cors({
	origin: (origin, callback) => {
		// Allow requests with no origin (e.g. server-to-server, curl)
		if (!origin) return callback(null, true);
		if (allowedOrigins.includes(origin)) return callback(null, true);
		callback(new Error(`CORS: origin ${origin} not allowed`));
	},
	credentials: true
});

app.use((req, res, next) => {
	if (isServerWebhookPath(req.path)) {
		return next();
	}
	return corsMiddleware(req, res, next);
});

// Webhooks BEFORE JSON parsing (replace stubs with real handlers if needed)
// Public: no JWT — verified via provider signature / HMAC only. Must stay above any future global auth.
app.post('/api/billing/stripe/webhook', express.raw({ type: '*/*' }), (req, res) =>
	handleStripeWebhook(req, res)
);
app.post('/api/payments/webhook', express.raw({ type: '*/*' }), (req, res) =>
	handleStripeWebhook(req, res)
);

// Shopify mandatory webhooks (GDPR + uninstall) — raw body for HMAC verification.
// Public: no JWT (Shopify server-to-server). CORS skipped for /webhooks/* above.
// `type: () => true` so every Content-Type (e.g. application/json; charset=utf-8) gets a Buffer;
// if the matcher skips parsing, req.body is not a Buffer and HMAC always fails (401).
const shopifyWebhookRaw = express.raw({ limit: '1mb', type: () => true });
// Single base URL (Partner HMAC probe + TOML `uri`) — not `POST /webhooks`, so other providers keep their own paths.
app.post('/webhooks/shopify', shopifyWebhookRaw, (req, res) => shopifyComplianceUnified(req, res));
// Mandatory compliance + uninstall — full paths if you register per-topic URLs in Partner Dashboard.
app.post('/webhooks/shopify/customers/data_request', shopifyWebhookRaw, (req, res) =>
	customersDataRequest(req, res)
);
app.post('/webhooks/shopify/customers/redact', shopifyWebhookRaw, (req, res) =>
	customersRedact(req, res)
);
app.post('/webhooks/shopify/shop/redact', shopifyWebhookRaw, (req, res) =>
	shopRedact(req, res)
);
app.post('/webhooks/shopify/app-uninstalled', shopifyWebhookRaw, (req, res) =>
	appUninstalled(req, res)
);

// Supabase Auth — Send Email hook (Standard Webhooks + Resend). No JWT; verified via SUPABASE_AUTH_EMAIL_HOOK_SECRET.
app.post('/webhooks/supabase/auth-email', express.raw({ type: '*/*' }), (req, res) =>
	handleSupabaseAuthEmailHook(req, res)
);

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use('/api/payments', paymentRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/billing', billingOnboardingRoutes);
app.use('/api/billing/admin', billingAdminRoutes);
app.use('/api/organizations', organizationStatusRoutes);
app.use('/api/trial', trialStatusRoutes);
app.use('/api/subscription', subscriptionStatusRoutes);
app.use('/api', paymentStatusRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/images', imagesRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/clusters', clustersRoutes);
app.use('/api/pages', pagesRoutes);
app.use('/api/gsc', gscRoutes);
app.use('/api/rankings', rankingsRoutes);
app.use('/api/content', contentGeneratorRoutes);
app.use('/api/crawler', crawlerRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/keywords', keywordsRoutes);
app.use('/api/strategy', strategyRoutes);
app.use('/api/sites', sitesRoutes);
app.use('/api/targets', targetsRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/refunds', refundsRoutes);
app.use('/api/ai', aiChatRoutes);
app.use('/api/ai/files', chatFilesRoutes);
app.use('/api/priority-stack', priorityStackRoutes);
app.use('/api/shopify', shopifyRoutes);
app.use('/api/ecommerce', ecommerceRoutes);
app.use('/api/seo-checks', seoChecksRoutes);
app.use('/api/cro-studio', croStudioRoutes);

// Shopify companion app: OAuth callback and install (path matches SHOPIFY_REDIRECT_URI)
app.get('/auth/shopify/callback', handleShopifyOAuthCallback);
app.get('/auth/shopify/install', startShopifyOAuthInstall);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Sentry Express error handler — must be after routes, before custom error middleware
if (sentryEnabled()) {
	Sentry.setupExpressErrorHandler(app);
}

// Error handler
type HttpError = Error & { statusCode?: number };
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
	const e: HttpError = err as HttpError;
	void _next;
	if (typeof e?.statusCode === 'number') {
		return res.status(e.statusCode).json({ error: { message: e.message } });
	}
	console.error(err);
	captureApiError(err, req, { feature: 'express-unhandled-error' });
	res.status(500).json({ error: { message: 'Internal server error' } });
});

// ==== Listener: local vs Fly ====
const LISTEN_HOST = isFly ? '0.0.0.0' : '127.0.0.1';

app.listen(PORT, LISTEN_HOST, () => {
	logSentryConfigStatus();
	console.log(`API listening on http://${LISTEN_HOST}:${PORT} ${isFly ? '(Fly)' : '(Local)'}`);
});
