/**
 * robots.txt for sharkly.co (marketing site)
 * Allow crawlers on marketing pages; sitemap reference.
 * Note: app.sharkly.co has its own robots.txt that disallows all crawlers.
 */
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
	const siteUrl = site?.toString().replace(/\/$/, '') ?? 'https://sharkly.co';
	const sitemapUrl = `${siteUrl}/sitemap-index.xml`;

	const content = `User-agent: *
Allow: /

# App (authenticated) — blocked via app.sharkly.co/robots.txt
Sitemap: ${sitemapUrl}
`;

	return new Response(content, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'public, max-age=3600',
		},
	});
};
