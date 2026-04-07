/**
 * sitemaps.org 0.9 urlset builder — escape all text nodes for safe XML.
 */

export type UrlsetEntry = {
	loc: string;
	/** W3C Datetime, e.g. YYYY-MM-DD or full ISO 8601 */
	lastmod?: string;
	changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
	priority?: string;
};

/** Escape text for XML element bodies (loc, lastmod, etc.). */
export function escapeXmlText(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

export function buildUrlsetXml(entries: UrlsetEntry[]): string {
	const body = entries
		.map(({ loc, lastmod, changefreq, priority }) => {
			let chunk = `  <url>\n    <loc>${escapeXmlText(loc)}</loc>`;
			if (lastmod) chunk += `\n    <lastmod>${escapeXmlText(lastmod)}</lastmod>`;
			if (changefreq) chunk += `\n    <changefreq>${escapeXmlText(changefreq)}</changefreq>`;
			if (priority != null && priority !== '') chunk += `\n    <priority>${escapeXmlText(priority)}</priority>`;
			chunk += '\n  </url>';
			return chunk;
		})
		.join('\n');

	return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`;
}
