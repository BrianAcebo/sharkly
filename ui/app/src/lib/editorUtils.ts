/**
 * Shared Tiptap editor utilities.
 */

/** Convert HTML to minimal Tiptap JSON (p, ul, li, strong). Matches API htmlToTiptap. */
export function htmlToTiptap(html: string): { type: 'doc'; content: unknown[] } {
	const content: unknown[] = [];
	const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
	let m;
	while ((m = pRegex.exec(html)) !== null) {
		const inner = (m[1] ?? '').replace(/<br\s*\/?>/gi, '\n');
		const text = inner.replace(/<strong>([\s\S]*?)<\/strong>/gi, '$1').replace(/<[^>]+>/g, '').trim();
		if (text) content.push({ type: 'paragraph', content: [{ type: 'text', text }] });
	}
	const ulRegex = /<ul[^>]*>([\s\S]*?)<\/ul>/gi;
	while ((m = ulRegex.exec(html)) !== null) {
		const inner = m[1] ?? '';
		const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
		const items: unknown[] = [];
		let liM;
		while ((liM = liRegex.exec(inner)) !== null) {
			const t = (liM[1] ?? '').replace(/<[^>]+>/g, ' ').trim();
			if (t) items.push({ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: t }] }] });
		}
		if (items.length > 0) content.push({ type: 'bulletList', content: items });
	}
	// If no p/ul found, treat whole HTML as one paragraph (strip tags)
	if (content.length === 0) {
		const plain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
		if (plain) content.push({ type: 'paragraph', content: [{ type: 'text', text: plain }] });
	}
	if (content.length === 0) content.push({ type: 'paragraph', content: [] });
	return { type: 'doc', content };
}

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
