import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.PUBLIC_SUPABASE_URL  as string;
const supabaseAnon = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnon);

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  meta_title: string | null;
  meta_description: string | null;
  sort_order: number;
};

export type PostSummary = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  og_image_url: string | null;
  published_at: string | null;
  featured: boolean;
  reading_time_minutes: number | null;
  author_name: string;
  blog_categories: Pick<Category, 'id' | 'name' | 'slug'> | null;
};

export type Post = PostSummary & {
  content_html: string | null;
  meta_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  schema_markup: object | null;
  blog_categories: Category | null;
};

export async function getCategories(): Promise<Category[]> {
  const { data } = await supabase
    .from('blog_categories')
    .select('*')
    .order('sort_order');
  return (data ?? []) as Category[];
}

export async function getPosts(categorySlug?: string): Promise<PostSummary[]> {
  let query = supabase
    .from('blog_posts')
    .select('id,title,slug,excerpt,og_image_url,published_at,featured,reading_time_minutes,author_name,blog_categories(id,name,slug)')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (categorySlug) {
    const { data: cat } = await supabase
      .from('blog_categories')
      .select('id')
      .eq('slug', categorySlug)
      .single();
    if (cat) query = query.eq('category_id', (cat as { id: string }).id);
  }

  const { data } = await query;
  return (data ?? []) as PostSummary[];
}

export async function getPost(slug: string): Promise<Post | null> {
  const { data } = await supabase
    .from('blog_posts')
    .select('*,blog_categories(*)')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();
  return (data ?? null) as Post | null;
}

export async function getFeaturedPosts(limit = 3): Promise<PostSummary[]> {
  const { data } = await supabase
    .from('blog_posts')
    .select('id,title,slug,excerpt,og_image_url,published_at,featured,reading_time_minutes,author_name,blog_categories(id,name,slug)')
    .eq('status', 'published')
    .eq('featured', true)
    .order('published_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as PostSummary[];
}
