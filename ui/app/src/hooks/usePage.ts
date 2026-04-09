import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';

export type CroChecklistData = {
	evaluated_at?: string;
	page_type?: string;
	score?: number;
	max_score?: number;
	items?: Record<string, { status: string; evidence: string }>;
	funnel_mismatch?: string | null;
};

export type PageDetail = {
	id: string;
	clusterId: string;
	title: string;
	keyword: string;
	authorBioOverride?: string | null;
	volume: number;
	kd: number;
	funnel: 'tofu' | 'mofu' | 'bofu';
	pageType: string | null;
	status: 'planned' | 'brief_generated' | 'draft' | 'published';
	type: 'focus_page' | 'article';
	seoScore: number;
	wordCount: number;
	targetWordCount: number;
	content: string | null;
	briefData: Record<string, unknown> | null;
	metaTitle: string | null;
	metaDescription: string | null;
	position_x: number;
	position_y: number;
	slug: string | null;
	/** Full URL from published_url — for GSC page matching */
	publishedUrl: string | null;
	croChecklist: CroChecklistData | null;
	croScore: number;
	/** Denormalized from pages — needed when inserting `videos` rows. */
	siteId: string;
	/** Draft video row id (`videos` where status = draft), if any. */
	videoDraftId: string | null;
	/** Script JSON from the draft `videos` row (same shape as generate-script API). */
	videoScriptDraft: unknown | null;
	/** `videos.render_options` for the draft row (e.g. branding). */
	videoRenderOptionsDraft: unknown | null;
	/** Latest rendered MP4 URL for this page (`videos.output_url`), survives reload. */
	videoOutputUrl: string | null;
};

export type PageRefetchOptions = {
	/** When true, do not set `loading` — avoids unmounting the workspace (e.g. modals open during draft save). */
	silent?: boolean;
};

export function usePage(pageId: string | null) {
	const [page, setPage] = useState<PageDetail | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchPage = useCallback(async (opts?: PageRefetchOptions) => {
		if (!pageId) {
			setPage(null);
			setLoading(false);
			return;
		}
		try {
			if (!opts?.silent) {
				setLoading(true);
			}
			setError(null);
			const { data, error: fetchErr } = await supabase
				.from('pages')
				.select(
					'id, cluster_id, site_id, title, keyword, monthly_searches, keyword_difficulty, funnel_stage, page_type, status, type, seo_score, word_count, target_word_count, content, brief_data, meta_title, meta_description, position_x, position_y, published_url, cro_checklist, cro_score, author_bio_override'
				)
				.eq('id', pageId)
				.single();

			if (fetchErr) {
				console.error('[usePage] Supabase error', {
					pageId,
					message: fetchErr.message,
					details: (fetchErr as { details?: string }).details,
					hint: (fetchErr as { hint?: string }).hint,
					code: (fetchErr as { code?: string }).code
				});
				throw fetchErr;
			}

			if (!data) {
				setPage(null);
				return;
			}

			const { data: videoRows, error: videosErr } = await supabase
				.from('videos')
				.select('id, script_json, render_options, status, output_url, updated_at')
				.eq('page_id', pageId)
				.order('updated_at', { ascending: false });

			if (videosErr) {
				console.error('[usePage] videos load', videosErr);
			}

			const rows = Array.isArray(videoRows) ? videoRows : [];
			const draftVideo =
				(rows as Array<{ status?: string }>).find((r) => r.status === 'draft') ?? null;
			const withOutput = rows.find(
				(r: { output_url?: string | null }) =>
					typeof r.output_url === 'string' && r.output_url.trim().length > 0
			) as
				| {
						id?: string;
						script_json?: unknown;
						render_options?: unknown;
						output_url?: string;
				  }
				| undefined;

			// slug: from published_url path (e.g. /blog/my-page) or null
			const pubUrl = data.published_url as string | null | undefined;
			const slugVal =
				typeof pubUrl === 'string' && pubUrl
					? pubUrl.replace(/^https?:\/\/[^/]+/, '').replace(/^\//, '') || null
					: null;

			setPage({
				id: data.id,
				clusterId: data.cluster_id,
				siteId: data.site_id as string,
				title: data.title,
				keyword: data.keyword || '',
				authorBioOverride: (data.author_bio_override as string | null) ?? null,
				volume: data.monthly_searches ?? 0,
				kd: data.keyword_difficulty ?? 0,
				funnel: (data.funnel_stage as PageDetail['funnel']) || 'mofu',
				pageType: (data.page_type as string | null) ?? null,
				status: (data.status as PageDetail['status']) || 'planned',
				type: (data.type as PageDetail['type']) || 'article',
				seoScore: data.seo_score ?? 0,
				wordCount: data.word_count ?? 0,
				targetWordCount: data.target_word_count ?? 1000,
				content: data.content,
				briefData: (data.brief_data as Record<string, unknown>) || null,
				metaTitle: data.meta_title,
				metaDescription: data.meta_description,
				position_x: data.position_x ?? 0,
				position_y: data.position_y ?? 0,
				slug: slugVal,
				publishedUrl: (typeof pubUrl === 'string' && pubUrl ? pubUrl : null) ?? null,
				croChecklist: (data.cro_checklist as CroChecklistData) ?? null,
				croScore: data.cro_score ?? 0,
				videoDraftId: (draftVideo as { id?: string } | null)?.id ?? null,
				videoScriptDraft:
					(draftVideo as { script_json?: unknown } | null)?.script_json ??
					(withOutput?.script_json ?? null),
				videoRenderOptionsDraft:
					(draftVideo as { render_options?: unknown } | null)?.render_options ??
					(withOutput?.render_options ?? null),
				videoOutputUrl: withOutput?.output_url?.trim() ?? null
			});
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Failed to load page';
			console.error('[usePage] Failed to load page', { pageId, error: err, message: msg });
			setError(msg);
			setPage(null);
		} finally {
			setLoading(false);
		}
	}, [pageId]);

	useEffect(() => {
		fetchPage();
	}, [fetchPage]);

	return { page, loading, error, refetch: fetchPage };
}
