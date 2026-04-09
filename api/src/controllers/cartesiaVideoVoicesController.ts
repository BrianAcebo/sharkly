/**
 * Cartesia proxy for blog-to-video: list voices, preview, clone, delete.
 * See docs/blog-to-video-spec.md and docs/cartesia-tts-product-spec.md
 */

import type { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';
import { captureApiError } from '../utils/sentryCapture.js';

const CARTESIA_BASE = 'https://api.cartesia.ai';
const CARTESIA_VERSION = '2024-06-10';
const PREVIEW_MAX_CHARS = 500;

function cartesiaHeaders(): HeadersInit {
	const key = process.env.CARTESIA_API_KEY;
	if (!key) {
		throw new Error('CARTESIA_API_KEY is not configured');
	}
	return {
		'X-API-Key': key,
		'Cartesia-Version': CARTESIA_VERSION
	};
}

async function getOrgIdForUser(userId: string): Promise<string | null> {
	const { data } = await supabase
		.from('user_organizations')
		.select('organization_id')
		.eq('user_id', userId)
		.order('created_at', { ascending: true })
		.limit(1)
		.maybeSingle();
	return data?.organization_id ?? null;
}

function normalizeVoiceList(raw: unknown): Array<{
	id: string;
	name: string;
	language?: string;
	gender?: string;
	description?: string;
}> {
	const rows: unknown[] = Array.isArray(raw)
		? raw
		: raw && typeof raw === 'object' && 'voices' in raw && Array.isArray((raw as { voices: unknown }).voices)
			? (raw as { voices: unknown[] }).voices
			: raw && typeof raw === 'object' && 'data' in raw && Array.isArray((raw as { data: unknown }).data)
				? (raw as { data: unknown[] }).data
				: [];
	const seen = new Set<string>();
	const out: Array<{ id: string; name: string; language?: string; gender?: string; description?: string }> = [];
	for (const item of rows) {
		if (!item || typeof item !== 'object') continue;
		const o = item as Record<string, unknown>;
		const id = typeof o.id === 'string' ? o.id : null;
		if (!id || seen.has(id)) continue;
		seen.add(id);
		out.push({
			id,
			name: typeof o.name === 'string' ? o.name : 'Voice',
			...(typeof o.language === 'string' ? { language: o.language } : {}),
			...(typeof o.gender === 'string' ? { gender: o.gender } : {}),
			...(typeof o.description === 'string' ? { description: o.description } : {})
		});
	}
	return out;
}

/**
 * Cartesia Featured voice base names — matches their Featured tab (Blake first).
 * Used for blog-to-video voice list ordering and `featured` flag (same idea as ai-voice playbook).
 */
const FEATURED_VOICE_NAMES = [
	'Blake',
	'Brooke',
	'Katie',
	'Jacqueline',
	'Caroline',
	'Ronald',
	'Riya',
	'Cathy',
	'Arushi',
	'Theo',
	'Pedro',
	'Lauren',
	'Jameson',
	'Parvati',
	'Carson',
	'Daniela',
	'Henry',
	'Sebastian',
	'Huda',
	'Nour',
	'Rupert',
	'Daniel',
	'Alina',
	'Jihyun',
	'Viktoria',
	'Antoine'
];

/** Must match `video-service/config/brands/sharkly.json` → cartesia_voice_id */
const SHARKLY_DEFAULT_CARTESIA_VOICE_ID = 'a167e0f3-df7e-4d52-a9c3-f949145efdab';

type EnrichedCartesiaVoice = {
	id: string;
	name: string;
	subtitle?: string;
	displayName: string;
	language?: string;
	gender?: string;
	description?: string;
	featured: boolean;
	featuredOrder: number;
};

function enrichAndSortCartesiaVoices(
	base: Array<{ id: string; name: string; language?: string; gender?: string; description?: string }>
): EnrichedCartesiaVoice[] {
	const seenIds = new Set<string>();
	const seenFeaturedBaseNames = new Set<string>();
	const out: EnrichedCartesiaVoice[] = [];

	for (const voice of base) {
		if (seenIds.has(voice.id)) continue;
		seenIds.add(voice.id);
		const rawName = voice.name || 'Voice';
		const nameParts = rawName.split(' - ');
		const baseName = (nameParts[0]?.trim() || rawName).trim();
		const subtitlePart = nameParts[1]?.trim();
		const featuredIndex = FEATURED_VOICE_NAMES.indexOf(baseName);
		const isFeatured = featuredIndex !== -1;
		if (isFeatured) {
			if (seenFeaturedBaseNames.has(baseName)) continue;
			seenFeaturedBaseNames.add(baseName);
		}

		out.push({
			id: voice.id,
			name: baseName,
			...(subtitlePart ? { subtitle: subtitlePart } : {}),
			displayName: rawName,
			...(typeof voice.language === 'string' ? { language: voice.language } : {}),
			...(typeof voice.gender === 'string' ? { gender: voice.gender } : {}),
			...(typeof voice.description === 'string' ? { description: voice.description } : {}),
			featured: isFeatured,
			featuredOrder: isFeatured ? featuredIndex : 999
		});
	}

	out.sort((a, b) => {
		if (a.featured && b.featured) return a.featuredOrder - b.featuredOrder;
		if (a.featured) return -1;
		if (b.featured) return 1;
		return (a.name || '').localeCompare(b.name || '');
	});

	if (!out.some((v) => v.id === SHARKLY_DEFAULT_CARTESIA_VOICE_ID)) {
		out.unshift({
			id: SHARKLY_DEFAULT_CARTESIA_VOICE_ID,
			name: 'Blake',
			displayName: 'Blake',
			language: 'en',
			featured: true,
			featuredOrder: 0
		});
	}

	return out;
}

/** GET /api/video/voices — catalog from Cartesia */
export async function listCartesiaVoices(_req: Request, res: Response): Promise<void> {
	try {
		let headers: HeadersInit;
		try {
			headers = cartesiaHeaders();
		} catch {
			res.status(503).json({ error: 'Voice service is not configured' });
			return;
		}

		const r = await fetch(`${CARTESIA_BASE}/voices`, { headers });
		if (!r.ok) {
			const text = await r.text();
			console.error('[cartesia] list voices failed', r.status, text.slice(0, 200));
			res.status(r.status >= 400 && r.status < 600 ? r.status : 502).json({
				error: 'Failed to load voice catalog',
				details: text.slice(0, 200)
			});
			return;
		}
		const body = (await r.json()) as unknown;
		res.json({ voices: enrichAndSortCartesiaVoices(normalizeVoiceList(body)) });
	} catch (e) {
		captureApiError(e, _req, { feature: 'cartesia-list-voices' });
		res.status(500).json({ error: 'Failed to list voices' });
	}
}

/** GET /api/video/voices/organization — cloned voices for current org */
export async function listOrganizationVoices(req: Request, res: Response): Promise<void> {
	try {
		const userId = req.userId;
		if (!userId) {
			res.status(401).json({ error: 'Unauthorized' });
			return;
		}
		const orgId = await getOrgIdForUser(userId);
		if (!orgId) {
			res.status(403).json({ error: 'No organization' });
			return;
		}

		const { data, error } = await supabase
			.from('organization_cartesia_voices')
			.select('id, cartesia_voice_id, display_name, created_at')
			.eq('organization_id', orgId)
			.order('created_at', { ascending: false });

		if (error) {
			console.error('[cartesia] org voices', error);
			res.status(500).json({ error: 'Failed to load organization voices' });
			return;
		}

		res.json({ voices: data ?? [] });
	} catch (e) {
		captureApiError(e, req, { feature: 'cartesia-org-voices' });
		res.status(500).json({ error: 'Failed to list organization voices' });
	}
}

/** POST /api/video/voice/preview-audio */
export async function previewCartesiaAudio(req: Request, res: Response): Promise<void> {
	try {
		let headers: HeadersInit;
		try {
			headers = { ...cartesiaHeaders(), 'Content-Type': 'application/json' };
		} catch {
			res.status(503).json({ error: 'Voice service is not configured' });
			return;
		}

		const voiceId = typeof req.body?.voiceId === 'string' ? req.body.voiceId.trim() : '';
		let text =
			typeof req.body?.text === 'string' && req.body.text.trim()
				? req.body.text.trim()
				: 'This is a preview of your selected voice for Sharkly blog to video.';

		if (!voiceId) {
			res.status(400).json({ error: 'voiceId is required' });
			return;
		}
		if (text.length > PREVIEW_MAX_CHARS) {
			text = text.slice(0, PREVIEW_MAX_CHARS);
		}

		const payload = {
			model_id: 'sonic-turbo-2025-03-07',
			transcript: text,
			voice: { mode: 'id', id: voiceId },
			output_format: {
				container: 'mp3',
				encoding: 'mp3',
				sample_rate: 44100
			}
		};

		const r = await fetch(`${CARTESIA_BASE}/tts/bytes`, {
			method: 'POST',
			headers,
			body: JSON.stringify(payload)
		});

		if (!r.ok) {
			const errText = await r.text();
			console.error('[cartesia] preview failed', r.status, errText.slice(0, 300));
			res.status(r.status >= 400 && r.status < 600 ? r.status : 502).json({
				error: 'Preview synthesis failed',
				details: errText.slice(0, 200)
			});
			return;
		}

		const buf = Buffer.from(await r.arrayBuffer());
		res.json({
			audioBase64: buf.toString('base64'),
			mimeType: 'audio/mpeg'
		});
	} catch (e) {
		captureApiError(e, req, { feature: 'cartesia-preview' });
		res.status(500).json({ error: 'Preview failed' });
	}
}

/** POST /api/video/voice/clone — multipart: clip, name, description?, enhance? */
export async function cloneCartesiaVoice(req: Request, res: Response): Promise<void> {
	try {
		const userId = req.userId;
		if (!userId) {
			res.status(401).json({ error: 'Unauthorized' });
			return;
		}
		const orgId = await getOrgIdForUser(userId);
		if (!orgId) {
			res.status(403).json({ error: 'No organization' });
			return;
		}

		let key: string;
		try {
			key = process.env.CARTESIA_API_KEY!;
			if (!key) throw new Error('missing');
		} catch {
			res.status(503).json({ error: 'Voice service is not configured' });
			return;
		}

		const file = (req as Request & { file?: Express.Multer.File }).file;
		const name =
			typeof req.body?.name === 'string' && req.body.name.trim()
				? req.body.name.trim().slice(0, 120)
				: '';
		const description =
			typeof req.body?.description === 'string' ? req.body.description.trim().slice(0, 500) : '';
		const enhance = req.body?.enhance === 'true' || req.body?.enhance === true;

		if (!file?.buffer?.length) {
			res.status(400).json({ error: 'Audio clip file is required (field name: clip)' });
			return;
		}
		if (!name) {
			res.status(400).json({ error: 'name is required' });
			return;
		}

		const form = new FormData();
		form.append(
			'clip',
			new Blob([file.buffer], { type: file.mimetype || 'audio/wav' }),
			file.originalname?.endsWith('.wav') ? file.originalname : 'audio.wav'
		);
		form.append('name', name);
		if (description) form.append('description', description);
		if (enhance) form.append('enhance', 'true');

		const r = await fetch(`${CARTESIA_BASE}/voices/clone/clip`, {
			method: 'POST',
			headers: {
				'X-API-Key': key,
				'Cartesia-Version': CARTESIA_VERSION
			},
			body: form
		});

		if (!r.ok) {
			const errText = await r.text();
			console.error('[cartesia] clone failed', r.status, errText.slice(0, 400));
			res.status(r.status >= 400 && r.status < 600 ? r.status : 502).json({
				error: 'Voice clone failed',
				details: errText.slice(0, 300)
			});
			return;
		}

		const created = (await r.json()) as { id?: string };
		const cartesiaVoiceId = typeof created.id === 'string' ? created.id : null;
		if (!cartesiaVoiceId) {
			res.status(502).json({ error: 'Voice provider did not return a voice id' });
			return;
		}

		const { data: row, error: insErr } = await supabase
			.from('organization_cartesia_voices')
			.insert({
				organization_id: orgId,
				cartesia_voice_id: cartesiaVoiceId,
				display_name: name,
				created_by_user_id: userId
			})
			.select('id, cartesia_voice_id, display_name, created_at')
			.single();

		if (insErr) {
			console.error('[cartesia] insert org voice', insErr);
			// Best-effort: delete voice on Cartesia so we don't orphan
			try {
				await fetch(`${CARTESIA_BASE}/voices/${encodeURIComponent(cartesiaVoiceId)}`, {
					method: 'DELETE',
					headers: { 'X-API-Key': key, 'Cartesia-Version': CARTESIA_VERSION }
				});
			} catch {
				/* ignore */
			}
			res.status(500).json({ error: 'Failed to save cloned voice' });
			return;
		}

		res.status(201).json({ voice: row });
	} catch (e) {
		captureApiError(e, req, { feature: 'cartesia-clone' });
		res.status(500).json({ error: 'Clone failed' });
	}
}

/** DELETE /api/video/voice/:cartesiaVoiceId */
export async function deleteOrganizationVoice(req: Request, res: Response): Promise<void> {
	try {
		const userId = req.userId;
		if (!userId) {
			res.status(401).json({ error: 'Unauthorized' });
			return;
		}
		const orgId = await getOrgIdForUser(userId);
		if (!orgId) {
			res.status(403).json({ error: 'No organization' });
			return;
		}

		const cartesiaVoiceId = typeof req.params.cartesiaVoiceId === 'string' ? req.params.cartesiaVoiceId.trim() : '';
		if (!cartesiaVoiceId) {
			res.status(400).json({ error: 'Invalid voice id' });
			return;
		}

		const { data: row, error: findErr } = await supabase
			.from('organization_cartesia_voices')
			.select('id')
			.eq('organization_id', orgId)
			.eq('cartesia_voice_id', cartesiaVoiceId)
			.maybeSingle();

		if (findErr || !row) {
			res.status(404).json({ error: 'Voice not found in your organization' });
			return;
		}

		let key: string;
		try {
			key = process.env.CARTESIA_API_KEY!;
			if (!key) throw new Error('missing');
		} catch {
			res.status(503).json({ error: 'Voice service is not configured' });
			return;
		}

		const delRemote = await fetch(`${CARTESIA_BASE}/voices/${encodeURIComponent(cartesiaVoiceId)}`, {
			method: 'DELETE',
			headers: { 'X-API-Key': key, 'Cartesia-Version': CARTESIA_VERSION }
		});

		if (!delRemote.ok && delRemote.status !== 404) {
			const t = await delRemote.text();
			console.error('[cartesia] delete remote failed', delRemote.status, t.slice(0, 200));
			res.status(502).json({ error: 'Failed to delete voice on the voice provider' });
			return;
		}

		const { error: delDb } = await supabase.from('organization_cartesia_voices').delete().eq('id', row.id);

		if (delDb) {
			console.error('[cartesia] delete db', delDb);
			res.status(500).json({ error: 'Failed to remove voice record' });
			return;
		}

		await supabase
			.from('sites')
			.update({ cartesia_voice_id: null })
			.eq('organization_id', orgId)
			.eq('cartesia_voice_id', cartesiaVoiceId);

		res.status(204).send();
	} catch (e) {
		captureApiError(e, req, { feature: 'cartesia-delete-voice' });
		res.status(500).json({ error: 'Delete failed' });
	}
}
