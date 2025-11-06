import * as React from 'react';
import { useState, useEffect } from 'react';
import type { Case, SearchFilter } from '../../types/case';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import {
	ChevronLeft,
	ChevronRight,
	Calendar,
	Bookmark,
	Share2,
	MoreHorizontal,
	BookmarkCheck
} from 'lucide-react';
import { Link } from 'react-router';
import { Card, CardContent, CardFooter, CardHeader } from '../ui/card';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '../ui/dropdown-menu';
import { useCase } from '../../hooks/useCase';
import { archiveCase, unarchiveCase, updateCase } from '../../api/cases';
import EditCaseDialog from './EditCaseDialog';
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
import { deleteCase } from '../../api/cases';
import { UserAvatar } from '../common/UserAvatar';
import { toast } from 'sonner';
interface CaseSearchResultsProps {
	perPage: number;
	onChanged?: () => void;
}

export function CaseSearchResults({ perPage, onChanged }: CaseSearchResultsProps) {
	const { results, currentPage, setCurrentPage, filters, setFilters } = useCase();
	const [selectedResult, setSelectedResult] = useState<Case | null>(results?.results[0] ?? null);
	const [editingCase, setEditingCase] = useState<Case | null>(null);
	const [deleteId, setDeleteId] = useState<string | null>(null);

	useEffect(() => {
		setSelectedResult(results?.results[0] ?? null);
	}, [results]);

	const totalPages = Math.ceil(results.total / perPage);

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'active':
				return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900';
			case 'in_progress':
				return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900';
			case 'closed':
				return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900';
			default:
				return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900';
		}
	};

	const getSubjectTypeColor = (subject_type: 'person' | 'company' | null | undefined) => {
		switch (subject_type) {
			case 'person':
				return 'text-green-700 dark:text-green-400';
			case 'company':
				return 'text-blue-700 dark:text-blue-400';
			default:
				return 'text-gray-500 dark:text-gray-400';
		}
	};

	const getPriorityColor = (status: string) => {
		switch (status) {
			case 'low':
				return 'border-none text-green-700 dark:text-green-400';
			case 'medium':
				return 'border-none text-amber-700 dark:text-amber-400';
			case 'high':
				return 'border-none text-red-700 dark:text-red-400';
			case 'critical':
				return 'border-none text-red-900 dark:text-red-600';
		}
	};

	// Handle page change
	const handlePageChange = (page: number) => {
		setCurrentPage(page);
		// Scroll to top of results
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};

	const handleArchive = async (id: string) => {
		try {
			await archiveCase(id);
			onChanged?.();
		} catch (e) {
			toast.error('Error archiving case');
			console.error('Error archiving case:', e);
			// no-op
		}
	};

	const handleUnarchive = async (id: string) => {
		try {
			await unarchiveCase(id);
			onChanged?.();
		} catch (e) {
			toast.error('Error un-archiving case');
			console.error('Error un-archiving case:', e);
		}
	};

	const handleDelete = async () => {
		if (!deleteId) return;
		try {
			await deleteCase(deleteId);
			setDeleteId(null);
			onChanged?.();
		} catch (e) {
			toast.error('Error deleting case');
			console.error('Error deleting case:', e);
			// no-op
		}
	};

	const toggleImportant = async (c: Case) => {
		try {
			const current = (c.tags ?? []).slice();
			const idx = current.indexOf('important');
			if (idx >= 0) current.splice(idx, 1);
			else current.push('important');
			await updateCase(c.id, { tags: current });
			onChanged?.();
		} catch (e) {
			toast.error('Error toggling important');
			console.error('Toggle important failed', e);
		}
	};

	const applyInlineFilter = (update: Partial<SearchFilter>) => {
		setFilters({
			...filters,
			...update
		});
		setCurrentPage(1);
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};

	const handleCategoryFilter = (event: React.MouseEvent<HTMLButtonElement>, category?: string | null) => {
		event.stopPropagation();
		event.preventDefault();
		if (!category) return;
		const nextCategory = filters.category === category ? null : category;
		applyInlineFilter({ category: nextCategory });
	};

	const handleTagFilter = (event: React.MouseEvent<HTMLButtonElement>, tag: string) => {
		event.stopPropagation();
		event.preventDefault();
		const cleaned = tag.trim();
		if (!cleaned) return;
		const nextTag = filters.tag === cleaned ? null : cleaned;
		applyInlineFilter({ tag: nextTag });
	};

	if (results.results.length === 0) {
		return (
			<div className="bg-card flex flex-col items-center justify-center rounded-lg border p-8 text-center">
				<div className="bg-muted mb-4 flex h-20 w-20 items-center justify-center rounded-full">
					<SearchIcon className="h-10 w-10 text-gray-600 dark:text-gray-300" />
				</div>
				<h3 className="mb-2 text-xl font-semibold">No results found</h3>
				<p className="max-w-md text-gray-600 dark:text-gray-300">
					We couldn't find what you're looking for. Try adjusting your search terms or filters.
				</p>
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
			<div className="col-span-1 md:col-span-2">
				<div className="space-y-5">
					{results.results.map((result) => {
						const isCategoryActive = Boolean(result.category) && filters.category === result.category;
						return (
							<Card
								key={result.id}
								onClick={() => setSelectedResult(result)}
								className={`group cursor-pointer overflow-hidden transition-colors ${
									selectedResult?.id === result.id
										? 'ring-brand-800 ring-1 ring-offset-1 dark:bg-slate-800/30'
										: 'hover:ring-brand-800/50 hover:bg-slate-50 hover:ring-1 dark:hover:bg-slate-800/30'
								}`}
							>
							<CardHeader className="p-6">
								<div className="flex flex-col items-start justify-between gap-3 md:flex-row">
									<div className="flex items-center space-x-2">
										<UserAvatar
											user={{
												name: result.subject?.name || result.title || '?',
												avatar: result.subject?.avatar || null
											}}
											size="sm"
										/>
										<div>
											<p className="text-sm font-medium">{result.subject?.name}</p>
											<p className="text-xs text-gray-600 dark:text-gray-300">
												Updated:{' '}
												{formatDistanceToNow(new Date(result.updated_at), {
													addSuffix: true
												})}
											</p>
										</div>
									</div>
									<div className="flex w-full items-center justify-between md:w-fit">
										<div>
											<span className="flex items-center gap-2 text-sm capitalize">
												Type:
												<span className={`text-xs capitalize ${getSubjectTypeColor(result.subject_type)}`}>
													{result.subject_type}
												</span>
											</span>
										</div>

										<div className="mx-5 hidden h-5 w-[0.5px] border-r md:block"></div>

										<div>
											<span className="flex items-center gap-2 text-sm">
												Priority:
												<span className={`text-xs uppercase ${getPriorityColor(result.priority)}`}>
													{result.priority}
												</span>
											</span>
										</div>

										<div className="mx-5 hidden h-5 w-[0.5px] border-r md:block"></div>

										<div className="flex items-center justify-between">
											<Badge
												variant="outline"
												className={`text-xs capitalize ${getStatusColor(result.status)}`}
											>
												{result.status.replace('in_progress', 'In Progress')}
											</Badge>
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button variant="ghost" size="icon" className="ml-1 h-8 w-8">
														<MoreHorizontal className="h-4 w-4" />
														<span className="sr-only">More options</span>
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuItem onClick={() => setEditingCase(result)}>Edit</DropdownMenuItem>
													{result.archived_at ? (
														<DropdownMenuItem onClick={() => handleUnarchive(result.id)}>
															Unarchive
														</DropdownMenuItem>
													) : (
														<DropdownMenuItem onClick={() => handleArchive(result.id)}>
															Archive
														</DropdownMenuItem>
													)}
													<DropdownMenuItem onClick={() => setDeleteId(result.id)}>Delete</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</div>
									</div>
								</div>
							</CardHeader>
							<CardContent className="pt-0 pb-6">
								<div>
									<h3 className="mb-1 text-xl font-semibold transition-colors">{result.title}</h3>
									<p className="mb-2 text-gray-600 dark:text-gray-300">{result.description}</p>
									<p className="mb-2 text-sm text-gray-600 dark:text-gray-300">
										-{' '}
										{result.category ? (
											<button
												type="button"
												onClick={(event) => handleCategoryFilter(event, result.category)}
												className={`underline-offset-2 transition-colors hover:underline ${
													isCategoryActive
														? 'text-blue-800 dark:text-blue-300'
														: 'text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300'
												}`}
												title={`Filter by category: ${result.category}`}
											>
												{result.category}
											</button>
										) : (
											<span className="text-gray-400 dark:text-gray-500">Uncategorized</span>
										)}
									</p>
								</div>
							</CardContent>
							<Separator />
							<CardFooter className="flex items-center justify-between p-3">
								<div className="flex flex-wrap gap-2">
									{result.tags && result.tags.length > 0 ? (
										result.tags.map((tag, idx) => {
											const isActiveTag = filters.tag === tag;
											return (
												<button
													type="button"
													key={tag + idx}
													onClick={(event) => handleTagFilter(event, tag)}
													className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
														isActiveTag
															? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400'
															: 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30'
													}`}
													title={`Filter by tag: #${tag}`}
												>
													#{tag}
												</button>
											);
										})
									) : (
										<span className="text-xs text-gray-400">No tags</span>
									)}
								</div>
								<div className="flex space-x-1">
									<Button
										variant="ghost"
										size="icon"
										className={`h-8 w-8 ${result.tags?.includes('important') ? 'text-amber-600' : ''}`}
										onClick={() => toggleImportant(result)}
										title={
											result.tags?.includes('important') ? 'Unmark important' : 'Mark important'
										}
									>
										{result.tags?.includes('important') ? (
											<BookmarkCheck className="h-4 w-4" />
										) : (
											<Bookmark className="h-4 w-4" />
										)}
										<span className="sr-only">Toggle important</span>
									</Button>
									<Button variant="ghost" size="icon" className="h-8 w-8">
										<Share2 className="h-4 w-4" />
										<span className="sr-only">Share</span>
									</Button>
								</div>
							</CardFooter>
						</Card>
					);
					})}
				</div>

				{/* Pagination */}
				{totalPages > 1 && (
					<div className="mt-6 flex items-center justify-between">
						<Button
							variant="outline"
							size="sm"
							onClick={() => handlePageChange(currentPage - 1)}
							disabled={currentPage === 1}
						>
							<ChevronLeft className="mr-2 h-4 w-4" />
							Previous
						</Button>
						<span className="text-sm text-gray-600 dark:text-gray-300">
							Page {currentPage} of {totalPages}
						</span>
						<Button
							variant="outline"
							size="sm"
							onClick={() => handlePageChange(currentPage + 1)}
							disabled={currentPage === totalPages}
						>
							Next
							<ChevronRight className="ml-2 h-4 w-4" />
						</Button>
					</div>
				)}
			</div>

			{/* Details panel */}
			<div className="col-span-1 md:block">
				{selectedResult ? (
					<Card className="animate-in slide-in-from-right-5 sticky top-24 duration-200">
						<CardHeader>
							<div className="flex items-center justify-between gap-5">
								<h3 className="text-xl font-semibold">{selectedResult.title}</h3>
								<div className="flex flex-col items-end gap-2">
									<Badge
										variant="outline"
										className={`capitalize ${getStatusColor(selectedResult.status)}`}
									>
										{selectedResult.status.replace('in_progress', 'In Progress')}
									</Badge>
									<span className="flex text-sm">
										Priority:
										<span>
											<Badge
												variant="outline"
												className={`uppercase ${getPriorityColor(selectedResult.priority)}`}
											>
												{selectedResult.priority}
											</Badge>
										</span>
									</span>
								</div>
							</div>
						</CardHeader>
						<Separator />
						<CardContent className="pt-4">
							<div className="mb-4 flex items-center space-x-3">
								<UserAvatar
									user={{
										name: selectedResult.subject?.name || selectedResult.title || '?',
										avatar: selectedResult.subject?.avatar || null
									}}
									size="lg"
								/>
								<div>
									<p className="font-medium">{selectedResult.subject?.name}</p>
									<p className="text-sm text-gray-600 capitalize dark:text-gray-300">
										{selectedResult.subject?.type}
									</p>
								</div>
							</div>

							<p className="mb-4 text-gray-600 dark:text-gray-300">{selectedResult.description}</p>

							<div className="mb-4 grid grid-cols-2 gap-4">
								<div className="flex flex-col space-y-1">
									<span className="text-xs text-gray-600 dark:text-gray-300">Category</span>
									<span className="font-medium">{selectedResult.category}</span>
								</div>
								<div className="flex flex-col space-y-1">
									<span className="text-xs text-gray-600 dark:text-gray-300">Created</span>
									<span className="font-medium">
										{new Date(selectedResult.created_at).toLocaleDateString()}
									</span>
								</div>
								<div className="flex flex-col space-y-1">
									<span className="text-xs text-gray-600 dark:text-gray-300">Tags</span>
									<div className="flex flex-wrap gap-2">
										{selectedResult.tags && selectedResult.tags.length > 0 ? (
							selectedResult.tags.map((tag, idx) => (
								<span
									key={tag + idx}
									className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
								>
									#{tag}
								</span>
							))
										) : (
											<span className="text-xs text-gray-400">No tags</span>
										)}
									</div>
									<EditCaseDialog
										open={Boolean(editingCase)}
										onOpenChange={(v) => !v && setEditingCase(null)}
										caseData={editingCase || results.results[0]}
										onUpdated={onChanged}
									/>
									<AlertDialog
										open={Boolean(deleteId)}
										onOpenChange={(v) => !v && setDeleteId(null)}
									>
										<AlertDialogContent>
											<AlertDialogHeader>
												<AlertDialogTitle>Delete case?</AlertDialogTitle>
												<AlertDialogDescription>
													This action permanently deletes the case and cannot be undone.
												</AlertDialogDescription>
											</AlertDialogHeader>
											<AlertDialogFooter>
												<AlertDialogCancel>Cancel</AlertDialogCancel>
												<AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
											</AlertDialogFooter>
										</AlertDialogContent>
									</AlertDialog>
								</div>
								<div className="flex flex-col space-y-1">
									<span className="text-xs text-gray-600 dark:text-gray-300">Last Updated</span>
									<div className="flex items-center text-sm">
										<Calendar className="mr-2 h-4 w-4 text-gray-600 dark:text-gray-300" />
										<span>{new Date(selectedResult.updated_at).toLocaleString()}</span>
									</div>
								</div>
							</div>
						</CardContent>
						<Separator />
						<CardFooter className="flex justify-end pt-4">
							<Link to={`/cases/${selectedResult.id}`}>
								<Button variant="outline">View Details</Button>
							</Link>
						</CardFooter>
					</Card>
				) : (
					<Card className="bg-muted/40 flex h-[400px] items-center justify-center border-dashed p-8 text-center">
						<div className="max-w-sm">
							<h3 className="mb-2 text-lg font-medium">No item selected</h3>
							<p className="text-sm text-gray-600 dark:text-gray-300">
								Select an item from the search results to view its details here.
							</p>
						</div>
					</Card>
				)}
			</div>
		</div>
	);
}

function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg
			{...props}
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<circle cx="11" cy="11" r="8" />
			<path d="m21 21-4.3-4.3" />
		</svg>
	);
}
