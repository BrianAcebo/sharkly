import { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';
import { captureApiError } from '../utils/sentryCapture.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function estimateReadingTime(html: string): number {
  const words = html.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/**
 * Lightweight Tiptap JSON → HTML converter (no React dependency).
 * Handles all standard StarterKit node/mark types.
 */
function tiptapToHtml(doc: TiptapNode | null | undefined): string {
  if (!doc) return '';
  return renderNodes(doc.content ?? []);
}

type TiptapMark = { type: string; attrs?: Record<string, unknown> };
type TiptapNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: TiptapMark[];
  content?: TiptapNode[];
};

function renderNodes(nodes: TiptapNode[]): string {
  return nodes.map(renderNode).join('');
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderNode(node: TiptapNode): string {
  if (node.type === 'text') {
    let out = escHtml(node.text ?? '');
    for (const mark of node.marks ?? []) {
      switch (mark.type) {
        case 'bold':      out = `<strong>${out}</strong>`; break;
        case 'italic':    out = `<em>${out}</em>`; break;
        case 'underline': out = `<u>${out}</u>`; break;
        case 'strike':    out = `<s>${out}</s>`; break;
        case 'code':      out = `<code>${out}</code>`; break;
        case 'link': {
          const href = escHtml(String(mark.attrs?.href ?? ''));
          const target = mark.attrs?.target ? ` target="${escHtml(String(mark.attrs.target))}"` : '';
          const rel = target ? ' rel="noopener noreferrer"' : '';
          out = `<a href="${href}"${target}${rel}>${out}</a>`;
          break;
        }
      }
    }
    return out;
  }

  const inner = renderNodes(node.content ?? []);

  switch (node.type) {
    case 'doc':              return inner;
    case 'paragraph':        return `<p>${inner}</p>\n`;
    case 'heading': {
      const level = Number(node.attrs?.level ?? 2);
      return `<h${level}>${inner}</h${level}>\n`;
    }
    case 'bulletList':       return `<ul>\n${inner}</ul>\n`;
    case 'orderedList':      return `<ol>\n${inner}</ol>\n`;
    case 'listItem':         return `<li>${inner}</li>\n`;
    case 'blockquote':       return `<blockquote>\n${inner}</blockquote>\n`;
    case 'codeBlock': {
      const lang = escHtml(String(node.attrs?.language ?? ''));
      return `<pre><code class="language-${lang}">${inner}</code></pre>\n`;
    }
    case 'hardBreak':        return '<br>';
    case 'horizontalRule':   return '<hr>\n';
    case 'image': {
      const src = escHtml(String(node.attrs?.src ?? ''));
      const alt = escHtml(String(node.attrs?.alt ?? ''));
      const title = node.attrs?.title ? ` title="${escHtml(String(node.attrs.title))}"` : '';
      return `<img src="${src}" alt="${alt}"${title} loading="lazy">\n`;
    }
    case 'table':           return `<table>\n${inner}</table>\n`;
    case 'tableRow':        return `<tr>${inner}</tr>\n`;
    case 'tableHeader':     return `<th>${inner}</th>`;
    case 'tableCell':       return `<td>${inner}</td>`;
    default:
      return inner;
  }
}

// ─── Categories ─────────────────────────────────────────────────────────────

export async function listCategories(_req: Request, res: Response): Promise<void> {
  const { data, error } = await supabase
    .from('blog_categories')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) { captureApiError(error, _req, { feature: 'blog-categories-list' }); res.status(500).json({ error: error.message }); return; }
  res.json({ categories: data });
}

export async function createCategory(req: Request, res: Response): Promise<void> {
  const { name, description, meta_title, meta_description, sort_order } = req.body as {
    name: string;
    description?: string;
    meta_title?: string;
    meta_description?: string;
    sort_order?: number;
  };

  if (!name?.trim()) { res.status(400).json({ error: 'name is required' }); return; }

  const slug = slugify(name);
  const { data, error } = await supabase
    .from('blog_categories')
    .insert({ name: name.trim(), slug, description, meta_title, meta_description, sort_order: sort_order ?? 0 })
    .select()
    .single();

  if (error) { captureApiError(error, req, { feature: 'blog-categories-create' }); res.status(500).json({ error: error.message }); return; }
  res.status(201).json({ category: data });
}

export async function updateCategory(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, description, meta_title, meta_description, sort_order } = req.body as {
    name?: string;
    description?: string;
    meta_title?: string;
    meta_description?: string;
    sort_order?: number;
  };

  const updates: Record<string, unknown> = {};
  if (name !== undefined) { updates.name = name.trim(); updates.slug = slugify(name); }
  if (description !== undefined) updates.description = description;
  if (meta_title !== undefined) updates.meta_title = meta_title;
  if (meta_description !== undefined) updates.meta_description = meta_description;
  if (sort_order !== undefined) updates.sort_order = sort_order;

  const { data, error } = await supabase
    .from('blog_categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) { captureApiError(error, req, { feature: 'blog-categories-update' }); res.status(500).json({ error: error.message }); return; }
  res.json({ category: data });
}

export async function deleteCategory(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { error } = await supabase.from('blog_categories').delete().eq('id', id);
  if (error) { captureApiError(error, req, { feature: 'blog-categories-delete' }); res.status(500).json({ error: error.message }); return; }
  res.json({ ok: true });
}

// ─── Posts ───────────────────────────────────────────────────────────────────

export async function listPostsAdmin(_req: Request, res: Response): Promise<void> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, title, slug, status, category_id, published_at, featured, reading_time_minutes, excerpt, author_name, created_at, updated_at, blog_categories(id, name, slug)')
    .order('created_at', { ascending: false });

  if (error) { captureApiError(error, _req, { feature: 'blog-posts-list-admin' }); res.status(500).json({ error: error.message }); return; }
  res.json({ posts: data });
}

export async function listPostsPublic(req: Request, res: Response): Promise<void> {
  const categorySlug = req.query.category as string | undefined;

  let query = supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, og_image_url, published_at, featured, reading_time_minutes, author_name, blog_categories(id, name, slug)')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (categorySlug) {
    const { data: cat } = await supabase
      .from('blog_categories')
      .select('id')
      .eq('slug', categorySlug)
      .single();
    if (cat) query = query.eq('category_id', cat.id);
  }

  const { data, error } = await query;
  if (error) { captureApiError(error, req, { feature: 'blog-posts-list-public' }); res.status(500).json({ error: error.message }); return; }
  res.json({ posts: data });
}

export async function getPostBySlug(req: Request, res: Response): Promise<void> {
  const { slug } = req.params;
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*, blog_categories(id, name, slug, description)')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error || !data) { res.status(404).json({ error: 'Post not found' }); return; }
  res.json({ post: data });
}

export async function getPostByIdAdmin(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*, blog_categories(id, name, slug)')
    .eq('id', id)
    .single();

  if (error || !data) { res.status(404).json({ error: 'Post not found' }); return; }
  res.json({ post: data });
}

export async function createPost(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    title: string;
    slug?: string;
    category_id?: string | null;
    excerpt?: string;
    content?: TiptapNode;
    meta_title?: string;
    meta_description?: string;
    og_image_url?: string;
    status?: string;
    author_name?: string;
    featured?: boolean;
    canonical_url?: string;
    schema_markup?: object;
  };

  if (!body.title?.trim()) { res.status(400).json({ error: 'title is required' }); return; }

  const slug = body.slug?.trim() || slugify(body.title);
  const content_html = body.content ? tiptapToHtml(body.content) : '';
  const reading_time_minutes = content_html ? estimateReadingTime(content_html) : null;
  const published_at =
    body.status === 'published' ? new Date().toISOString() : null;

  const { data, error } = await supabase
    .from('blog_posts')
    .insert({
      title: body.title.trim(),
      slug,
      category_id: body.category_id ?? null,
      excerpt: body.excerpt ?? null,
      content: body.content ?? null,
      content_html: content_html || null,
      meta_title: body.meta_title ?? null,
      meta_description: body.meta_description ?? null,
      og_image_url: body.og_image_url ?? null,
      status: body.status ?? 'draft',
      author_name: body.author_name ?? 'Sharkly Team',
      featured: body.featured ?? false,
      canonical_url: body.canonical_url ?? null,
      schema_markup: body.schema_markup ?? null,
      reading_time_minutes,
      published_at,
    })
    .select()
    .single();

  if (error) { captureApiError(error, req, { feature: 'blog-posts-create' }); res.status(500).json({ error: error.message }); return; }
  res.status(201).json({ post: data });
}

export async function updatePost(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const body = req.body as {
    title?: string;
    slug?: string;
    category_id?: string | null;
    excerpt?: string;
    content?: TiptapNode;
    meta_title?: string;
    meta_description?: string;
    og_image_url?: string;
    status?: string;
    author_name?: string;
    featured?: boolean;
    canonical_url?: string;
    schema_markup?: object;
  };

  // Fetch existing to check if we need to set published_at
  const { data: existing } = await supabase
    .from('blog_posts')
    .select('status, published_at')
    .eq('id', id)
    .single();

  const updates: Record<string, unknown> = {};
  if (body.title !== undefined)        { updates.title = body.title.trim(); }
  if (body.slug !== undefined)         { updates.slug = body.slug.trim(); }
  if (body.category_id !== undefined)  { updates.category_id = body.category_id; }
  if (body.excerpt !== undefined)      { updates.excerpt = body.excerpt; }
  if (body.meta_title !== undefined)   { updates.meta_title = body.meta_title; }
  if (body.meta_description !== undefined) { updates.meta_description = body.meta_description; }
  if (body.og_image_url !== undefined) { updates.og_image_url = body.og_image_url; }
  if (body.author_name !== undefined)  { updates.author_name = body.author_name; }
  if (body.featured !== undefined)     { updates.featured = body.featured; }
  if (body.canonical_url !== undefined){ updates.canonical_url = body.canonical_url; }
  if (body.schema_markup !== undefined){ updates.schema_markup = body.schema_markup; }

  if (body.content !== undefined) {
    updates.content = body.content;
    const html = tiptapToHtml(body.content);
    updates.content_html = html || null;
    updates.reading_time_minutes = html ? estimateReadingTime(html) : null;
  }

  if (body.status !== undefined) {
    updates.status = body.status;
    // Set published_at the first time status becomes 'published'
    if (body.status === 'published' && existing?.status !== 'published' && !existing?.published_at) {
      updates.published_at = new Date().toISOString();
    }
  }

  const { data, error } = await supabase
    .from('blog_posts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) { captureApiError(error, req, { feature: 'blog-posts-update' }); res.status(500).json({ error: error.message }); return; }
  res.json({ post: data });
}

export async function deletePost(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { error } = await supabase.from('blog_posts').delete().eq('id', id);
  if (error) { captureApiError(error, req, { feature: 'blog-posts-delete' }); res.status(500).json({ error: error.message }); return; }
  res.json({ ok: true });
}

