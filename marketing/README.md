# sharkly.co — Marketing Site (Astro)

This is the public-facing **sharkly.co** marketing and content site, built with [Astro](https://astro.build).

## Domain Architecture

| Domain | What it is | Tech |
|---|---|---|
| `sharkly.co` | Marketing + blog | Astro (SSR, this project) |
| `app.sharkly.co` | The actual app | React (Vite, root of monorepo) |
| `api.sharkly.co` | Backend API | Express (api/) |

## URL structure

```
sharkly.co/                          → Marketing homepage
sharkly.co/blog                      → Blog listing
sharkly.co/blog/glossary             → Glossary category
sharkly.co/blog/glossary/[slug]      → Individual glossary article
sharkly.co/blog/guides/[slug]        → Individual guide
sharkly.co/blog/rss.xml              → RSS feed
sharkly.co/sitemap-index.xml         → Auto-generated sitemap
```

## Why Astro?

- **Pure server-side HTML** — Google crawls every page without JS execution
- **Zero JS by default** — fastest possible Core Web Vitals
- **No rebuild on publish** — SSR mode means new articles appear instantly after publishing in the CMS
- **Built-in sitemap** via `@astrojs/sitemap`

## Content Management

Content is managed through the **admin CMS at `app.sharkly.co/admin/blog`**.

1. Log in to the app
2. Go to Admin → Blog CMS
3. Write with the Tiptap editor
4. Hit Publish — the Astro site picks it up immediately (SSR)

## Setup

```bash
cp .env.example .env
# Fill in SITE_URL, PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY
# Optional for local dev: PUBLIC_APP_URL=http://localhost:5173 (so CTAs link to local app from marketing site)

npm install
npm run dev      # http://localhost:4321 (when run from repo root: npm run dev)
npm run build
```

**Ports when running `npm run dev` from repo root:**
- **4321** — Marketing site (Astro, this project) — homepage, blog
- **5173** — App (Vite/React) — dashboard, strategy, etc.

## Deployment

Deploy to **Vercel**, **Fly.io**, or any Node.js host. The `@astrojs/node` adapter runs it as a standalone server.

Set the custom domain to `sharkly.co` and point `app.sharkly.co` to the Vite/React build.

## SEO features built in

- `<title>`, `<meta description>`, Open Graph tags on every page
- `Article` JSON-LD schema on blog posts
- `BreadcrumbList` JSON-LD on article pages
- `<link rel="canonical">` on all pages
- Auto-generated `/sitemap-index.xml`
- RSS feed at `/blog/rss.xml`
- Reading time calculated server-side
- `content_html` pre-rendered from Tiptap JSON in the API — pure HTML served to crawlers
