import type { VideoFontCatalog } from '../api/video';

export type VideoBrandingColors = {
	background: string;
	primary_text: string;
	accent: string;
	gold: string;
	muted: string;
};

/** Persisted on `sites.video_branding` and in `videos.render_options.branding`. */
export type VideoBranding = {
	headingFontId: string;
	bodyFontId: string;
	colors: VideoBrandingColors;
};

export type VideoDraftRenderOptions = {
	branding?: VideoBranding;
	/** Per-video narration voice UUID; overrides site default for this render. Null/omit = use site. */
	cartesia_voice_id?: string | null;
	/** Videos hub only: raw source text used for AI script generation (persisted so Step 1 isn’t retyped). */
	manual_script_source?: string | null;
};

/** Sharkly base brand — matches `video-service/config/brands/sharkly.json` and catalog defaults. */
export const SHARKLY_VIDEO_BRANDING: VideoBranding = {
	headingFontId: 'montserrat',
	bodyFontId: 'lato',
	colors: {
		background: '#0a0a0a',
		primary_text: '#f5f3ed',
		accent: '#2563eb',
		gold: '#d97706',
		muted: '#6b7280'
	}
};

function isHexColor(s: string): boolean {
	return /^#[0-9A-Fa-f]{6}$/.test(s);
}

function parseColors(raw: unknown): VideoBrandingColors | null {
	if (!raw || typeof raw !== 'object') return null;
	const o = raw as Record<string, unknown>;
	const background = o.background;
	const primary_text = o.primary_text;
	const accent = o.accent;
	const gold = o.gold;
	const muted = o.muted;
	if (
		typeof background === 'string' &&
		typeof primary_text === 'string' &&
		typeof accent === 'string' &&
		typeof gold === 'string' &&
		typeof muted === 'string' &&
		isHexColor(background) &&
		isHexColor(primary_text) &&
		isHexColor(accent) &&
		isHexColor(gold) &&
		isHexColor(muted)
	) {
		return { background, primary_text, accent, gold, muted };
	}
	return null;
}

/** Parse `sites.video_branding` or draft JSON. */
export function parseVideoBranding(raw: unknown): VideoBranding | null {
	if (!raw || typeof raw !== 'object') return null;
	const o = raw as Record<string, unknown>;
	const headingFontId = o.headingFontId;
	const bodyFontId = o.bodyFontId;
	const colors = parseColors(o.colors);
	if (typeof headingFontId !== 'string' || typeof bodyFontId !== 'string' || !colors) {
		return null;
	}
	return { headingFontId, bodyFontId, colors };
}

export function catalogDefaultBranding(catalog: VideoFontCatalog | null): VideoBranding {
	const d = catalog?.defaults;
	const c = catalog?.colors;
	const colors = parseColors(c) ?? SHARKLY_VIDEO_BRANDING.colors;
	const ids = new Set((catalog?.fonts ?? []).map((f) => f.id));
	const heading = typeof d?.headingFontId === 'string' && ids.has(d.headingFontId) ? d.headingFontId : SHARKLY_VIDEO_BRANDING.headingFontId;
	const body = typeof d?.bodyFontId === 'string' && ids.has(d.bodyFontId) ? d.bodyFontId : SHARKLY_VIDEO_BRANDING.bodyFontId;
	return {
		headingFontId: heading,
		bodyFontId: body,
		colors
	};
}

function fontIdExists(catalog: VideoFontCatalog | null, id: string): boolean {
	return (catalog?.fonts ?? []).some((f) => f.id === id);
}

/** Merge draft + site + Sharkly defaults; prefer `catalog` for color defaults when present. */
export function resolveVideoBrandingForEditor(
	catalog: VideoFontCatalog | null,
	siteBranding: unknown,
	draftRenderOptions: unknown
): VideoBranding {
	const base = catalogDefaultBranding(catalog);
	const fromDraft = parseVideoBranding(
		(draftRenderOptions as VideoDraftRenderOptions | null)?.branding
	);
	if (fromDraft) {
		const colors = fromDraft.colors;
		const h =
			fontIdExists(catalog, fromDraft.headingFontId) ? fromDraft.headingFontId : base.headingFontId;
		const b = fontIdExists(catalog, fromDraft.bodyFontId) ? fromDraft.bodyFontId : base.bodyFontId;
		return { headingFontId: h, bodyFontId: b, colors };
	}
	const fromSite = parseVideoBranding(siteBranding);
	if (fromSite) {
		const h =
			fontIdExists(catalog, fromSite.headingFontId) ? fromSite.headingFontId : base.headingFontId;
		const b = fontIdExists(catalog, fromSite.bodyFontId) ? fromSite.bodyFontId : base.bodyFontId;
		return { headingFontId: h, bodyFontId: b, colors: fromSite.colors };
	}
	return base;
}

export function brandingToJobOverride(
	catalog: VideoFontCatalog | null,
	b: VideoBranding
): { colors: VideoBrandingColors; fonts: { heading: string; body: string } } {
	const fonts = catalog?.fonts ?? [];
	const head = fonts.find((f) => f.id === b.headingFontId);
	const body = fonts.find((f) => f.id === b.bodyFontId);
	const hName = head?.pangoFamily ?? 'Montserrat';
	const bName = body?.pangoFamily ?? 'Lato';
	return {
		colors: b.colors,
		fonts: { heading: hName, body: bName }
	};
}
