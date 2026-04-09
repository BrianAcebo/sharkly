/**
 * Claude `animation_style` includes values AnimatedText does not animate (e.g. `stamp`, `zoom_in`).
 * Map to the closest primitive motion.
 */
export function mapAnimatedTextStyle(
	raw: string,
): 'fade_up' | 'fade_in' | 'slide_in' | 'slide_up' {
	const r = (raw || '').trim();
	if (r === 'fade_up') return 'fade_up';
	if (r === 'fade_in') return 'fade_in';
	if (r === 'slide_in') return 'slide_in';
	if (r === 'slide_up') return 'slide_up';
	if (r === 'wipe_right') return 'slide_in';
	return 'fade_up';
}
