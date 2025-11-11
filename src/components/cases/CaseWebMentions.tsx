import { useState, useEffect, useMemo, useCallback } from 'react';
import { Coins, Pencil, Plus, Search, Trash2, Zap } from 'lucide-react';
import { getActionCost, ActionKey, ENABLE_ACTION_FLAGS } from '../../constants/costs';
import { toast } from 'sonner';

import ComponentCard from '../common/ComponentCard';
import { supabase } from '../../utils/supabaseClient';
import { Button } from '../ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '../ui/dialog';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from '../ui/alert-dialog';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import {
	DropdownMenu,
	DropdownMenuLabel,
	DropdownMenuContent,
	DropdownMenuTrigger,
	DropdownMenuItem,
	DropdownMenuSeparator
} from '../ui/dropdown-menu';
import type { EntityType } from '../../types/entities';

type Mention = {
	title: string | null;
	link: string | null;
	snippet?: string | null;
	displayLink?: string | null;
	favicon?: string | null;
	image?: string | null;
	source?: string | null;
	retrieved_at?: string | null;
};

type MentionDraft = {
	title: string;
	link: string;
	snippet: string;
	displayLink: string;
	favicon: string;
	image: string;
	source: string;
	retrieved_at: string;
};

interface CaseWebMentionsProps {
	entity: {
		id: string;
		type: EntityType;
		name?: string;
	};
	allowManage?: boolean;
	showActions?: boolean;
	onSearchWebMentions?: () => void;
}

const pageSize = 6;

const createDraft = (mention?: Mention): MentionDraft => ({
	title: mention?.title ?? '',
	link: mention?.link ?? '',
	snippet: mention?.snippet ?? '',
	displayLink: mention?.displayLink ?? '',
	favicon: mention?.favicon ?? '',
	image: mention?.image ?? '',
	source: mention?.source ?? '',
	retrieved_at: mention?.retrieved_at ?? new Date().toISOString()
});

export default function CaseWebMentions({
	entity,
	allowManage = false,
	showActions = false,
	onSearchWebMentions
}: CaseWebMentionsProps) {
	const tableForType = useCallback((t: EntityType): string | null => {
		switch (t) {
			case 'person':
				return 'people';
			case 'business':
				return 'businesses';
			case 'property':
				return 'properties';
			case 'email':
				return 'emails';
			case 'phone':
				return 'phones';
			case 'username':
				return 'usernames';
			case 'social_profile':
				return 'social_profiles';
			case 'image':
				return 'images';
			case 'ip':
				return 'ip_addresses';
			case 'domain':
				return 'domains';
			case 'leak':
				return 'paste_leaks';
			case 'document':
				return 'documents';
			default:
				return null;
		}
	}, []);

	const [mentions, setMentions] = useState<Mention[]>([]);
	const [loading, setLoading] = useState(false);
	const [page, setPage] = useState(1);
	const [editing, setEditing] = useState<{
		mode: 'add' | 'edit';
		index: number | null;
		draft: MentionDraft;
	} | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	useEffect(() => {
		if (!entity.id) return;
		const table = tableForType(entity.type);
		if (!table) return;
		let isMounted = true;
		(async () => {
			setLoading(true);
			try {
				const { data, error } = await supabase
					.from(table)
					.select('web_mentions')
					.eq('id', entity.id)
					.single();
				if (error) throw error;
				if (isMounted) {
					setMentions(
						((data?.web_mentions as Mention[]) ?? []).map((mention) => ({
							...mention,
							title: mention?.title ?? null,
							link: mention?.link ?? null,
							snippet: mention?.snippet ?? null,
							displayLink: mention?.displayLink ?? null,
							favicon: mention?.favicon ?? null,
							image: mention?.image ?? null,
							source: mention?.source ?? null,
							retrieved_at: mention?.retrieved_at ?? null
						}))
					);
				}
			} catch (error) {
				console.error('Failed to load web mentions', error);
				toast.error('Failed to load web mentions.');
			} finally {
				if (isMounted) setLoading(false);
			}
		})();
		return () => {
			isMounted = false;
		};
	}, [entity.id, entity.type, tableForType]);

	const totalPages = useMemo(
		() => Math.max(1, Math.ceil(mentions.length / pageSize)),
		[mentions.length]
	);

	const visible = useMemo(
		() => mentions.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize),
		[mentions, page]
	);

	const persistMentions = useCallback(
		async (next: Mention[], successMessage: string) => {
			if (!entity.id) return false;
			const table = tableForType(entity.type);
			if (!table) return false;
			try {
				const { error } = await supabase
					.from(table)
					.update({ web_mentions: next })
					.eq('id', entity.id);
				if (error) throw error;
				setMentions(next);
				toast.success(successMessage);
				return true;
			} catch (error) {
				console.error('Failed to update web mentions', error);
				toast.error('Failed to update web mentions.');
				return false;
			} finally {
				setIsSaving(false);
				setIsDeleting(false);
			}
		},
		[entity.id, entity.type, tableForType]
	);

	const handleSaveDraft = async () => {
		if (!editing) return;
		const { draft, mode, index } = editing;
		const sanitized: Mention = {
			title: draft.title.trim() || null,
			link: draft.link.trim() || null,
			snippet: draft.snippet.trim() || null,
			displayLink: draft.displayLink.trim() || null,
			favicon: draft.favicon.trim() || null,
			image: draft.image.trim() || null,
			source: draft.source.trim() || null,
			retrieved_at: draft.retrieved_at
				? new Date(draft.retrieved_at).toISOString()
				: new Date().toISOString()
		};

		if (!sanitized.title && !sanitized.link) {
			toast.error('Provide at least a title or link.');
			return;
		}

		setIsSaving(true);
		const next = [...mentions];
		if (mode === 'add') {
			next.unshift(sanitized);
		} else if (index !== null && index >= 0 && index < next.length) {
			next[index] = sanitized;
		}
		const success = await persistMentions(
			next,
			mode === 'add' ? 'Web mention added.' : 'Web mention updated.'
		);
		if (success) {
			setEditing(null);
			setPage(1);
		}
	};

	const handleDelete = async () => {
		if (deleteIndex === null) return;
		setIsDeleting(true);
		const next = mentions.filter((_, idx) => idx !== deleteIndex);
		const success = await persistMentions(next, 'Web mention removed.');
		if (success) {
			setDeleteIndex(null);
			setPage((prev) => {
				const newTotal = Math.max(1, Math.ceil(next.length / pageSize));
				return Math.min(prev, newTotal);
			});
		}
	};

	if (!entity.id) return null;

	return (
		<ComponentCard>
			<div className="mb-4 flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<h3 className="text-lg font-semibold">Web Mentions</h3>
					{mentions.length > 0 && (
						<span className="text-xs text-gray-500">{mentions.length} saved</span>
					)}
				</div>
				<div className="flex items-center gap-2">
					{showActions && ENABLE_ACTION_FLAGS[ActionKey.SearchWebMentions] && (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button size="sm" variant="outline">
									<Zap className="size-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuLabel>Perform Action</DropdownMenuLabel>
								<div className="flex justify-between gap-2">
									<div>
										<DropdownMenuItem
											className="group flex cursor-pointer items-center justify-between gap-2"
											onClick={onSearchWebMentions}
										>
											Search web mentions{' '}
											<Search className="invisible mr-2 size-3 text-gray-500 transition-all duration-200 group-hover:visible group-hover:translate-x-1" />
										</DropdownMenuItem>
									</div>
									<div className="w-20">
										<DropdownMenuItem disabled>
											<span className="border-l pl-3 text-sm">
												{getActionCost(ActionKey.SearchWebMentions)} <Coins className="ml-0.5 inline-block size-3" />
											</span>
										</DropdownMenuItem>
									</div>
								</div>
								<DropdownMenuSeparator />
								<DropdownMenuItem disabled>Actions will run for "{entity.name}"</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					)}
					{allowManage && (
						<Button
							size="sm"
							variant="outline"
							onClick={() => setEditing({ mode: 'add', index: null, draft: createDraft() })}
						>
							<Plus className="size-4" />
						</Button>
					)}
				</div>
			</div>
			{loading ? (
				<div className="text-sm text-gray-500">Loading…</div>
			) : mentions.length === 0 ? (
				<div className="text-sm text-gray-500">No web mentions saved for this subject.</div>
			) : (
				<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
					{visible.map((m, idx) => {
						const globalIndex = (page - 1) * pageSize + idx;
						return (
							<div
								key={(m.link ?? 'mention') + globalIndex}
								className="flex gap-3 rounded border p-3 hover:bg-gray-50 dark:hover:bg-gray-800"
							>
								<a
									href={m.link ?? undefined}
									target="_blank"
									rel="noopener noreferrer"
									className="flex flex-1 gap-3"
								>
									{m.image ? (
										<img src={m.image} alt="" className="h-12 w-12 rounded object-cover" />
									) : (
										<div className="h-12 w-12 rounded bg-gray-200 dark:bg-gray-700" />
									)}
									<div className="flex-1">
										<div className="line-clamp-2 text-sm font-medium">
											{m.title || m.link || 'Untitled result'}
										</div>
										<div className="text-xs text-gray-500">{m.displayLink || m.link}</div>
										{m.snippet && (
											<div className="mt-1 line-clamp-3 text-xs text-gray-600 dark:text-gray-400">
												{m.snippet}
											</div>
										)}
										{m.source && (
											<div className="mt-2 text-[11px] tracking-wide text-gray-400 uppercase">
												Source: {m.source}
											</div>
										)}
									</div>
								</a>
								{allowManage && (
									<div className="flex items-start gap-1">
										<Button
											variant="ghost"
											size="icon"
											className="text-gray-500 hover:text-gray-900"
											onClick={() =>
												setEditing({
													mode: 'edit',
													index: globalIndex,
													draft: createDraft(mentions[globalIndex])
												})
											}
										>
											<Pencil className="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											className="text-red-500 hover:text-red-600"
											onClick={() => setDeleteIndex(globalIndex)}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}
			{mentions.length > pageSize && (
				<div className="mt-3 flex items-center justify-between">
					<button
						className="text-sm text-gray-600 disabled:opacity-50"
						disabled={page <= 1}
						onClick={() => setPage((p) => Math.max(1, p - 1))}
					>
						Previous
					</button>
					<span className="text-xs text-gray-500">
						Page {page} of {totalPages}
					</span>
					<button
						className="text-sm text-gray-600 disabled:opacity-50"
						disabled={page >= totalPages}
						onClick={() => setPage((p) => p + 1)}
					>
						Next
					</button>
				</div>
			)}

			<Dialog
				open={Boolean(editing)}
				onOpenChange={(open) => !open && !isSaving && setEditing(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{editing?.mode === 'add' ? 'Add web mention' : 'Edit web mention'}
						</DialogTitle>
						<DialogDescription>Update the saved details for this web mention.</DialogDescription>
					</DialogHeader>
					<div className="space-y-3">
						<div>
							<Label className="text-xs text-gray-500 uppercase">Title</Label>
							<Input
								value={editing?.draft.title ?? ''}
								onChange={(e) =>
									setEditing((cur) =>
										cur ? { ...cur, draft: { ...cur.draft, title: e.target.value } } : cur
									)
								}
							/>
						</div>
						<div>
							<Label className="text-xs text-gray-500 uppercase">Link</Label>
							<Input
								placeholder="https://example.com"
								value={editing?.draft.link ?? ''}
								onChange={(e) =>
									setEditing((cur) =>
										cur ? { ...cur, draft: { ...cur.draft, link: e.target.value } } : cur
									)
								}
							/>
						</div>
						<div>
							<Label className="text-xs text-gray-500 uppercase">Display link</Label>
							<Input
								value={editing?.draft.displayLink ?? ''}
								onChange={(e) =>
									setEditing((cur) =>
										cur ? { ...cur, draft: { ...cur.draft, displayLink: e.target.value } } : cur
									)
								}
							/>
						</div>
						<div>
							<Label className="text-xs text-gray-500 uppercase">Snippet</Label>
							<Textarea
								rows={3}
								value={editing?.draft.snippet ?? ''}
								onChange={(e) =>
									setEditing((cur) =>
										cur ? { ...cur, draft: { ...cur.draft, snippet: e.target.value } } : cur
									)
								}
							/>
						</div>
						<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
							<div>
								<Label className="text-xs text-gray-500 uppercase">Image URL</Label>
								<Input
									value={editing?.draft.image ?? ''}
									onChange={(e) =>
										setEditing((cur) =>
											cur ? { ...cur, draft: { ...cur.draft, image: e.target.value } } : cur
										)
									}
								/>
							</div>
							<div>
								<Label className="text-xs text-gray-500 uppercase">Favicon URL</Label>
								<Input
									value={editing?.draft.favicon ?? ''}
									onChange={(e) =>
										setEditing((cur) =>
											cur ? { ...cur, draft: { ...cur.draft, favicon: e.target.value } } : cur
										)
									}
								/>
							</div>
						</div>
						<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
							<div>
								<Label className="text-xs text-gray-500 uppercase">Source</Label>
								<Input
									value={editing?.draft.source ?? ''}
									onChange={(e) =>
										setEditing((cur) =>
											cur ? { ...cur, draft: { ...cur.draft, source: e.target.value } } : cur
										)
									}
								/>
							</div>
							<div>
								<Label className="text-xs text-gray-500 uppercase">Retrieved at</Label>
								<Input
									type="datetime-local"
									value={editing?.draft.retrieved_at ? editing.draft.retrieved_at.slice(0, 19) : ''}
									onChange={(e) =>
										setEditing((cur) =>
											cur ? { ...cur, draft: { ...cur.draft, retrieved_at: e.target.value } } : cur
										)
									}
								/>
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => !isSaving && setEditing(null)}
							disabled={isSaving}
						>
							Cancel
						</Button>
						<Button onClick={handleSaveDraft} disabled={isSaving}>
							{isSaving ? 'Saving…' : 'Save'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<AlertDialog
				open={deleteIndex !== null}
				onOpenChange={(open) => !open && !isDeleting && setDeleteIndex(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Remove web mention?</AlertDialogTitle>
						<AlertDialogDescription>
							This will remove the mention from the saved list.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
							{isDeleting ? 'Removing…' : 'Remove'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</ComponentCard>
	);
}
