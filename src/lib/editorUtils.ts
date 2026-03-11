/**
 * Shared Tiptap editor utilities.
 */

/**
 * Clean pasted HTML before Tiptap processes it.
 *
 * Strips inline styles, class/id attributes, and MS Word / Google Docs noise
 * while keeping all semantic tags (h1–h6, strong, em, a[href], ul, ol, li,
 * blockquote, pre, code, img[src], etc.) so Tiptap can map them to its schema.
 *
 * Use as `editorProps.transformPastedHTML` in useEditor().
 */
export function cleanPastedHTML(html: string): string {
	const tmp = document.createElement('div');
	tmp.innerHTML = html;

	// Remove MS Word / Office-specific elements that add noise
	tmp.querySelectorAll('style, script, meta').forEach((el) => el.remove());

	// Remove MS Word conditional comment wrappers (<!--[if ...]>...<![endif]-->)
	// These come in as text nodes; querySelectorAll won't catch them, but the
	// elements inside are cleaned by the pass below.

	tmp.querySelectorAll('*').forEach((el) => {
		// Strip formatting-only attributes — keep href, src, alt, target, rel
		el.removeAttribute('style');
		el.removeAttribute('class');
		el.removeAttribute('id');
		el.removeAttribute('dir');
		el.removeAttribute('lang');

		// Remove data-* and aria-* attributes
		for (const attr of [...el.attributes]) {
			if (attr.name.startsWith('data-') || attr.name.startsWith('aria-')) {
				el.removeAttribute(attr.name);
			}
		}
	});

	// Unwrap <font>, <span> and <div> elements that now have no attributes —
	// they were purely presentational. Replace them with their children.
	// We iterate in reverse DOM order (deepest first) to avoid stale refs.
	tmp.querySelectorAll('font, span, div').forEach((el) => {
		if (el.attributes.length === 0) {
			el.replaceWith(...Array.from(el.childNodes));
		}
	});

	return tmp.innerHTML;
}
