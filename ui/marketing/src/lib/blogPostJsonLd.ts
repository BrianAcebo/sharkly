import type { Post } from './supabase';
import { extractFaqsFromHtml } from './blogFaq';
import { MARKETING_ORG_DESCRIPTION } from './sitePageJsonLd';

function termNameFromPostTitle(title: string): string {
  let t = title.trim();
  t = t.replace(/^what is\s+/i, '').replace(/^what are\s+/i, '').replace(/^define\s+/i, '');
  t = t.split('?')[0].trim();
  if (t.includes('—')) t = t.split('—')[0].trim();
  if (t.includes('–')) t = t.split('–')[0].trim();
  if (t.includes(' | ')) t = t.split(' | ')[0].trim();
  if (t.includes(' - ')) t = t.split(' - ')[0].trim();
  return t || title;
}

function firstParagraphPlain(html: string | null | undefined, maxLen = 500): string | undefined {
  if (!html) return undefined;
  const trimmed = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  const pMatch = trimmed.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (!pMatch) return undefined;
  const text = pMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return undefined;
  return text.length > maxLen ? `${text.slice(0, maxLen - 1)}…` : text;
}

export type BlogPostJsonLdContext = {
  siteUrl: string;
  appUrl: string;
};

/**
 * Single JSON-LD document with @graph: Organization, WebSite, Person, WebPage, BlogPosting,
 * BreadcrumbList, optional FAQPage, optional DefinedTerm + DefinedTermSet (glossary category).
 */
export function buildBlogPostJsonLd(post: Post, ctx: BlogPostJsonLdContext): {
  '@context': string;
  '@graph': Record<string, unknown>[];
} {
  const { siteUrl, appUrl } = ctx;
  const canonical =
    post.canonical_url ??
    `${siteUrl}/blog/${post.blog_categories?.slug ?? 'uncategorized'}/${post.slug}`;

  const orgId = `${siteUrl}#organization`;
  const websiteId = `${siteUrl}#website`;
  const authorId = `${canonical}#author`;
  const webpageId = `${canonical}#webpage`;
  const blogPostingId = `${canonical}#blogpost`;
  const breadcrumbId = `${canonical}#breadcrumb`;

  const datePublished = post.published_at
    ? new Date(post.published_at).toISOString()
    : undefined;
  const dateModifiedRaw = post.updated_at ?? post.published_at;
  const dateModified = dateModifiedRaw ? new Date(dateModifiedRaw).toISOString() : datePublished;

  const description =
    post.meta_description?.trim() ||
    post.excerpt?.trim() ||
    firstParagraphPlain(post.content_html) ||
    post.title;

  const logoUrl = `${appUrl}/images/sharkly-og-image.jpg`;

  const organization: Record<string, unknown> = {
    '@type': 'Organization',
    '@id': orgId,
    name: 'Sharkly',
    url: siteUrl,
    description: MARKETING_ORG_DESCRIPTION,
    logo: {
      '@type': 'ImageObject',
      url: logoUrl,
    },
  };

  const website: Record<string, unknown> = {
    '@type': 'WebSite',
    '@id': websiteId,
    name: 'Sharkly',
    url: siteUrl,
    description: MARKETING_ORG_DESCRIPTION,
    publisher: { '@id': orgId },
    inLanguage: 'en-US',
  };

  const person: Record<string, unknown> = {
    '@type': 'Person',
    '@id': authorId,
    name: post.author_name,
  };

  const imageUrls = post.og_image_url ? [post.og_image_url] : undefined;

  const breadcrumbItems: Record<string, unknown>[] = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Blog',
      item: `${siteUrl}/blog`,
    },
  ];
  if (post.blog_categories) {
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: 2,
      name: post.blog_categories.name,
      item: `${siteUrl}/blog/${post.blog_categories.slug}`,
    });
  }
  breadcrumbItems.push({
    '@type': 'ListItem',
    position: breadcrumbItems.length + 1,
    name: post.title,
    item: canonical,
  });

  const breadcrumbList: Record<string, unknown> = {
    '@type': 'BreadcrumbList',
    '@id': breadcrumbId,
    itemListElement: breadcrumbItems,
  };

  const webPage: Record<string, unknown> = {
    '@type': 'WebPage',
    '@id': webpageId,
    url: canonical,
    name: post.title,
    description,
    isPartOf: { '@id': websiteId },
    primaryImageOfPage: post.og_image_url
      ? { '@type': 'ImageObject', url: post.og_image_url }
      : undefined,
    breadcrumb: { '@id': breadcrumbId },
    mainEntity: { '@id': blogPostingId },
    datePublished,
    dateModified,
    inLanguage: 'en-US',
  };
  if (!post.og_image_url) delete webPage.primaryImageOfPage;

  const blogPosting: Record<string, unknown> = {
    '@type': 'BlogPosting',
    '@id': blogPostingId,
    headline: post.title,
    description,
    ...(imageUrls ? { image: imageUrls } : {}),
    datePublished,
    dateModified,
    author: { '@id': authorId },
    publisher: {
      '@id': orgId,
    },
    mainEntityOfPage: { '@id': webpageId },
    isPartOf: { '@id': websiteId },
    articleSection: post.blog_categories?.name ?? undefined,
    keywords: post.blog_categories?.name ?? undefined,
    wordCount: post.reading_time_minutes
      ? Math.max(200, Math.round(post.reading_time_minutes * 225))
      : undefined,
  };

  const graph: Record<string, unknown>[] = [
    organization,
    website,
    person,
    webPage,
    blogPosting,
    breadcrumbList,
  ];

  const faqs = extractFaqsFromHtml(post.content_html);
  if (faqs.length > 0) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${canonical}#faq`,
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.name,
        acceptedAnswer: {
          '@type': 'Answer',
          text: f.text,
        },
      })),
    });
  }

  const isGlossary =
    post.blog_categories?.slug === 'glossary' ||
    post.blog_categories?.name?.trim().toLowerCase() === 'glossary';
  if (isGlossary && post.blog_categories) {
    const glossaryUrl = `${siteUrl}/blog/${post.blog_categories.slug}`;
    const termSetId = `${glossaryUrl}#definedtermset`;
    const termName = termNameFromPostTitle(post.title);
    const termDesc =
      post.excerpt?.trim() ||
      firstParagraphPlain(post.content_html, 1000) ||
      description;

    graph.push({
      '@type': 'DefinedTermSet',
      '@id': termSetId,
      name: `${post.blog_categories.name} | Sharkly Blog`,
      description:
        post.blog_categories.description?.trim() ||
        'Plain-English SEO and marketing glossary definitions from Sharkly.',
      url: glossaryUrl,
    });

    graph.push({
      '@type': 'DefinedTerm',
      '@id': `${canonical}#definedterm`,
      name: termName,
      description: termDesc,
      url: canonical,
      inDefinedTermSet: { '@id': termSetId },
    });
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph.filter(Boolean),
  };
}
