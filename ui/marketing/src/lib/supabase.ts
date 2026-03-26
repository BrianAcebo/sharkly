import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
const supabaseAnon = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;

let _supabase: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (_supabase) return _supabase;
  if (!supabaseUrl || !supabaseAnon) {
    console.warn('[supabase] Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_ANON_KEY — blog will be empty');
    return null;
  }
  _supabase = createClient(supabaseUrl, supabaseAnon);
  return _supabase;
}

export const supabase = {
  get from() {
    const c = getClient();
    if (!c) throw new Error('Supabase not configured');
    return c.from.bind(c);
  },
} as unknown as SupabaseClient;

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
  updated_at?: string | null;
  blog_categories: Category | null;
};

export async function getCategories(): Promise<Category[]> {
  const client = getClient();
  if (!client) return [];
  const { data } = await client
    .from('blog_categories')
    .select('*')
    .order('sort_order');
  return (data ?? []) as Category[];
}

export async function getPosts(categorySlug?: string): Promise<PostSummary[]> {
  const client = getClient();
  if (!client) return [];
  let query = client
    .from('blog_posts')
    .select('id,title,slug,excerpt,og_image_url,published_at,featured,reading_time_minutes,author_name,blog_categories(id,name,slug)')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (categorySlug) {
    const { data: cat } = await client
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
  const client = getClient();
  if (!client) return null;
  const { data } = await client
    .from('blog_posts')
    .select('*,blog_categories(*)')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();
  return (data ?? null) as Post | null;
}

export async function getFeaturedPosts(limit = 3): Promise<PostSummary[]> {
  const client = getClient();
  if (!client) return [];
  const { data } = await client
    .from('blog_posts')
    .select('id,title,slug,excerpt,og_image_url,published_at,featured,reading_time_minutes,author_name,blog_categories(id,name,slug)')
    .eq('status', 'published')
    .eq('featured', true)
    .order('published_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as PostSummary[];
}
