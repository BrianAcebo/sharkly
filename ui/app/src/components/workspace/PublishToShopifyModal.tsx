/**
 * PublishToShopifyModal — One-click publish from Workspace to Shopify blog.
 * Requires site to have Shopify connected (Settings → Integrations).
 */

import React, { useState, useEffect } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Loader2, ShoppingBag, ExternalLink } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import { api } from '../../utils/api';
import { toast } from 'sonner';

interface Blog {
	id: string;
	title: string;
	handle: string;
}

interface Props {
	open: boolean;
	onClose: () => void;
	siteId: string;
	pageTitle: string;
	/** Returns current HTML when called (so we get latest editor content at publish time) */
	getBodyHtml: () => string;
	metaTitle: string | null;
	metaDescription: string | null;
	onSuccess?: () => void;
}

export function PublishToShopifyModal({
	open,
	onClose,
	siteId,
	pageTitle,
	getBodyHtml,
	metaTitle,
	metaDescription,
	onSuccess
}: Props) {
	const [blogs, setBlogs] = useState<Blog[]>([]);
	const [selectedBlogId, setSelectedBlogId] = useState<string>('');
	const [publishing, setPublishing] = useState(false);
	const [connected, setConnected] = useState<boolean | null>(null);
	const [loadingBlogs, setLoadingBlogs] = useState(false);

	useEffect(() => {
		if (!open || !siteId) return;
		let cancelled = false;
		(async () => {
			const { data: { session } } = await supabase.auth.getSession();
			if (!session) return;

			const statusRes = await api.get(`/api/shopify/status/${siteId}`);
			if (cancelled) return;

			if (!statusRes.ok) {
				setConnected(false);
				return;
			}
			const status = await statusRes.json();
			setConnected(status.connected);

			if (!status.connected) return;

			setLoadingBlogs(true);
			const blogsRes = await api.get(`/api/shopify/blogs/${siteId}`);
			if (cancelled) return;
			setLoadingBlogs(false);

			if (blogsRes.ok) {
				const data = await blogsRes.json();
				const list = data.blogs ?? [];
				setBlogs(list);
				if (list.length > 0 && !selectedBlogId) setSelectedBlogId(list[0].id);
			}
		})();
		return () => { cancelled = true; };
	}, [open, siteId]);

	const handlePublish = async () => {
		const bodyHtml = getBodyHtml();
		if (!selectedBlogId || !bodyHtml.trim()) {
			toast.error('Select a blog and ensure the article has content');
			return;
		}
		const { data: { session } } = await supabase.auth.getSession();
		if (!session) {
			toast.error('Not signed in');
			return;
		}

		setPublishing(true);
		try {
			const res = await api.post(`/api/shopify/publish/${siteId}`, {
				blogId: selectedBlogId,
				title: pageTitle,
				body_html: bodyHtml,
				meta_title: metaTitle || undefined,
				meta_description: metaDescription || undefined,
				published: true
			});

			const data = await res.json();
			if (!res.ok) {
				toast.error(data.error || 'Publish failed');
				return;
			}
			toast.success(`Published to Shopify: ${data.article?.title ?? pageTitle}`);
			onSuccess?.();
			onClose();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Publish failed');
		} finally {
			setPublishing(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<ShoppingBag className="size-5" />
						Publish to Shopify
					</DialogTitle>
					<DialogDescription>
						{connected === false ? (
							<>
								Connect Shopify in Sites: open your site details and connect the Shopify app there.
								<a
									href="/sites"
									className="ml-1 inline-flex items-center gap-0.5 text-brand-600 hover:underline dark:text-brand-400"
								>
									Open Sites <ExternalLink className="size-3" />
								</a>
							</>
						) : (
							'Choose the blog to publish this article to.'
						)}
					</DialogDescription>
				</DialogHeader>

				{connected === true && (
					<div className="space-y-4 py-4">
						{loadingBlogs ? (
							<div className="flex items-center gap-2 text-sm text-gray-500">
								<Loader2 className="size-4 animate-spin" />
								Loading blogs…
							</div>
						) : blogs.length === 0 ? (
							<p className="text-sm text-amber-600 dark:text-amber-400">
								No blogs found in this Shopify store. Create a blog in Shopify Admin first.
							</p>
						) : (
							<div>
								<Label>Blog</Label>
								<select
									value={selectedBlogId}
									onChange={(e) => setSelectedBlogId(e.target.value)}
									className="mt-1.5 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
								>
									{blogs.map((b) => (
										<option key={b.id} value={b.id}>
											{b.title}
										</option>
									))}
								</select>
							</div>
						)}
					</div>
				)}

				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Cancel
					</Button>
					{connected === true && blogs.length > 0 && (
						<Button
							onClick={handlePublish}
							disabled={publishing}
							className="bg-green-600 hover:bg-green-700 text-white"
						>
							{publishing ? (
								<><Loader2 className="mr-2 size-4 animate-spin" /> Publishing…</>
							) : (
								<><ShoppingBag className="mr-2 size-4" /> Publish to Shopify</>
							)}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
