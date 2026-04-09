/**
 * Stage 2: Proxy blog-to-video job API to video-service (FastAPI).
 * When VIDEO_SERVICE_URL is unset, returns 503 with a clear code (no MP4 pipeline yet).
 * POST /create charges VIDEO_RENDER (script_json) or VIDEO_GENERATION (article) — refunds if upstream fails.
 * POST /generate-script charges VIDEO_SCRIPT_GENERATION.
 */

import type { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';
import { CREDIT_COSTS } from '../utils/credits.js';
import { captureApiError, captureApiWarning, captureFeatureFailure } from '../utils/sentryCapture.js';
import { createNotificationForUser, maybeNotifyCreditsLow } from '../utils/notifications.js';

function videoServiceBaseUrl(): string | null {
	const raw = process.env.VIDEO_SERVICE_URL?.trim();
	if (!raw) return null;
	return raw.replace(/\/$/, '');
}

/** Path on the Python app (includes /api/video prefix per docs/blog-to-video-spec.md). */
function upstreamUrl(path: string): string | null {
	const base = videoServiceBaseUrl();
	if (!base) return null;
	const p = path.startsWith('/') ? path : `/${path}`;
	return `${base}${p}`;
}

async function getOrgIdForUser(userId: string): Promise<string | null> {
	const { data: userOrg } = await supabase
		.from('user_organizations')
		.select('organization_id')
		.eq('user_id', userId)
		.order('created_at', { ascending: true })
		.limit(1)
		.maybeSingle();
	return userOrg?.organization_id ?? null;
}

type VideoRefundActionKey = 'video_generation' | 'video_script_generation' | 'video_render';

async function refundVideoCredits(
	orgId: string,
	userId: string,
	credits: number,
	reason: string,
	actionKey: VideoRefundActionKey
): Promise<void> {
	try {
		const { error: refundErr } = await supabase.rpc('credit_back_action', {
			p_org_id: orgId,
			p_action_key: actionKey,
			p_credits: credits,
			p_reason: reason
		});
		if (refundErr) {
			console.error('[Video] credit_back_action failed:', refundErr.message);
			captureApiWarning(`video refund failed (${actionKey}): ${refundErr.message}`, undefined, {
				feature: 'video-generation',
				orgId,
				credits,
				actionKey
			});
			return;
		}
		await createNotificationForUser(userId, orgId, {
			title: 'Credits refunded',
			message: `${credits} credits were returned — ${reason}`,
			type: 'credit_refund',
			priority: 'high',
			metadata: { credits_refunded: credits, reason, action_key: actionKey },
			skipToast: true
		});
	} catch (e) {
		captureApiError(e, undefined, { feature: 'video-generation', stage: 'refund_exception', orgId });
	}
}

async function forward(
	req: Request,
	res: Response,
	upstreamPath: string,
	opts: { method?: string; jsonBody?: unknown }
): Promise<void> {
	const url = upstreamUrl(upstreamPath);
	if (!url) {
		res.status(503).json({
			error: 'Video service is not configured',
			code: 'video_service_unavailable',
			hint: 'Set VIDEO_SERVICE_URL to the blog-to-video FastAPI base URL (e.g. http://localhost:8000).'
		});
		return;
	}

	const method = opts.method ?? req.method;
	const headers: Record<string, string> = {};
	const incomingCt = req.headers['content-type'];
	if (incomingCt) headers['Content-Type'] = typeof incomingCt === 'string' ? incomingCt : incomingCt[0] ?? 'application/json';
	else if (method !== 'GET' && method !== 'HEAD') headers['Content-Type'] = 'application/json';

	const auth = req.headers.authorization;
	if (auth) headers['Authorization'] = auth;

	const init: RequestInit = { method, headers };
	if (method !== 'GET' && method !== 'HEAD') {
		if (opts.jsonBody !== undefined) {
			init.body = JSON.stringify(opts.jsonBody);
		} else if (req.body != null && typeof req.body === 'object') {
			init.body = JSON.stringify(req.body);
		}
	}

	try {
		const r = await fetch(url, init);
		const ct = r.headers.get('content-type');
		const buf = Buffer.from(await r.arrayBuffer());
		res.status(r.status);
		if (ct) res.setHeader('Content-Type', ct);
		const loc = r.headers.get('location');
		if (loc) res.setHeader('Location', loc);
		if (buf.length) res.send(buf);
		else res.end();
	} catch (e) {
		captureApiError(e, req, { feature: 'video-generation', path: upstreamPath });
		res.status(502).json({
			error: 'Video service unreachable',
			code: 'video_service_unreachable'
		});
	}
}

/** POST /api/video/create */
export async function proxyCreateVideoJob(req: Request, res: Response): Promise<void> {
	const userId = (req as Request & { userId?: string }).userId ?? req.user?.id;
	if (!userId) {
		res.status(401).json({ error: 'Unauthorized' });
		return;
	}

	const orgId = await getOrgIdForUser(userId);
	if (!orgId) {
		res.status(400).json({ error: 'No organization' });
		return;
	}

	const body = req.body as { article_id?: string; input_type?: string } | undefined;
	const isFromEditedScript = String(body?.input_type || '').toLowerCase() === 'script_json';
	const cost = isFromEditedScript ? CREDIT_COSTS.VIDEO_RENDER : CREDIT_COSTS.VIDEO_GENERATION;
	const refType = isFromEditedScript ? 'video_render' : 'video_generation';
	const refundKey: VideoRefundActionKey = isFromEditedScript ? 'video_render' : 'video_generation';
	const { data: spendResult, error: spendError } = await supabase.rpc('spend_credits', {
		p_org_id: orgId,
		p_credits: cost,
		p_reference_type: refType,
		p_reference_id: null,
		p_description: isFromEditedScript
			? `Blog-to-video render${body?.article_id ? ` (page ${body.article_id})` : ''}`
			: `Blog-to-video${body?.article_id ? ` (page ${body.article_id})` : ''}`
	});

	const rawSpend = spendResult as unknown;
	const spendRow = (Array.isArray(rawSpend) ? rawSpend[0] : rawSpend) as {
		ok?: boolean;
		reason?: string;
		included_remaining?: number;
	} | null;
	if (spendError || !spendRow?.ok) {
		if (spendError) {
			captureApiError(spendError, req, { feature: 'video-generation', stage: 'spend_credits', orgId });
		}
		res.status(402).json({
			error: 'Insufficient credits',
			required: cost,
			needs_topup: spendRow?.reason?.includes('insufficient') ?? false
		});
		return;
	}

	const url = upstreamUrl('/api/video/create');
	if (!url) {
		captureApiWarning('VIDEO_SERVICE_URL unset after spend_credits — refunding video credits', req, {
			feature: 'video-generation',
			orgId
		});
		await refundVideoCredits(orgId, userId, cost, 'Video service is not configured.', refundKey);
		res.status(503).json({
			error: 'Video service is not configured',
			code: 'video_service_unavailable',
			hint: 'Set VIDEO_SERVICE_URL to the blog-to-video FastAPI base URL (e.g. http://localhost:8000).'
		});
		return;
	}

	const method = 'POST';
	const headers: Record<string, string> = { 'Content-Type': 'application/json' };
	const auth = req.headers.authorization;
	if (auth) headers['Authorization'] = auth;

	try {
		const r = await fetch(url, {
			method,
			headers,
			body: JSON.stringify(req.body ?? {})
		});
		const buf = Buffer.from(await r.arrayBuffer());
		const ct = r.headers.get('content-type');

		if (!r.ok) {
			const detail =
				r.status >= 500
					? `Video service error (${r.status}).`
					: `Video job was not created (${r.status}).`;
			if (r.status >= 500) {
				captureFeatureFailure(
					`Video upstream returned ${r.status} after credits charged`,
					req,
					{ feature: 'video-generation', upstream_status: r.status, orgId }
				);
			} else {
				captureApiWarning(`Video upstream rejected create (${r.status})`, req, {
					feature: 'video-generation',
					upstream_status: r.status,
					orgId
				});
			}
			await refundVideoCredits(orgId, userId, cost, detail, refundKey);
			res.status(r.status);
			if (ct) res.setHeader('Content-Type', ct);
			if (buf.length) res.send(buf);
			else res.end();
			return;
		}

		const remaining = spendRow.included_remaining;
		if (remaining !== undefined && remaining !== null) {
			await maybeNotifyCreditsLow(orgId, remaining);
		}

		res.status(r.status);
		if (ct) res.setHeader('Content-Type', ct);
		if (buf.length) res.send(buf);
		else res.end();
	} catch (e) {
		captureApiError(e, req, { feature: 'video-generation', path: '/api/video/create', orgId });
		await refundVideoCredits(orgId, userId, cost, 'Video service unreachable.', refundKey);
		res.status(502).json({
			error: 'Video service unreachable',
			code: 'video_service_unreachable'
		});
	}
}

/** POST /api/video/generate-script — Claude script from article (sync); charged separately from render. */
export async function proxyGenerateVideoScript(req: Request, res: Response): Promise<void> {
	const userId = (req as Request & { userId?: string }).userId ?? req.user?.id;
	if (!userId) {
		res.status(401).json({ error: 'Unauthorized' });
		return;
	}

	const orgId = await getOrgIdForUser(userId);
	if (!orgId) {
		res.status(400).json({ error: 'No organization' });
		return;
	}

	const cost = CREDIT_COSTS.VIDEO_SCRIPT_GENERATION;
	const refundKey: VideoRefundActionKey = 'video_script_generation';
	const body = req.body as { article_id?: string } | undefined;
	const { data: spendResult, error: spendError } = await supabase.rpc('spend_credits', {
		p_org_id: orgId,
		p_credits: cost,
		p_reference_type: 'video_script_generation',
		p_reference_id: null,
		p_description: `Blog-to-video script${body?.article_id ? ` (page ${body.article_id})` : ''}`
	});

	const rawSpend = spendResult as unknown;
	const spendRow = (Array.isArray(rawSpend) ? rawSpend[0] : rawSpend) as {
		ok?: boolean;
		reason?: string;
		included_remaining?: number;
	} | null;
	if (spendError || !spendRow?.ok) {
		if (spendError) {
			captureApiError(spendError, req, { feature: 'video-generation', stage: 'spend_script_credits', orgId });
		}
		res.status(402).json({
			error: 'Insufficient credits',
			required: cost,
			needs_topup: spendRow?.reason?.includes('insufficient') ?? false
		});
		return;
	}

	const url = upstreamUrl('/api/video/generate-script');
	if (!url) {
		captureApiWarning('VIDEO_SERVICE_URL unset after script spend_credits', req, {
			feature: 'video-generation',
			orgId
		});
		await refundVideoCredits(orgId, userId, cost, 'Video service is not configured.', refundKey);
		res.status(503).json({
			error: 'Video service is not configured',
			code: 'video_service_unavailable',
			hint: 'Set VIDEO_SERVICE_URL to the blog-to-video FastAPI base URL (e.g. http://localhost:8000).'
		});
		return;
	}

	const method = 'POST';
	const headers: Record<string, string> = { 'Content-Type': 'application/json' };
	const auth = req.headers.authorization;
	if (auth) headers['Authorization'] = auth;

	try {
		const r = await fetch(url, {
			method,
			headers,
			body: JSON.stringify(req.body ?? {})
		});
		const buf = Buffer.from(await r.arrayBuffer());
		const ct = r.headers.get('content-type');

		if (!r.ok) {
			const detail =
				r.status >= 500
					? `Video script service error (${r.status}).`
					: `Script was not generated (${r.status}).`;
			if (r.status >= 500) {
				captureFeatureFailure(
					`Video generate-script upstream ${r.status} after credits charged`,
					req,
					{ feature: 'video-generation', upstream_status: r.status, orgId }
				);
			} else {
				captureApiWarning(`Video generate-script rejected (${r.status})`, req, {
					feature: 'video-generation',
					upstream_status: r.status,
					orgId
				});
			}
			await refundVideoCredits(orgId, userId, cost, detail, refundKey);
			res.status(r.status);
			if (ct) res.setHeader('Content-Type', ct);
			if (buf.length) res.send(buf);
			else res.end();
			return;
		}

		const remaining = spendRow.included_remaining;
		if (remaining !== undefined && remaining !== null) {
			await maybeNotifyCreditsLow(orgId, remaining);
		}

		res.status(r.status);
		if (ct) res.setHeader('Content-Type', ct);
		if (buf.length) res.send(buf);
		else res.end();
	} catch (e) {
		captureApiError(e, req, { feature: 'video-generation', path: '/api/video/generate-script', orgId });
		await refundVideoCredits(orgId, userId, cost, 'Video service unreachable.', refundKey);
		res.status(502).json({
			error: 'Video service unreachable',
			code: 'video_service_unreachable'
		});
	}
}

/** GET /api/video/font-catalog — curated fonts + default colors (no credit charge). */
export async function proxyGetVideoFontCatalog(req: Request, res: Response): Promise<void> {
	await forward(req, res, '/api/video/font-catalog', { method: 'GET' });
}

/** GET /api/video/job/:jobId */
export async function proxyGetVideoJob(req: Request, res: Response): Promise<void> {
	const { jobId } = req.params;
	if (!jobId) {
		res.status(400).json({ error: 'jobId required' });
		return;
	}
	await forward(req, res, `/api/video/job/${encodeURIComponent(jobId)}`, { method: 'GET' });
}

/** GET /api/video/download/:jobId */
export async function proxyDownloadVideo(req: Request, res: Response): Promise<void> {
	const { jobId } = req.params;
	if (!jobId) {
		res.status(400).json({ error: 'jobId required' });
		return;
	}
	await forward(req, res, `/api/video/download/${encodeURIComponent(jobId)}`, { method: 'GET' });
}

/** DELETE /api/video/job/:jobId */
export async function proxyDeleteVideoJob(req: Request, res: Response): Promise<void> {
	const { jobId } = req.params;
	if (!jobId) {
		res.status(400).json({ error: 'jobId required' });
		return;
	}
	await forward(req, res, `/api/video/job/${encodeURIComponent(jobId)}`, { method: 'DELETE' });
}

/**
 * GET /api/video/service-health — proxies to FastAPI GET /api/health (or root health).
 * Auth required so only logged-in users probe the pipeline.
 */
export async function proxyVideoServiceHealth(req: Request, res: Response): Promise<void> {
	const base = videoServiceBaseUrl();
	if (!base) {
		res.status(503).json({
			configured: false,
			code: 'video_service_unavailable',
			hint: 'Set VIDEO_SERVICE_URL (e.g. http://localhost:8000 when video-service runs).'
		});
		return;
	}

	try {
		const r = await fetch(`${base}/api/health`, { method: 'GET' });
		const ct = r.headers.get('content-type') ?? 'application/json';
		const text = await r.text();
		res.status(r.status).type(ct).send(text || '{}');
	} catch (e) {
		captureApiError(e, req, { feature: 'video-generation', path: 'service-health' });
		res.status(502).json({ configured: true, reachable: false, error: 'Video service unreachable' });
	}
}
