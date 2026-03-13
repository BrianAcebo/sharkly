import type { APIRoute } from 'astro';
import { getPosts } from '../../lib/supabase';

export const GET: APIRoute = async ({ site }) => {
  const posts = await getPosts();
  const siteUrl = site?.toString().replace(/\/$/, '') ?? 'https://sharkly.co';

  const items = posts.slice(0, 20).map(post => {
    const link = `${siteUrl}/blog/${post.blog_categories?.slug ?? 'uncategorized'}/${post.slug}`;
    const date = post.published_at ? new Date(post.published_at).toUTCString() : new Date().toUTCString();
    return `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description><![CDATA[${post.excerpt ?? ''}]]></description>
      <author>${post.author_name}</author>
      <pubDate>${date}</pubDate>
      ${post.blog_categories ? `<category>${post.blog_categories.name}</category>` : ''}
    </item>`;
  }).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Sharkly Blog</title>
    <link>${siteUrl}</link>
    <description>SEO insights, glossary, and guides for small business owners.</description>
    <language>en-us</language>
    <atom:link href="${siteUrl}/blog/rss.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
