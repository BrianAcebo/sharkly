import { filterPostsBySearchQuery, type SearchablePost } from './blogSearchCore';

function formatPostDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function createPostCard(post: SearchablePost, featured: boolean): HTMLAnchorElement {
  const href = `/blog/${post.blog_categories?.slug ?? 'uncategorized'}/${post.slug}`;
  const a = document.createElement('a');
  a.href = href;
  a.className = [
    'flex flex-col rounded-xl border overflow-hidden bg-white no-underline transition-shadow duration-150 hover:shadow-lg dark:bg-neutral-800 dark:border-neutral-700',
    featured ? 'border-indigo-500 dark:border-indigo-600' : 'border-gray-200 dark:border-neutral-700',
  ].join(' ');

  if (post.og_image_url) {
    const wrap = document.createElement('div');
    wrap.className = 'aspect-video overflow-hidden';
    const img = document.createElement('img');
    img.src = post.og_image_url;
    img.alt = post.title;
    img.loading = 'lazy';
    img.className = 'w-full h-full object-cover';
    wrap.appendChild(img);
    a.appendChild(wrap);
  }

  const body = document.createElement('div');
  body.className = 'p-5 flex flex-col flex-1 gap-2';

  if (post.blog_categories) {
    const cat = document.createElement('span');
    cat.className =
      'text-xs font-semibold text-indigo-600 uppercase tracking-wider dark:text-indigo-400';
    cat.textContent = post.blog_categories.name;
    body.appendChild(cat);
  }

  const h3 = document.createElement('h3');
  h3.className = 'text-base font-semibold text-neutral-900 leading-snug flex-1 dark:text-stone-100';
  h3.textContent = post.title;
  body.appendChild(h3);

  if (post.excerpt) {
    const ex = document.createElement('p');
    ex.className = 'text-sm text-gray-500 line-clamp-2 dark:text-gray-400';
    ex.textContent = post.excerpt;
    body.appendChild(ex);
  }

  const meta = document.createElement('div');
  meta.className = 'flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-gray-500';
  const author = document.createElement('span');
  author.textContent = post.author_name;
  meta.appendChild(author);
  const dateStr = formatPostDate(post.published_at);
  if (dateStr) {
    meta.appendChild(document.createTextNode(' · '));
    const d = document.createElement('span');
    d.textContent = dateStr;
    meta.appendChild(d);
  }
  if (post.reading_time_minutes != null) {
    meta.appendChild(document.createTextNode(' · '));
    const rt = document.createElement('span');
    rt.textContent = `${post.reading_time_minutes} min read`;
    meta.appendChild(rt);
  }
  body.appendChild(meta);
  a.appendChild(body);
  return a;
}

export type MountBlogLiveSearchOptions = {
  posts: SearchablePost[];
  input: HTMLInputElement | string;
  resultsContainer: HTMLElement | string;
  statusEl: HTMLElement | string | null;
  emptyHintEl?: HTMLElement | string | null;
  /** Shown only while the query is non-empty (e.g. index page live block) */
  showHideWrap?: HTMLElement | string | null;
  debounceMs?: number;
  /** When set, sync ?q= with history.replaceState (no full navigation) */
  syncUrl?: string;
  featured?: boolean;
};

export function mountBlogLiveSearch(options: MountBlogLiveSearchOptions): () => void {
  const { posts, debounceMs = 280, syncUrl, featured = false } = options;

  const input =
    typeof options.input === 'string'
      ? document.querySelector<HTMLInputElement>(options.input)
      : options.input;
  const resultsContainer =
    typeof options.resultsContainer === 'string'
      ? document.querySelector<HTMLElement>(options.resultsContainer)
      : options.resultsContainer;
  const statusEl =
    options.statusEl == null
      ? null
      : typeof options.statusEl === 'string'
        ? document.querySelector<HTMLElement>(options.statusEl)
        : options.statusEl;
  const emptyHintEl =
    options.emptyHintEl == null
      ? null
      : typeof options.emptyHintEl === 'string'
        ? document.querySelector<HTMLElement>(options.emptyHintEl)
        : options.emptyHintEl;
  const showHideWrap =
    options.showHideWrap == null
      ? null
      : typeof options.showHideWrap === 'string'
        ? document.querySelector<HTMLElement>(options.showHideWrap)
        : options.showHideWrap;

  if (!input || !resultsContainer) {
    return () => undefined;
  }

  const form = input.closest('form');
  let t: ReturnType<typeof setTimeout> | undefined;

  const setNoResultsStatus = (status: HTMLElement, query: string) => {
    status.textContent = '';
    status.append(document.createTextNode('No articles match '));
    const qem = document.createElement('span');
    qem.className = 'font-medium text-neutral-700 dark:text-gray-300';
    qem.textContent = `“${query}”`;
    status.appendChild(qem);
    status.appendChild(document.createTextNode('. Try fewer words or browse '));
    const a = document.createElement('a');
    a.href = '/blog';
    a.className = 'text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400';
    a.textContent = 'all posts';
    status.appendChild(a);
    status.appendChild(document.createTextNode('.'));
  };

  const setMatchStatus = (status: HTMLElement, count: number, query: string) => {
    status.textContent = '';
    status.append(
      document.createTextNode(`${count} article${count !== 1 ? 's' : ''} matching `)
    );
    const em = document.createElement('span');
    em.className = 'font-medium text-neutral-700 dark:text-gray-300';
    em.textContent = `“${query}”`;
    status.appendChild(em);
  };

  const render = (rawQuery: string) => {
    const q = rawQuery.trim();
    if (syncUrl !== undefined && typeof history !== 'undefined') {
      const next = q ? `${syncUrl}?q=${encodeURIComponent(q)}` : syncUrl;
      const url = new URL(next, window.location.origin);
      history.replaceState(null, '', url.pathname + url.search);
    }

    if (statusEl) {
      if (!q) {
        statusEl.textContent = '';
        statusEl.classList.add('hidden');
      } else {
        statusEl.classList.remove('hidden');
      }
    }

    const filtered = q ? filterPostsBySearchQuery(posts, q) : [];

    if (!q) {
      resultsContainer.innerHTML = '';
      resultsContainer.classList.add('hidden');
      showHideWrap?.classList.add('hidden');
      emptyHintEl?.classList.remove('hidden');
      return;
    }

    emptyHintEl?.classList.add('hidden');
    showHideWrap?.classList.remove('hidden');
    resultsContainer.classList.remove('hidden');

    if (statusEl) {
      if (filtered.length === 0) {
        setNoResultsStatus(statusEl, q);
      } else {
        setMatchStatus(statusEl, filtered.length, q);
      }
    }

    const grid = document.createElement('div');
    grid.className = 'grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    for (const p of filtered) {
      grid.appendChild(createPostCard(p, featured));
    }
    resultsContainer.innerHTML = '';
    resultsContainer.appendChild(grid);
  };

  const schedule = () => {
    if (t) clearTimeout(t);
    t = setTimeout(() => render(input.value), debounceMs);
  };

  const onSubmit = (e: Event) => {
    e.preventDefault();
    if (t) clearTimeout(t);
    render(input.value);
  };

  input.addEventListener('input', schedule);
  input.addEventListener('search', schedule);
  if (form) form.addEventListener('submit', onSubmit);

  render(input.value);

  return () => {
    if (t) clearTimeout(t);
    input.removeEventListener('input', schedule);
    input.removeEventListener('search', schedule);
    if (form) form.removeEventListener('submit', onSubmit);
  };
}
