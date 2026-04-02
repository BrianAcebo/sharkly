/**
 * Build a table-of-contents list from blog HTML and inject stable `id` on each `<h2>`
 * so in-page anchor links work. Only h2 — h3+ are ignored to keep the TOC short.
 */

export type BlogTocItem = { id: string; label: string };

const H2_RE = /<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/gi;

function slugifyHeading(text: string): string {
	const s = text
		.toLowerCase()
		.replace(/&[a-z]+;/gi, '')
		.replace(/[^\w\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/^-+|-+$/g, '');
	return s || 'section';
}

function stripHtml(inner: string): string {
	return inner.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Returns processed HTML (with `id` on h2s where missing) and a TOC derived from h2 text.
 */
export function injectH2IdsAndBuildToc(html: string | null | undefined): {
	html: string;
	toc: BlogTocItem[];
} {
	if (!html?.trim()) return { html: '', toc: [] };

	const toc: BlogTocItem[] = [];
	const usedIds = new Set<string>();

	const newHtml = html.replace(H2_RE, (full, attrs: string | undefined, inner: string) => {
		const attrsStr = attrs ?? '';
		const existingId = attrsStr.match(/\sid=["']([^"']+)["']/i);
		const label = stripHtml(inner);
		if (!label) return full;

		let id: string;
		if (existingId) {
			id = existingId[1];
		} else {
			const base = slugifyHeading(label);
			id = base;
			let n = 0;
			while (usedIds.has(id)) {
				n += 1;
				id = `${base}-${n}`;
			}
		}
		usedIds.add(id);
		toc.push({ id, label });

		if (existingId) return full;
		return `<h2${attrsStr} id="${id}">${inner}</h2>`;
	});

	return { html: newHtml, toc };
}
