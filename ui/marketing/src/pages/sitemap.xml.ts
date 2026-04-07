/**
 * Dynamic sitemap — includes CMS blog categories and posts (same data as SSR blog routes).
 */
import type { APIRoute } from 'astro';
import { getCategories, getPosts } from '../lib/supabase';
import { buildUrlsetXml, type UrlsetEntry } from '../lib/sitemap/urlsetXml';

export const prerender = false;

function baseUrl(site: URL | undefined): string {
	return site?.toString().replace(/\/$/, '') ?? 'https://sharkly.co';
}

/** YYYY-MM-DD from ISO date string */
function lastmodDay(iso: string | null | undefined): string | undefined {
	if (!iso) return undefined;
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return undefined;
	return d.toISOString().slice(0, 10);
}

export const GET: APIRoute = async ({ site }) => {
	const base = baseUrl(site);

	const [categories, posts] = await Promise.all([getCategories(), getPosts()]);

	const entries: UrlsetEntry[] = [];

	const staticPaths = [
		'/',
		'/pricing',
		'/shopify',
		'/privacy',
		'/terms',
		'/cookies',
		'/blog',
		'/blog/search',
	];

	for (const path of staticPaths) {
		entries.push({ loc: `${base}${path}` });
	}

	for (const cat of categories) {
		entries.push({
			loc: `${base}/blog/${cat.slug}`,
			changefreq: 'weekly',
			priority: '0.7',
		});
	}

	for (const post of posts) {
		const catSlug = post.blog_categories?.slug ?? 'uncategorized';
		entries.push({
			loc: `${base}/blog/${catSlug}/${post.slug}`,
			lastmod: lastmodDay(post.published_at),
			changefreq: 'monthly',
			priority: '0.6',
		});
	}

	const xml = buildUrlsetXml(entries);

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600',
		},
	});
};
