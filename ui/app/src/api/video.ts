/**
 * Blog-to-video job API — Express proxies to video-service (`/api/video/*`).
 * @see docs/blog-to-video-spec.md (Frontend Integration)
 */

import { api } from '../utils/api';

/** Mirrors `video-service/config/video_font_catalog.json`. */
export interface VideoFontCatalog {
	version: number;
	fonts: Array<{
		id: string;
		label: string;
		category?: string;
		pangoFamily: string;
		files?: Array<{ filename: string; url: string }>;
	}>;
	defaults?: { headingFontId?: string; bodyFontId?: string };
	colors?: Record<string, string>;
}

export interface VideoJobOptions {
	maxDurationSeconds?: number;
	includeCaptions?: boolean;
	quality?: 'low' | 'medium' | 'high';
	/** Resolved Pango families + hex colors; merged over Sharkly brand JSON in the worker. */
	brandOverride?: {
		colors: Record<string, string>;
		fonts: { heading: string; body: string };
	};
}

export interface VideoJobStatus {
	job_id: string;
	status: string;
	progress: number;
	current_step: string | null;
	download_url: string | null;
	error: string | null;
}

/** POST /api/video/generate-script — Claude script from article (sync). Charged separately from render. */
export async function generateVideoScript(
	articleContent: string,
	inputType: 'url' | 'text' | 'tiptap_json' | 'brief',
	options: Pick<VideoJobOptions, 'maxDurationSeconds' | 'quality'> = {},
	clusterId?: string,
	articleId?: string
): Promise<Record<string, unknown>> {
	const res = await api.post('/api/video/generate-script', {
		brand_id: 'sharkly',
		input_type: inputType,
		content: articleContent,
		cluster_id: clusterId,
		article_id: articleId,
		options: {
			max_duration_seconds: options.maxDurationSeconds ?? 300,
			quality: options.quality ?? 'medium'
		}
	});
	const data = (await res.json().catch(() => ({}))) as {
		error?: string;
		detail?: string | Array<{ msg?: string }>;
		script?: Record<string, unknown>;
		required?: number;
		available?: number;
	};
	if (!res.ok) {
		if (res.status === 402) {
			const msg =
				typeof data.detail === 'string'
					? data.detail
					: data.error || 'Insufficient credits for script generation';
			const err = new Error(msg) as Error & {
				code: string;
				required?: number;
				available?: number;
			};
			err.code = 'insufficient_credits';
			err.required = data.required;
			err.available = data.available;
			throw err;
		}
		const msg =
			typeof data.detail === 'string'
				? data.detail
				: Array.isArray(data.detail) && data.detail[0]?.msg
					? String(data.detail[0].msg)
					: data.error || `Request failed (${res.status})`;
		throw new Error(msg);
	}
	if (!data.script || typeof data.script !== 'object') {
		throw new Error('Script generation did not return a script object');
	}
	return data.script;
}

/** GET /api/video/font-catalog — curated fonts for blog-to-video UI. */
export async function fetchVideoFontCatalog(): Promise<VideoFontCatalog> {
	const res = await api.get('/api/video/font-catalog');
	if (!res.ok) {
		let msg = `Request failed (${res.status})`;
		try {
			const data = (await res.json()) as { error?: string; detail?: string };
			if (typeof data.detail === 'string') msg = data.detail;
			else if (data.error) msg = data.error;
		} catch {
			/* ignore */
		}
		throw new Error(msg);
	}
	return res.json() as Promise<VideoFontCatalog>;
}

async function parseJsonError(res: Response): Promise<never> {
	let msg = `Request failed (${res.status})`;
	try {
		const data = (await res.json()) as { error?: string; detail?: string | Array<{ msg?: string }> };
		if (typeof data.detail === 'string') msg = data.detail;
		else if (Array.isArray(data.detail) && data.detail[0]?.msg) msg = String(data.detail[0].msg);
		else if (data.error) msg = data.error;
	} catch {
		/* ignore */
	}
	throw new Error(msg);
}

export async function createVideoJob(
	content: string,
	inputType: 'url' | 'text' | 'tiptap_json' | 'brief' | 'script_json',
	options: VideoJobOptions = {},
	clusterId?: string,
	articleId?: string,
	cartesiaVoiceId?: string
): Promise<{ job_id: string; status: string }> {
	const res = await api.post('/api/video/create', {
		brand_id: 'sharkly',
		input_type: inputType,
		content,
		cluster_id: clusterId,
		article_id: articleId,
		cartesia_voice_id: cartesiaVoiceId,
		...(options.brandOverride ? { brand_override: options.brandOverride } : {}),
		options: {
			max_duration_seconds: options.maxDurationSeconds ?? 300,
			include_captions: options.includeCaptions ?? true,
			quality: options.quality ?? 'medium'
		}
	});
	const data = (await res.json().catch(() => ({}))) as {
		error?: string;
		detail?: string | Array<{ msg?: string }>;
		job_id?: string;
		status?: string;
		required?: number;
		available?: number;
	};
	if (!res.ok) {
		if (res.status === 402) {
			const msg =
				typeof data.detail === 'string'
					? data.detail
					: data.error || 'Insufficient credits for this video action';
			const err = new Error(msg) as Error & {
				code: string;
				required?: number;
				available?: number;
			};
			err.code = 'insufficient_credits';
			err.required = data.required;
			err.available = data.available;
			throw err;
		}
		// Re-parse for generic errors (parseJsonError expects Response — duplicate message logic)
		const msg =
			typeof data.detail === 'string'
				? data.detail
				: Array.isArray(data.detail) && data.detail[0]?.msg
					? String(data.detail[0].msg)
					: data.error || `Request failed (${res.status})`;
		throw new Error(msg);
	}
	if (!data.job_id) {
		throw new Error('Video service did not return a job id');
	}
	return { job_id: data.job_id, status: data.status ?? 'queued' };
}

export async function pollVideoJob(jobId: string): Promise<VideoJobStatus> {
	const res = await api.get(`/api/video/job/${jobId}`);
	if (!res.ok) return parseJsonError(res);
	return res.json() as Promise<VideoJobStatus>;
}

/** Poll every 3s until complete or failed; resolves with signed download URL. */
export async function waitForVideo(
	jobId: string,
	onProgress?: (job: VideoJobStatus) => void
): Promise<string> {
	return new Promise((resolve, reject) => {
		let intervalId: ReturnType<typeof setInterval> | undefined;

		const cleanup = () => {
			if (intervalId !== undefined) {
				clearInterval(intervalId);
				intervalId = undefined;
			}
		};

		const run = async () => {
			try {
				const job = await pollVideoJob(jobId);
				onProgress?.(job);
				if (job.status === 'complete') {
					cleanup();
					if (!job.download_url) {
						reject(new Error('Video completed but no download URL was returned'));
					} else {
						resolve(job.download_url);
					}
				} else if (job.status === 'failed') {
					cleanup();
					reject(new Error(job.error ?? 'Video generation failed'));
				}
			} catch (e) {
				cleanup();
				reject(e instanceof Error ? e : new Error(String(e)));
			}
		};

		void run();
		intervalId = setInterval(() => void run(), 3000);
	});
}
