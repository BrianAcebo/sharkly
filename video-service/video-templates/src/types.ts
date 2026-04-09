/**
 * Mirrors Claude script JSON + brand props passed into Remotion (see docs/remotion-migration-spec.md).
 * Python `remotion_renderer` maps snake_case brand colors → camelCase here.
 */

export type AccentColor = 'primary_text' | 'accent' | 'gold' | 'muted';

export type TransitionIn = 'fade' | 'wipe_left' | 'wipe_right' | 'slide_up' | 'cut';

export interface BrandTheme {
	brandId: string;
	displayName: string;
	colors: {
		background: string;
		primaryText: string;
		accent: string;
		gold: string;
		muted: string;
	};
	fonts: {
		heading: string;
		body: string;
	};
}

export interface ColdOpenContent {
	heading: string;
	subheading?: string;
}

export interface TitleCardContent {
	heading: string;
	subheading?: string;
}

export interface SectionHeaderContent {
	heading: string;
	label?: string;
}

export interface BulletPointsContent {
	heading: string;
	bullets: string[];
}

export interface StatCalloutContent {
	stat: string;
	label: string;
	context: string;
}

export interface TextRevealContent {
	body: string;
}

export interface QuoteCardContent {
	quote: string;
	attribution?: string;
}

export interface ComparisonTableContent {
	left_header: string;
	right_header: string;
	rows: Array<{ left: string; right: string }>;
}

export interface ClosingCardContent {
	heading: string;
	cta?: string;
	url?: string;
}

export interface MythVsRealityContent {
	myth: string;
	reality: string;
}

export interface ChecklistContent {
	heading: string;
	items: string[];
}

export interface MechanismDiagramContent {
	nodes: Array<{ label: string; color: AccentColor }>;
	direction: 'horizontal' | 'vertical';
}

export interface ScriptureQuoteContent {
	verse: string;
	reference: string;
}

export interface EvidenceStackContent {
	heading: string;
	points: Array<{ number: string; title: string; detail: string }>;
}

export interface ObjectionRebuttalContent {
	objection: string;
	response: string;
	objection_label: string;
	response_label: string;
}

export interface VoxDocumentaryContent {
	quote: string;
	attribution?: string;
	highlight_words?: string[];
}

export interface KineticChartContent {
	heading: string;
	chart_type: 'bar' | 'comparison_bar';
	data: Array<{
		label: string;
		value: number;
		color?: AccentColor;
	}>;
	unit?: string;
	context?: string;
}

export interface Scene {
	scene_id: string;
	type: string;
	duration_seconds: number;
	narration_segment: string;
	animation_style: string;
	transition_in: TransitionIn;
	accent_color: AccentColor;
	content: Record<string, unknown>;
	emphasis_indices?: number[];
}

/** Props for each `src/scenes/*.tsx` composition component. */
export interface SceneProps {
	scene: Scene;
	brand: BrandTheme;
	fps: number;
}

/** Intersection so Remotion `Composition` accepts `Props extends Record<string, unknown>`. */
export type VideoProps = {
	scenes: Scene[];
	brand: BrandTheme;
	/** Pipeline uses 30 */
	fps: number;
} & Record<string, unknown>;

/** Map Claude `accent_color` enum + brand palette → CSS color. */
export function resolveColor(name: AccentColor | string, brand: BrandTheme): string {
	const map: Record<string, string> = {
		primary_text: brand.colors.primaryText,
		accent: brand.colors.accent,
		gold: brand.colors.gold,
		muted: brand.colors.muted,
	};
	return map[name] ?? brand.colors.primaryText;
}
