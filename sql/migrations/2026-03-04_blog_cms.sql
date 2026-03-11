-- Blog CMS tables: categories + posts with full SEO metadata
-- Powers the admin CMS (Tiptap editor) and the Astro public blog

CREATE TABLE IF NOT EXISTS public.blog_categories (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  slug          text        NOT NULL UNIQUE,
  description   text,
  meta_title    text,
  meta_description text,
  sort_order    integer     NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id         uuid        REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  title               text        NOT NULL,
  slug                text        NOT NULL UNIQUE,
  excerpt             text,
  content             jsonb,                 -- Tiptap JSON document
  content_html        text,                  -- Pre-rendered HTML (for Astro SSR / SEO)
  meta_title          text,
  meta_description    text,
  og_image_url        text,
  schema_markup       jsonb,                 -- JSON-LD Article schema override
  status              text        NOT NULL DEFAULT 'draft'
                                  CHECK (status IN ('draft', 'published', 'archived')),
  published_at        timestamptz,
  author_name         text        NOT NULL DEFAULT 'Sharkly Team',
  reading_time_minutes integer,
  featured            boolean     NOT NULL DEFAULT false,
  canonical_url       text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_category    ON public.blog_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status      ON public.blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published   ON public.blog_posts(published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_blog_posts_featured    ON public.blog_posts(featured) WHERE status = 'published';

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_blog_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER blog_categories_updated_at
  BEFORE UPDATE ON public.blog_categories
  FOR EACH ROW EXECUTE FUNCTION update_blog_updated_at();

CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION update_blog_updated_at();

-- RLS: blog is admin-only for writes, public for reads
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts      ENABLE ROW LEVEL SECURITY;

-- Public read access for published posts and all categories
CREATE POLICY "Public can read blog categories"
  ON public.blog_categories FOR SELECT USING (true);

CREATE POLICY "Public can read published blog posts"
  ON public.blog_posts FOR SELECT USING (status = 'published');

-- Seed first category
INSERT INTO public.blog_categories (name, slug, description, meta_title, meta_description, sort_order)
VALUES
  ('Glossary',    'glossary',    'SEO terms and concepts explained in plain English — backed by patents and research.', 'SEO Glossary | Sharkly', 'Plain-English definitions of SEO terms, backed by Google patents and research.', 1),
  ('Guides',      'guides',      'Step-by-step SEO guides for small business owners.',                                   'SEO Guides | Sharkly',   'Step-by-step SEO guides that help small businesses rank on Google.',              2),
  ('Case Studies','case-studies','Real results from real businesses using Sharkly.',                                     'Case Studies | Sharkly', 'Real SEO results from small businesses using Sharkly.',                          3)
ON CONFLICT (slug) DO NOTHING;
