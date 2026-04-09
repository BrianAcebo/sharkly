/** Mirrors video-service VideoScriptModel / SceneModel (blog-to-video). */

import {
	coerceAnimationStyle,
	normalizeAccentColor,
	normalizeTransition
} from './videoSceneAnimations';

export const VIDEO_SCENE_TYPES = [
	'cold_open',
	'title_card',
	'section_header',
	'bullet_points',
	'stat_callout',
	'text_reveal',
	'quote_card',
	'comparison_table',
	'closing_card',
	'vox_documentary',
	'kinetic_chart',
	'myth_vs_reality',
	'checklist',
	'mechanism_diagram',
	'scripture_quote',
	'evidence_stack',
	'objection_rebuttal'
] as const;

export type VideoSceneType = (typeof VIDEO_SCENE_TYPES)[number];

export type VideoSceneContent = Record<string, unknown>;

export type VideoScene = {
	scene_id: string;
	type: string;
	duration_seconds: number;
	narration_segment: string;
	animation_style: string;
	transition_in: string;
	accent_color: string;
	content: VideoSceneContent;
	emphasis_indices?: number[];
};

export type VideoScript = {
	title: string;
	estimated_duration_seconds: number;
	narration_script: string;
	scenes: VideoScene[];
};

export function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function toFiniteNumber(v: unknown): number | null {
	if (typeof v === 'number' && Number.isFinite(v)) return v;
	if (typeof v === 'string' && v.trim() !== '') {
		const n = Number(v);
		if (Number.isFinite(n)) return n;
	}
	return null;
}

function toNonEmptyString(v: unknown): string | null {
	if (typeof v !== 'string') return null;
	const t = v.trim();
	return t.length > 0 ? t : null;
}

function toSceneString(v: unknown): string {
	if (typeof v === 'string') return v;
	if (v == null) return '';
	return String(v);
}

/** Best-effort parse from API JSON or DB jsonb (tolerates minor shape drift from Claude / storage). */
export function parseVideoScript(raw: unknown): VideoScript | null {
	if (!isRecord(raw)) return null;
	const title = toNonEmptyString(raw.title);
	const estRaw = toFiniteNumber(raw.estimated_duration_seconds);
	const narration = toNonEmptyString(raw.narration_script);
	const scenes = raw.scenes;
	if (!title) return null;
	const est = estRaw != null ? Math.round(estRaw) : 180;
	if (!narration) return null;
	if (!Array.isArray(scenes) || scenes.length === 0) return null;
	const outScenes: VideoScene[] = [];
	for (const s of scenes) {
		if (!isRecord(s)) return null;
		const scene_id = toNonEmptyString(s.scene_id);
		const type = typeof s.type === 'string' ? s.type : null;
		const duration_seconds = toFiniteNumber(s.duration_seconds);
		const narration_segment = toSceneString(s.narration_segment);
		const content = s.content;
		if (!scene_id) return null;
		if (!type) return null;
		const rawAnim = typeof s.animation_style === 'string' ? s.animation_style : '';
		const animation_style = coerceAnimationStyle(type, rawAnim);
		const rawTr = typeof s.transition_in === 'string' ? s.transition_in : '';
		const transition_in = normalizeTransition(rawTr);
		const rawAc = typeof s.accent_color === 'string' ? s.accent_color : '';
		const accent_color = normalizeAccentColor(rawAc);
		const dur = duration_seconds != null && duration_seconds > 0 ? Math.round(duration_seconds) : 5;
		const sceneContent: VideoSceneContent = isRecord(content) ? { ...content } : {};
		const scene: VideoScene = {
			scene_id,
			type,
			duration_seconds: dur,
			narration_segment,
			animation_style,
			transition_in,
			accent_color,
			content: sceneContent
		};
		if (Array.isArray(s.emphasis_indices)) {
			const idx = s.emphasis_indices.filter((n) => typeof n === 'number') as number[];
			if (idx.length) scene.emphasis_indices = idx;
		}
		outScenes.push(scene);
	}
	return {
		title,
		estimated_duration_seconds: est,
		narration_script: narration,
		scenes: outScenes
	};
}

export function emptyVideoScript(): VideoScript {
	return {
		title: 'Untitled video',
		estimated_duration_seconds: 180,
		narration_script:
			'Replace this with your full voiceover, or write lines per scene in the Scenes tab.',
		scenes: [
			{
				scene_id: 'scene_01',
				type: 'cold_open',
				duration_seconds: 4,
				narration_segment: 'Opening line for this scene.',
				animation_style: 'stamp',
				transition_in: 'cut',
				accent_color: 'accent',
				content: { heading: 'Your headline', subheading: 'Optional subheading' }
			}
		]
	};
}

/** True when the draft is still the bootstrap placeholder (Continue to branding / blank start), not a generated script. */
export function isPlaceholderVideoScript(s: VideoScript): boolean {
	const e = emptyVideoScript();
	if (s.title !== e.title || s.estimated_duration_seconds !== e.estimated_duration_seconds) return false;
	if (s.narration_script !== e.narration_script) return false;
	if (s.scenes.length !== e.scenes.length) return false;
	const a = s.scenes[0];
	const b = e.scenes[0];
	if (!a || !b) return false;
	return (
		a.scene_id === b.scene_id &&
		a.type === b.type &&
		a.duration_seconds === b.duration_seconds &&
		a.narration_segment === b.narration_segment
	);
}
