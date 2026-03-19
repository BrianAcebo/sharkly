/**
 * L2 — Schema Markup Generator
 * JSON-LD template generation for Article, FAQ, Product, LocalBusiness, BreadcrumbList.
 * Output is copy-paste ready for the workspace sidebar.
 *
 * Spec: PRODUCT-ROADMAP.md L2
 */

export type SchemaType =
	| 'Article'
	| 'FAQPage'
	| 'Product'
	| 'CollectionPage'
	| 'LocalBusiness'
	| 'BreadcrumbList'
	| 'HowTo'
	| 'Organization';

export interface BreadcrumbItem {
	name: string;
	url?: string;
}

export interface SchemaContext {
	/** Page title / headline */
	title: string;
	/** Page description (meta or content excerpt) */
	description?: string;
	/** Canonical page URL */
	url?: string;
	/** Site/organization name */
	siteName: string;
	/** Site base URL (e.g. https://example.com) */
	siteUrl: string;
	/** Author name (optional) */
	authorName?: string;
	/** Author bio / credentials (S1-4) — becomes Person.description in Article schema */
	authorBio?: string;
	/** SameAs URLs (linkedin, twitter, etc.) — S1-5 adds these to sites */
	sameAs?: string[];
	/** AggregateRating for LocalBusiness (S1-5) — Google reviews */
	aggregateRating?: {
		ratingValue: number;
		reviewCount: number;
		bestRating?: number;
	};
	/** Breadcrumb trail: [Home, Category, Page] or full items with URLs */
	breadcrumbs?: string[] | BreadcrumbItem[];
	/** For FAQ: array of { question, answer } */
	faqItems?: Array<{ question: string; answer: string }>;
	/** For Product: price string (e.g. "29.99") */
	price?: string;
	/** For Product: currency (e.g. "USD") */
	currency?: string;
	/** For LocalBusiness: optional address */
	address?: string;
	/** For LocalBusiness: optional phone */
	phone?: string;
	/** Image URL (optional) */
	imageUrl?: string;
	/** Date published (ISO string) */
	datePublished?: string;
	/** Date modified (ISO string) */
	dateModified?: string;
	/** For HowTo: steps array */
	howToSteps?: Array<{ name: string; text?: string }>;
	/** For Organization: optional legal name */
	legalName?: string;
	/** For Organization: optional logo URL */
	logoUrl?: string;
}

const defaultDate = () => new Date().toISOString().slice(0, 10);

/** Extract author name from author_bio (e.g. "Jane Smith, licensed electrician" → "Jane Smith") */
function authorNameFromBio(bio: string): string {
	const trimmed = bio.trim();
	if (!trimmed) return '';
	const comma = trimmed.indexOf(',');
	const dash = trimmed.indexOf(' — ');
	const hyphen = trimmed.indexOf(' - ');
	const sep = [comma, dash, hyphen].filter((i) => i > 0);
	const first = sep.length > 0 ? Math.min(...sep) : trimmed.length;
	const segment = trimmed.slice(0, first).trim();
	return segment.length > 80 ? segment.slice(0, 77).trim() + '…' : segment;
}

/** S1-4: Person schema for Article author — full credentials when author_bio exists */
function buildArticleAuthor(ctx: SchemaContext): object {
	const hasBio = Boolean(ctx.authorBio && ctx.authorBio.trim());
	const name = ctx.authorName || (hasBio ? authorNameFromBio(ctx.authorBio!) : '') || ctx.siteName;

	const person: Record<string, unknown> = {
		'@type': 'Person',
		name
	};

	if (hasBio) {
		person.description = ctx.authorBio!.trim();
	}

	if (ctx.sameAs && ctx.sameAs.length > 0) {
		person.sameAs = ctx.sameAs.filter(Boolean);
	}

	return person;
}

/** Article schema — Blog Post, How-To, Comparison, Complete Guide, Review */
export function generateArticleSchema(ctx: SchemaContext): object {
	const pageUrl = ctx.url || `${ctx.siteUrl.replace(/\/$/, '')}/${(ctx.title || 'page').toLowerCase().replace(/\s+/g, '-')}`;
	return {
		'@context': 'https://schema.org',
		'@type': 'Article',
		headline: ctx.title,
		description: ctx.description || `${ctx.title} — ${ctx.siteName}`,
		url: pageUrl,
		datePublished: ctx.datePublished || defaultDate(),
		dateModified: ctx.dateModified || defaultDate(),
		author: buildArticleAuthor(ctx),
		publisher: {
			'@type': 'Organization',
			name: ctx.siteName,
			url: ctx.siteUrl
		},
		...(ctx.imageUrl && { image: ctx.imageUrl })
	};
}

/** FAQ schema — from FAQ section or template */
export function generateFAQSchema(ctx: SchemaContext): object {
	const items = ctx.faqItems?.length
		? ctx.faqItems
		: [
				{ question: 'Example question?', answer: 'Example answer.' },
				{ question: 'Another question?', answer: 'Another answer.' }
			];

	return {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: items.map((item) => ({
			'@type': 'Question',
			name: item.question,
			acceptedAnswer: {
				'@type': 'Answer',
				text: item.answer
			}
		}))
	};
}

/** Product schema — Product Page, ecommerce */
export function generateProductSchema(ctx: SchemaContext): object {
	const pageUrl = ctx.url || `${ctx.siteUrl.replace(/\/$/, '')}/${(ctx.title || 'product').toLowerCase().replace(/\s+/g, '-')}`;
	const schema: Record<string, unknown> = {
		'@context': 'https://schema.org',
		'@type': 'Product',
		name: ctx.title,
		description: ctx.description || ctx.title,
		url: pageUrl,
		...(ctx.imageUrl && { image: ctx.imageUrl })
	};

	if (ctx.price != null) {
		schema.offers = {
			'@type': 'Offer',
			price: ctx.price,
			priceCurrency: ctx.currency || 'USD',
			availability: 'https://schema.org/InStock'
		};
	} else {
		schema.offers = {
			'@type': 'Offer',
			price: '0',
			priceCurrency: 'USD',
			availability: 'https://schema.org/ContactForPrice'
		};
	}

	return schema;
}

/** LocalBusiness schema — Service / Landing Page */
export function generateLocalBusinessSchema(ctx: SchemaContext): object {
	const pageUrl = ctx.url || `${ctx.siteUrl.replace(/\/$/, '')}/${(ctx.title || 'page').toLowerCase().replace(/\s+/g, '-')}`;
	const schema: Record<string, unknown> = {
		'@context': 'https://schema.org',
		'@type': 'LocalBusiness',
		name: ctx.siteName,
		description: ctx.description || ctx.title,
		url: ctx.siteUrl,
		...(ctx.imageUrl && { image: ctx.imageUrl })
	};

	if (ctx.address) schema.address = { '@type': 'PostalAddress', streetAddress: ctx.address };
	if (ctx.phone) schema.telephone = ctx.phone;

	// S1-5: AggregateRating when Google review data exists
	if (
		ctx.aggregateRating &&
		typeof ctx.aggregateRating.ratingValue === 'number' &&
		typeof ctx.aggregateRating.reviewCount === 'number' &&
		ctx.aggregateRating.reviewCount > 0
	) {
		schema.aggregateRating = {
			'@type': 'AggregateRating',
			ratingValue: String(ctx.aggregateRating.ratingValue),
			reviewCount: String(ctx.aggregateRating.reviewCount),
			bestRating: String(ctx.aggregateRating.bestRating ?? 5)
		};
	}

	// S1-5: sameAs — business profile URLs for entity disambiguation
	if (ctx.sameAs && ctx.sameAs.length > 0) {
		schema.sameAs = ctx.sameAs.filter((u): u is string => Boolean(u && typeof u === 'string'));
	}

	return schema;
}

/** BreadcrumbList schema — navigation path */
export function generateBreadcrumbSchema(ctx: SchemaContext): object {
	const rawCrumbs = ctx.breadcrumbs ?? ['Home', ctx.title];
	const pageUrl = ctx.url || `${ctx.siteUrl.replace(/\/$/, '')}/${(ctx.title || 'page').toLowerCase().replace(/\s+/g, '-')}`;

	const crumbs = rawCrumbs.map((c): { name: string; url?: string } =>
		typeof c === 'string' ? { name: c } : { name: c.name, url: c.url }
	);

	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: crumbs.map((c, i) => {
			const itemUrl = c.url ?? (i === 0 ? ctx.siteUrl : i === crumbs.length - 1 ? pageUrl : ctx.siteUrl);
			return {
				'@type': 'ListItem',
				position: i + 1,
				name: c.name,
				item: itemUrl
			};
		})
	};
}

/** HowTo schema — step-by-step guides */
export function generateHowToSchema(ctx: SchemaContext): object {
	const steps = ctx.howToSteps?.length
		? ctx.howToSteps
		: [{ name: 'Step 1', text: 'First step.' }, { name: 'Step 2', text: 'Second step.' }];
	return {
		'@context': 'https://schema.org',
		'@type': 'HowTo',
		name: ctx.title,
		description: ctx.description || ctx.title,
		...(ctx.url && { url: ctx.url }),
		step: steps.map((s, i) => ({
			'@type': 'HowToStep',
			position: i + 1,
			name: s.name,
			...(s.text && { text: s.text })
		}))
	};
}

/** Organization schema — site-wide */
export function generateOrganizationSchema(ctx: SchemaContext): object {
	const schema: Record<string, unknown> = {
		'@context': 'https://schema.org',
		'@type': 'Organization',
		name: ctx.siteName,
		url: ctx.siteUrl,
		...(ctx.description && { description: ctx.description }),
		...(ctx.logoUrl && { logo: ctx.logoUrl })
	};
	if (ctx.legalName) schema.legalName = ctx.legalName;
	if (ctx.address) schema.address = { '@type': 'PostalAddress', streetAddress: ctx.address };
	if (ctx.phone) schema.telephone = ctx.phone;
	return schema;
}

/** Format schema as script tag string (copy-paste ready) */
export function schemaToScriptTag(schema: object): string {
	return `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;
}

/** Map page type (PAGE_TYPES / page_type / CRO types) to schema types to generate */
export function getSchemaTypesForPageType(pageType: string | null): SchemaType[] {
	if (!pageType) return ['Article', 'BreadcrumbList'];
	const lower = (pageType || '').toLowerCase();

	if (lower.includes('product') || lower === 'money_page') return ['Product', 'BreadcrumbList'];
	if (lower.includes('service') || lower.includes('landing') || lower === 'service_page')
		return ['LocalBusiness', 'BreadcrumbList'];
	if (lower.includes('category')) return ['BreadcrumbList'];

	// Article types: Blog Post, How-To, Comparison, Complete Guide, Review, tofu/mofu/bofu articles
	return ['Article', 'BreadcrumbList'];
}

/** Generate all applicable schemas for a page, combined into one script block */
export function generateSchemaMarkup(
	pageType: string | null,
	ctx: SchemaContext,
	options?: { includeFAQ?: boolean; faqItems?: Array<{ question: string; answer: string }> }
): string {
	const types = getSchemaTypesForPageType(pageType);
	const schemas: object[] = [];

	for (const t of types) {
		if (t === 'Article') schemas.push(generateArticleSchema(ctx));
		else if (t === 'Product') schemas.push(generateProductSchema(ctx));
		else if (t === 'LocalBusiness') schemas.push(generateLocalBusinessSchema(ctx));
		else if (t === 'BreadcrumbList') schemas.push(generateBreadcrumbSchema(ctx));
	}

	if (options?.includeFAQ || (options?.faqItems && options.faqItems.length > 0)) {
		schemas.push(
			generateFAQSchema({
				...ctx,
				faqItems: options.faqItems
			})
		);
	}

	// Single script with array of schemas (valid JSON-LD)
	const combined = schemas.length === 1 ? schemas[0] : schemas;
	return schemaToScriptTag(combined);
}

// ---------------------------------------------------------------------------
// Platform-specific output formats for Schema Generator page
// ---------------------------------------------------------------------------

export type OutputFormat =
	| 'standard'
	| 'shopify_liquid'
	| 'wordpress_php'
	| 'bigcommerce'
	| 'webflow'
	| 'wix';

/** Escape string for PHP single-quoted string */
function escapeForPhp(s: string): string {
	return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/** Escape string for JavaScript string */
function escapeForJs(s: string): string {
	return s
		.replace(/\\/g, '\\\\')
		.replace(/"/g, '\\"')
		.replace(/\n/g, '\\n')
		.replace(/\r/g, '\\r');
}

/** Generate platform-specific output from schema object */
export function formatSchemaForPlatform(
	schema: object,
	platform: OutputFormat,
	schemaType: SchemaType
): string {
	const jsonStr = JSON.stringify(schema, null, 2);

	switch (platform) {
		case 'standard':
			return `<script type="application/ld+json">\n${jsonStr}\n</script>`;

		case 'webflow':
			return `<!-- Add in Webflow: Site Settings > Custom Code > Head Code -->
<script type="application/ld+json">
${jsonStr}
</script>`;

		case 'wordpress_php': {
			const jsonEscaped = escapeForPhp(JSON.stringify(schema));
			return `<?php
/**
 * Add to your theme's functions.php or a custom plugin.
 * Schema type: ${schemaType}
 */
add_action('wp_head', function() {
  $schema = json_decode('${jsonEscaped}', true);
  if ($schema) {
    echo '<script type="application/ld+json">' . wp_json_encode($schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . '</script>';
  }
});`;
		}

		case 'wix': {
			const jsonEscaped = escapeForJs(JSON.stringify(schema));
			return `import wixSeo from 'wix-seo';

// Add this to your page's code (Page Code or Master Page)
// Or use wix-seo-frontend for dynamic pages
$w.onReady(function () {
  const schema = JSON.parse("${jsonEscaped}");
  wixSeo.setStructuredData([schema]);
});`;
		}

		case 'shopify_liquid':
			return `{% comment %}
  Schema: ${schemaType}
  Save as: snippets/schema-${schemaType.toLowerCase().replace(/ /g, '-')}.liquid
  Include: {% render 'schema-${schemaType.toLowerCase().replace(/ /g, '-')}' %}
{% endcomment %}
<script type="application/ld+json">
${jsonStr}
</script>`;

		case 'bigcommerce': {
			// BigCommerce Stencil uses Handlebars. For static schema, output JSON in a script.
			// For product schema, we'd use dynamic Handlebars - see getBigCommerceProductSnippet
			return `{{!--
  Schema: ${schemaType}
  Add to your theme template (e.g. templates/pages/custom/page.html)
  Or create a partial in partials/schema/
--}}
<script type="application/ld+json">
${jsonStr}
</script>`;
		}

		default:
			return `<script type="application/ld+json">\n${jsonStr}\n</script>`;
	}
}

// ---------------------------------------------------------------------------
// Shopify Liquid — dynamic snippets (use Shopify objects)
// ---------------------------------------------------------------------------

export function getShopifyProductLiquidSnippet(): string {
	return `{% comment %}
  Product schema (dynamic) — uses Shopify product object.
  Save as: snippets/schema-product.liquid
  Include in product template: {% render 'schema-product' %}
  Note: Dawn+ has {{ product | structured_data }} — use this for more control.
{% endcomment %}
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": {{ product.title | json }},
  "description": {{ product.description | strip_html | json }},
  "url": {{ shop.url | append: product.url | json }},
  "image": {{ product.featured_image | image_url: width: 1200 | json }},
  "sku": {{ product.selected_or_first_available_variant.sku | json }},
  "offers": {
    "@type": "Offer",
    "price": {{ product.selected_or_first_available_variant.price | divided_by: 100.0 | json }},
    "priceCurrency": {{ cart.currency.iso_code | json }},
    "availability": "https://schema.org/{% if product.available %}InStock{% else %}OutOfStock{% endif %}",
    "url": {{ shop.url | append: product.url | json }}
  }
}
</script>`;
}

export function getShopifyArticleLiquidSnippet(): string {
	return `{% comment %}
  Article schema (dynamic) — for blog posts.
  Save as: snippets/schema-article.liquid
  Include in article template: {% render 'schema-article' %}
{% endcomment %}
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": {{ article.title | json }},
  "description": {{ article.excerpt_or_content | strip_html | truncate: 160 | json }},
  "url": {{ shop.url | append: article.url | json }},
  "datePublished": {{ article.published_at | date: '%Y-%m-%d' | json }},
  "dateModified": {{ article.updated_at | date: '%Y-%m-%d' | json }},
  "author": {
    "@type": "Person",
    "name": {{ article.author | json }}
  },
  "publisher": {
    "@type": "Organization",
    "name": {{ shop.name | json }},
    "url": {{ shop.url | json }}
  }
}
</script>`;
}

/** CollectionPage schema (dynamic) — uses Shopify collection object. */
export function getShopifyCollectionLiquidSnippet(): string {
	return `{% comment %}
  Collection schema (dynamic) — uses Shopify collection object.
  Save as: snippets/schema-collection.liquid
  Include in collection template: {% render 'schema-collection' %}
{% endcomment %}
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": {{ collection.title | json }},
  "description": {{ collection.description | strip_html | truncate: 300 | json }},
  "url": {{ shop.url | append: collection.url | json }},
  "mainEntity": {
    "@type": "ItemList",
    "name": {{ collection.title | json }},
    "numberOfItems": {{ collection.products_count | json }},
    "itemListElement": [
      {% for product in collection.products limit: 10 %}
      {
        "@type": "ListItem",
        "position": {{ forloop.index }},
        "url": {{ shop.url | append: product.url | json }},
        "name": {{ product.title | json }}
      }{% unless forloop.last %},{% endunless %}
      {% endfor %}
    ]
  }
}
</script>`;
}

export function getShopifyLocalBusinessLiquidSnippet(): string {
	return `{% comment %}
  LocalBusiness schema — uses Shopify shop object.
  Save as: snippets/schema-local-business.liquid
  Include in theme.liquid <head>: {% render 'schema-local-business' %}
  Replace YOUR_* below with your business address and phone.
{% endcomment %}
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": {{ shop.name | json }},
  "url": {{ shop.url | json }},
  "description": {{ shop.description | default: shop.name | json }},
  "telephone": "YOUR_PHONE",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "YOUR_STREET",
    "addressLocality": "YOUR_CITY",
    "addressRegion": "YOUR_STATE",
    "postalCode": "YOUR_ZIP",
    "addressCountry": "YOUR_COUNTRY"
  }
}
</script>`;
}

/** Shopify Liquid for FAQ — supports metafields or static. This version uses a metaobject/block. */
export function getShopifyFaqLiquidSnippet(): string {
	return `{% comment %}
  FAQ schema — add FAQ items below or use a metaobject.
  Save as: snippets/schema-faq.liquid
  Option A: Replace the mainEntity array with your FAQ data.
  Option B: Use {% for item in page.metafields.custom.faq.value %} if you have FAQ metafields.
{% endcomment %}
{% assign faq_items = page.metafields.custom.faq.value | default: nil %}
{% if faq_items == nil %}
  {% comment %} Static fallback — edit the items below {% endcomment %}
  {% assign faq_items = "" | split: "" %}
  {% comment %} Add items: {% assign item = '{"question":"Q?","answer":"A"}' | parse_json %} ... {% endcomment %}
{% endif %}
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {"@type":"Question","name":"Your question 1?","acceptedAnswer":{"@type":"Answer","text":"Your answer 1."}},
    {"@type":"Question","name":"Your question 2?","acceptedAnswer":{"@type":"Answer","text":"Your answer 2."}}
  ]
}
</script>`;
}

/** Shopify Liquid for BreadcrumbList — uses Shopify breadcrumbs */
export function getShopifyBreadcrumbLiquidSnippet(): string {
	return `{% comment %}
  Breadcrumb schema (dynamic) — uses Shopify's breadcrumb object.
  Save as: snippets/schema-breadcrumb.liquid
  Include in layout: {% render 'schema-breadcrumb' %}
  Requires breadcrumbs to be available (product/collection pages have this).
{% endcomment %}
{% if breadcrumbs %}
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {% for crumb in breadcrumbs %}
    {
      "@type": "ListItem",
      "position": {{ forloop.index }},
      "name": {{ crumb.name | json }},
      "item": {{ crumb.url | prepend: shop.url | json }}
    }{% unless forloop.last %},{% endunless %}
    {% endfor %}
  ]
}
</script>
{% endif %}`;
}

// ---------------------------------------------------------------------------
// BigCommerce Stencil (Handlebars) — dynamic snippets
// ---------------------------------------------------------------------------

export function getBigCommerceProductSnippet(): string {
	return `{{!--
  Product schema (dynamic) — BigCommerce Stencil Handlebars
  Add to product template. Uses inject/json helpers — ensure product is in context.
  Docs: https://developer.bigcommerce.com/docs/storefront/stencil
--}}
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": {{json product.name}},
  "description": {{json product.description}},
  "url": "{{product.url}}",
  "image": "{{product.images.0.data}}",
  "sku": {{json product.sku}},
  "offers": {
    "@type": "Offer",
    "price": {{product.price.without_tax.value}},
    "priceCurrency": "{{currency_selector.active_currency_code}}",
    "availability": "https://schema.org/{{#if product.availability}}InStock{{else}}OutOfStock{{/if}}",
    "url": "{{product.url}}"
  }
}
</script>`;
}

export function getBigCommerceArticleSnippet(): string {
	return `{{!--
  Article schema — BigCommerce Blog (if using blog app)
  Or use for Web Pages with custom fields
  Add to blog post template
--}}
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": {{json post.title}},
  "description": {{json post.meta_description}},
  "url": "{{post.url}}",
  "datePublished": "{{post.date_published}}",
  "dateModified": "{{post.date_modified}}",
  "author": {"@type":"Person","name": {{json post.author}}},
  "publisher": {
    "@type": "Organization",
    "name": {{json store_name}},
    "url": "{{store_domain}}"
  }
}
</script>`;
}

// ---------------------------------------------------------------------------
// WordPress PHP — dynamic (uses WP functions)
// ---------------------------------------------------------------------------

export function getWordPressArticlePhpSnippet(): string {
	return `<?php
/**
 * Article schema for blog posts — add to functions.php
 * Outputs on single posts only
 */
add_action('wp_head', function() {
  if (!is_singular('post')) return;
  $schema = [
    '@context' => 'https://schema.org',
    '@type' => 'Article',
    'headline' => get_the_title(),
    'description' => wp_trim_words(get_the_excerpt(), 30),
    'url' => get_permalink(),
    'datePublished' => get_the_date('c'),
    'dateModified' => get_the_modified_date('c'),
    'author' => ['@type' => 'Person', 'name' => get_the_author()],
    'publisher' => [
      '@type' => 'Organization',
      'name' => get_bloginfo('name'),
      'url' => home_url('/')
    ]
  ];
  if (has_post_thumbnail()) $schema['image'] = get_the_post_thumbnail_url(null, 'full');
  echo '<script type="application/ld+json">' . wp_json_encode($schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . '</script>';
});`;
}

export function getWordPressProductPhpSnippet(): string {
	return `<?php
/**
 * Product schema for WooCommerce — add to functions.php
 * WooCommerce adds Product schema by default; use this to extend or replace
 */
add_action('wp_head', function() {
  if (!function_exists('is_product') || !is_product()) return;
  global $product;
  if (!$product) return;
  $schema = [
    '@context' => 'https://schema.org',
    '@type' => 'Product',
    'name' => $product->get_name(),
    'description' => wp_strip_all_tags($product->get_short_description()),
    'url' => get_permalink(),
    'image' => wp_get_attachment_url($product->get_image_id()),
    'sku' => $product->get_sku(),
    'offers' => [
      '@type' => 'Offer',
      'price' => $product->get_price(),
      'priceCurrency' => get_woocommerce_currency(),
      'availability' => $product->is_in_stock() ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      'url' => get_permalink()
    ]
  ];
  echo '<script type="application/ld+json">' . wp_json_encode($schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . '</script>';
});`;
}

/** Legacy: formatSchemaOutput for backwards compatibility */
export function formatSchemaOutput(
	schema: object,
	format: OutputFormat,
	schemaType: SchemaType
): string {
	return formatSchemaForPlatform(schema, format, schemaType);
}
