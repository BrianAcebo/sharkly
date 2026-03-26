/**
 * Minimal post shape for search (browser-safe — no Supabase imports).
 */
export type SearchablePost = {
  title: string;
  slug: string;
  excerpt: string | null;
  og_image_url: string | null;
  published_at: string | null;
  reading_time_minutes: number | null;
  author_name: string;
  blog_categories: { id?: string; name: string; slug: string } | null;
};

/**
 * Case-insensitive: every whitespace-separated term must appear in title, excerpt,
 * author, or category name/slug.
 */
export function filterPostsBySearchQuery(posts: SearchablePost[], query: string): SearchablePost[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  const terms = normalized.split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  return posts.filter((p) => {
    const haystack = [
      p.title,
      p.excerpt ?? '',
      p.author_name ?? '',
      p.blog_categories?.name ?? '',
      p.blog_categories?.slug ?? '',
    ]
      .join('\n')
      .toLowerCase();
    return terms.every((t) => haystack.includes(t));
  });
}
