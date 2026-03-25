import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

const API_BASE = '/api/blog';

export type BlogCategory = {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	meta_title: string | null;
	meta_description: string | null;
	sort_order: number;
	created_at: string;
	updated_at: string;
};

export type BlogPostSummary = {
	id: string;
	title: string;
	slug: string;
	status: 'draft' | 'published' | 'archived';
	category_id: string | null;
	excerpt: string | null;
	og_image_url: string | null;
	published_at: string | null;
	featured: boolean;
	reading_time_minutes: number | null;
	author_name: string;
	created_at: string;
	updated_at: string;
	blog_categories: Pick<BlogCategory, 'id' | 'name' | 'slug'> | null;
};

export type BlogPost = BlogPostSummary & {
	content: object | null;
	content_html: string | null;
	meta_title: string | null;
	meta_description: string | null;
	canonical_url: string | null;
	schema_markup: object | null;
};

// ── Categories ────────────────────────────────────────────────────────────────

export function useBlogCategories() {
	const [categories, setCategories] = useState<BlogCategory[]>([]);
	const [loading, setLoading] = useState(false);

	const loadCategories = useCallback(async () => {
		setLoading(true);
		try {
			const res = await api.get(`${API_BASE}/categories`);
			const json = (await res.json()) as { categories: BlogCategory[] };
			setCategories(json.categories ?? []);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void loadCategories();
	}, [loadCategories]);

	const create = useCallback(async (payload: Partial<BlogCategory>) => {
		const res = await api.post(`${API_BASE}/admin/categories`, payload);
		const json = (await res.json()) as { category: BlogCategory; error?: string };
		if (!res.ok) throw new Error(json.error ?? 'Failed to create category');
		setCategories((prev) => [...prev, json.category].sort((a, b) => a.sort_order - b.sort_order));
		return json.category;
	}, []);

	const update = useCallback(async (id: string, payload: Partial<BlogCategory>) => {
		const res = await api.put(`${API_BASE}/admin/categories/${id}`, payload);
		const json = (await res.json()) as { category: BlogCategory; error?: string };
		if (!res.ok) throw new Error(json.error ?? 'Failed to update category');
		setCategories((prev) => prev.map((c) => (c.id === id ? json.category : c)));
		return json.category;
	}, []);

	const remove = useCallback(async (id: string) => {
		const res = await api.delete(`${API_BASE}/admin/categories/${id}`);
		if (!res.ok) throw new Error('Failed to delete category');
		setCategories((prev) => prev.filter((c) => c.id !== id));
	}, []);

	return { categories, loading, refetch: loadCategories, create, update, remove };
}

// ── Posts ─────────────────────────────────────────────────────────────────────

export function useBlogPosts() {
	const [posts, setPosts] = useState<BlogPostSummary[]>([]);
	const [loading, setLoading] = useState(false);

	const loadPosts = useCallback(async () => {
		setLoading(true);
		try {
			const res = await api.get(`${API_BASE}/admin/posts`);
			const json = (await res.json()) as { posts: BlogPostSummary[] };
			setPosts(json.posts ?? []);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void loadPosts();
	}, [loadPosts]);

	const remove = useCallback(async (id: string) => {
		const res = await api.delete(`${API_BASE}/admin/posts/${id}`);
		if (!res.ok) throw new Error('Failed to delete post');
		setPosts((prev) => prev.filter((p) => p.id !== id));
	}, []);

	return { posts, loading, refetch: loadPosts, remove };
}

export async function fetchBlogPost(id: string): Promise<BlogPost> {
	const res = await api.get(`${API_BASE}/admin/posts/${id}`);
	const json = (await res.json()) as { post: BlogPost; error?: string };
	if (!res.ok) throw new Error(json.error ?? 'Failed to fetch post');
	return json.post;
}

export async function saveBlogPost(id: string | null, payload: Partial<BlogPost>): Promise<BlogPost> {
	const isNew = !id;
	const res = isNew
		? await api.post(`${API_BASE}/admin/posts`, payload)
		: await api.put(`${API_BASE}/admin/posts/${id}`, payload);
	const json = (await res.json()) as { post: BlogPost; error?: string };
	if (!res.ok) throw new Error(json.error ?? 'Failed to save post');
	return json.post;
}
