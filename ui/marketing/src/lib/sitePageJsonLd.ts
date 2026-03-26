/**
 * Shared JSON-LD for static marketing pages — same Organization / WebSite @ids as blog posts.
 */

export const MARKETING_ORG_DESCRIPTION =
  'Sharkly is an AI-powered SEO platform for small businesses — topic strategy, content clusters, and keyword research.';

export type BreadcrumbEntry = { name: string; path: string };

export type StaticMarketingPageJsonLdParams = {
  siteUrl: string;
  appUrl: string;
  /** Fully qualified page URL (must match <link rel="canonical">). */
  canonicalUrl: string;
  pageName: string;
  description: string;
  breadcrumbItems: BreadcrumbEntry[];
  /** Merged into WebSite (e.g. potentialAction on the homepage). */
  websiteExtras?: Record<string, unknown>;
  /** Prefer CollectionPage for category/listing URLs when appropriate. */
  webPageType?: 'WebPage' | 'CollectionPage';
  /** WebPage.mainEntity @id reference(s). */
  mainEntity?: { '@id': string } | Array<{ '@id': string }>;
  /** Extra nodes (Product, SoftwareApplication, Blog, FAQPage, etc.). */
  extraGraph?: Record<string, unknown>[];
};

function itemUrl(siteUrl: string, path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (p === '/') return `${siteUrl}/`;
  return `${siteUrl}${p}`;
}

/**
 * Organization + WebSite with stable @ids: `${siteUrl}#organization`, `${siteUrl}#website`.
 */
export function marketingOrganizationAndWebSite(
  siteUrl: string,
  appUrl: string,
  websiteExtras?: Record<string, unknown>
): { organization: Record<string, unknown>; website: Record<string, unknown>; orgId: string; websiteId: string } {
  const orgId = `${siteUrl}#organization`;
  const websiteId = `${siteUrl}#website`;
  const logoUrl = `${appUrl}/images/sharkly-og-image.jpg`;

  const organization: Record<string, unknown> = {
    '@type': 'Organization',
    '@id': orgId,
    name: 'Sharkly',
    url: siteUrl,
    description: MARKETING_ORG_DESCRIPTION,
    logo: { '@type': 'ImageObject', url: logoUrl },
  };

  const website: Record<string, unknown> = {
    '@type': 'WebSite',
    '@id': websiteId,
    name: 'Sharkly',
    url: siteUrl,
    description: MARKETING_ORG_DESCRIPTION,
    publisher: { '@id': orgId },
    inLanguage: 'en-US',
    ...(websiteExtras ?? {}),
  };

  return { organization, website, orgId, websiteId };
}

export function buildStaticMarketingPageJsonLd(
  p: StaticMarketingPageJsonLdParams
): { '@context': string; '@graph': Record<string, unknown>[] } {
  const { organization, website } = marketingOrganizationAndWebSite(
    p.siteUrl,
    p.appUrl,
    p.websiteExtras
  );
  const websiteId = `${p.siteUrl}#website`;
  const webpageId = `${p.canonicalUrl}#webpage`;
  const breadcrumbId = `${p.canonicalUrl}#breadcrumb`;

  const itemListElement = p.breadcrumbItems.map((item, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: item.name,
    item: itemUrl(p.siteUrl, item.path),
  }));

  const breadcrumbList: Record<string, unknown> = {
    '@type': 'BreadcrumbList',
    '@id': breadcrumbId,
    itemListElement,
  };

  const pageType = p.webPageType ?? 'WebPage';
  const webPage: Record<string, unknown> = {
    '@type': pageType,
    '@id': webpageId,
    url: p.canonicalUrl,
    name: p.pageName,
    description: p.description,
    isPartOf: { '@id': websiteId },
    breadcrumb: { '@id': breadcrumbId },
    inLanguage: 'en-US',
  };
  if (p.mainEntity) webPage.mainEntity = p.mainEntity;

  const graph: Record<string, unknown>[] = [
    organization,
    website,
    webPage,
    breadcrumbList,
    ...(p.extraGraph ?? []),
  ];

  return { '@context': 'https://schema.org', '@graph': graph };
}
