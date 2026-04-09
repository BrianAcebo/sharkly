/**
 * AUTO-GENERATED — do not edit by hand.
 * Source of truth: video-service/services/claude_service.py ::
 *   ANIMATION_BY_TYPE, SCENE_TYPES, TRANSITIONS, ACCENT_COLORS
 * Regenerate with: python generate_scene_animations_ts.py
 */

/** All valid scene type strings. */
export const SCENE_TYPES = new Set([
  'bullet_points',
  'checklist',
  'closing_card',
  'cold_open',
  'comparison_table',
  'evidence_stack',
  'kinetic_chart',
  'mechanism_diagram',
  'myth_vs_reality',
  'objection_rebuttal',
  'quote_card',
  'scripture_quote',
  'section_header',
  'stat_callout',
  'text_reveal',
  'title_card',
  'vox_documentary',
] as const);

export type SceneType = typeof SCENE_TYPES extends Set<infer T> ? T : never;

/** Valid transitions between scenes. */
export const TRANSITIONS = new Set([
  'cut',
  'fade',
  'slide_up',
  'wipe_left',
  'wipe_right',
] as const);

/** Valid accent color names (map to hex via brand config). */
export const ACCENT_COLORS = new Set([
  'accent',
  'gold',
  'muted',
  'primary_text',
] as const);

/** Allowed animation_style values per scene type. */
export const ANIMATION_BY_TYPE: Record<string, readonly string[]> = {
  cold_open: ['fade_up', 'slide_in', 'stamp'],
  title_card: ['fade_up', 'slide_in', 'typewrite'],
  section_header: ['fade_up', 'wipe_right', 'zoom_in'],
  bullet_points: ['all_at_once', 'cascade', 'typewrite'],
  stat_callout: ['fade_up', 'typewrite', 'zoom_in'],
  text_reveal: ['fade_in', 'fade_up', 'slide_up', 'typewrite'],
  quote_card: ['dramatic_pause', 'fade_in', 'fade_up', 'typewrite'],
  comparison_table: ['all_at_once', 'cascade', 'fade_in', 'fade_up'],
  closing_card: ['fade_up', 'slide_in'],
  vox_documentary: ['fade_in', 'slide_up'],
  kinetic_chart: ['fade_up', 'slide_in'],
  myth_vs_reality: ['dramatic_pause', 'fade_in', 'stamp'],
  checklist: ['cascade'],
  mechanism_diagram: ['fade_in', 'slide_in', 'typewrite'],
  scripture_quote: ['dramatic_pause', 'fade_in', 'fade_up', 'typewrite'],
  evidence_stack: ['cascade', 'slide_in'],
  objection_rebuttal: ['fade_in', 'typewrite'],
};

/** Returns the allowed animation styles for a given scene type. */
export function animationsForSceneType(sceneType: string): readonly string[] {
  return ANIMATION_BY_TYPE[sceneType] ?? ANIMATION_BY_TYPE['title_card'];
}

/** Type guard — returns true if value is a valid animation style for the given scene type. */
export function isValidAnimation(sceneType: string, animation: string): boolean {
  return (ANIMATION_BY_TYPE[sceneType] ?? []).includes(animation);
}

/** Type guard — returns true if value is a valid scene type. */
export function isValidSceneType(t: string): t is SceneType {
  return SCENE_TYPES.has(t as SceneType);
}

/** Same as Python `_coerce_animation_style_to_allowed` — invalid/missing → allowed[0]. */
export function coerceAnimationStyle(sceneType: string, animation: string): string {
  const allowed = animationsForSceneType(sceneType);
  const a = animation.trim();
  if (a && allowed.includes(a)) return a;
  return allowed[0] ?? 'fade_up';
}

/** Same as Python `_coerce_transition_to_allowed`. */
export function normalizeTransition(transitionIn: string): string {
  const t = transitionIn.trim();
  return TRANSITIONS.has(t) ? t : 'fade';
}

/** Same as Python `_coerce_accent_to_allowed`. */
export function normalizeAccentColor(accent: string): string {
  const c = accent.trim();
  return ACCENT_COLORS.has(c) ? c : 'accent';
}
