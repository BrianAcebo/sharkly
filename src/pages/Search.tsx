import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
	AlertTriangle,
	Clock,
	ExternalLink,
	Globe,
	Loader2,
	Search as SearchIcon,
	ShieldCheck,
	Filter,
	ChevronDown,
	Plus
} from 'lucide-react';

import PageMeta from '../components/common/PageMeta';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '../components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import { useBreadcrumbs } from '../hooks/useBreadcrumbs';
import { useAuth } from '../hooks/useAuth';
import { api } from '../utils/api';
import { UserAvatar } from '../components/common/UserAvatar';
import { Checkbox } from '../components/ui/checkbox';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '../components/ui/dialog';
import { listPeople, appendPersonWebMentions } from '../api/people';
import { listBusinesses, appendBusinessWebMentions } from '../api/businesses';
import { toast } from 'sonner';
import { supabase } from '../utils/supabaseClient';

interface SearchResultItem {
	title: string | null;
	link: string | null;
	snippet: string | null;
	htmlSnippet: string | null;
	displayLink: string | null;
	formattedUrl: string | null;
	cacheId: string | null;
	thumbnail: string | null;
	image: string | null;
	favicon: string | null;
	meta?: Record<string, string | undefined>;
}

interface SearchApiResponse {
	query: string;
	page: number;
	perPage: number;
	totalResults: number;
	searchTime: number;
	items: SearchResultItem[];
	nextPage: number | null;
	previousPage: number | null;
}

interface SearchMetadata {
	totalResults: number;
	searchTime: number;
	perPage: number;
	nextPage: number | null;
	previousPage: number | null;
}

const formatNumber = (value: number) => new Intl.NumberFormat().format(value);

const Search = () => {
	const { session, user } = useAuth();
	const { setTitle } = useBreadcrumbs();

	const [query, setQuery] = useState('');
	const [submittedQuery, setSubmittedQuery] = useState('');
	const [results, setResults] = useState<SearchResultItem[]>([]);
	const [metadata, setMetadata] = useState<SearchMetadata | null>(null);
	const [page, setPage] = useState(1);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [hasSearched, setHasSearched] = useState(false);
	const [safeSearch, setSafeSearch] = useState(true);
	const [filtersOpen, setFiltersOpen] = useState(false);
	const [timeRange, setTimeRange] = useState<'any' | 'd1' | 'w1' | 'm1' | 'y1'>('any');
	const [fileType, setFileType] = useState('');
	const [siteSearch, setSiteSearch] = useState('');
	const [languageRestriction, setLanguageRestriction] = useState('');
	const [exactTerms, setExactTerms] = useState('');
	const [excludeTerms, setExcludeTerms] = useState('');
	const [orTerms, setOrTerms] = useState('');
	const [andTerms, setAndTerms] = useState('');
	const cacheRef = useRef<Map<string, SearchApiResponse>>(new Map());
	const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
	const [attachOpen, setAttachOpen] = useState(false);
	const [attachType, setAttachType] = useState<'person' | 'business' | 'email'>('person');
	const [entitySearch, setEntitySearch] = useState('');
	const [entityOptions, setEntityOptions] = useState<
		Array<{ id: string; name: string; avatar?: string | null }>
	>([]);
	const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
	const [selectedEntityName, setSelectedEntityName] = useState<string>('');

	const getCacheKey = useCallback(
		(searchQuery: string, pageNumber: number, safe: boolean) => {
			const filterKey = [
				timeRange || 'any',
				fileType || '-',
				siteSearch || '-',
				languageRestriction || '-',
				exactTerms || '-',
				excludeTerms || '-',
				orTerms || '-'
			].join('|');
			return `${safe ? '1' : '0'}|${searchQuery}|${pageNumber}|${filterKey}`;
		},
		[timeRange, fileType, siteSearch, languageRestriction, exactTerms, excludeTerms, orTerms]
	);

	const applySearchData = useCallback((data: SearchApiResponse) => {
		setResults(data.items ?? []);
		setMetadata({
			totalResults: data.totalResults,
			searchTime: data.searchTime,
			perPage: data.perPage,
			nextPage: data.nextPage,
			previousPage: data.previousPage
		});
		setPage(data.page);
		setHasSearched(true);
		setError(null);
	}, []);

	useEffect(() => {
		setTitle('Search');
	}, [setTitle]);

	const fetchResults = useCallback(
		async (searchQuery: string, pageNumber = 1, safe = safeSearch) => {
			const token = session?.access_token;

			if (!token) {
				setError('You must be signed in to perform searches.');
				return;
			}

			const trimmedQuery = searchQuery.trim();
			if (!trimmedQuery) {
				setError('Enter a search query to continue.');
				return;
			}

			setIsLoading(true);
			setError(null);
			setSubmittedQuery(trimmedQuery);

			const params = new URLSearchParams({ q: trimmedQuery });
			if (pageNumber > 1) {
				params.set('page', pageNumber.toString());
			}
			if (safe) {
				params.set('safe', 'active');
			}
			if (timeRange !== 'any') {
				params.set('dateRestrict', timeRange);
			}
			if (fileType) {
				params.set('fileType', fileType);
			}
			if (siteSearch) {
				params.set('siteSearch', siteSearch);
			}
			if (languageRestriction) {
				params.set('languageRestriction', languageRestriction);
			}
			if (exactTerms) {
				params.set('exactTerms', exactTerms);
			}
			if (excludeTerms) {
				params.set('excludeTerms', excludeTerms);
			}
			if (orTerms) {
				params.set('orTerms', orTerms);
			}

			try {
				const response = await api.get(`/api/search?${params.toString()}`, {
					headers: {
						Authorization: `Bearer ${token}`
					}
				});

				if (!response.ok) {
					let message = 'Failed to fetch search results.';
					try {
						const errorBody = await response.json();
						message = errorBody?.error?.message ?? message;
					} catch {
						// Non-JSON error response
					}
					throw new Error(message);
				}

				const data = (await response.json()) as SearchApiResponse;

				cacheRef.current.set(getCacheKey(trimmedQuery, data.page, safe), data);
				applySearchData(data);
			} catch (requestError) {
				console.error('Search request failed', requestError);
				setError(
					requestError instanceof Error ? requestError.message : 'Failed to fetch search results.'
				);
				setResults([]);
				setMetadata(null);
				setHasSearched(true);
			} finally {
				setIsLoading(false);
			}
		},
		[applySearchData, getCacheKey, safeSearch, session?.access_token]
	);

	const handleSubmit = useCallback(
		async (event: FormEvent<HTMLFormElement>) => {
			event.preventDefault();
			await fetchResults(query, 1, safeSearch);
		},
		[fetchResults, query, safeSearch]
	);

	const handlePageChange = useCallback(
		async (targetPage: number) => {
			if (!submittedQuery) {
				return;
			}

			if (targetPage < page) {
				const cached = cacheRef.current.get(getCacheKey(submittedQuery, targetPage, safeSearch));
				if (cached) {
					applySearchData(cached);
					return;
				}
			}

			await fetchResults(submittedQuery, targetPage, safeSearch);
		},
		[applySearchData, fetchResults, getCacheKey, page, safeSearch, submittedQuery]
	);

	const handleSafeSearchToggle = useCallback(
		async (checked: boolean) => {
			setSafeSearch(checked);
			if (submittedQuery) {
				await fetchResults(submittedQuery, 1, checked);
			}
		},
		[fetchResults, submittedQuery]
	);

	const handleAutoRefetch = useCallback(async () => {
		if (submittedQuery) {
			await fetchResults(submittedQuery, 1, safeSearch);
		}
	}, [fetchResults, submittedQuery, safeSearch]);

	const clearFilters = useCallback(async () => {
		setTimeRange('any');
		setFileType('');
		setSiteSearch('');
		setLanguageRestriction('');
		setExactTerms('');
		setExcludeTerms('');
		setOrTerms('');
		setAndTerms('');
		if (submittedQuery) {
			await fetchResults(submittedQuery, 1, safeSearch);
		}
	}, [fetchResults, safeSearch, submittedQuery]);

	const appendToQuery = useCallback((fragment: string) => {
		setQuery((current) => {
			const base = current.trim();
			return base ? `${base} ${fragment}` : fragment;
		});
	}, []);

	const addExactToQuery = useCallback(() => {
		const trimmed = exactTerms.trim();
		if (!trimmed) return;
		const quoted = trimmed.startsWith('"') && trimmed.endsWith('"') ? trimmed : `"${trimmed}"`;
		appendToQuery(quoted);
		setExactTerms('');
	}, [appendToQuery, exactTerms]);

	const addExcludeToQuery = useCallback(() => {
		const trimmed = excludeTerms.trim();
		if (!trimmed) return;
		const tokens = trimmed
			.split(/[,\s]+/)
			.map((t) => t.trim())
			.filter(Boolean)
			.map((t) =>
				t.includes(' ') && !(t.startsWith('"') && t.endsWith('"')) ? `-"${t}"` : `-${t}`
			);
		if (tokens.length) {
			appendToQuery(tokens.join(' '));
			setExcludeTerms('');
		}
	}, [appendToQuery, excludeTerms]);

	const addOrToQuery = useCallback(() => {
		const raw = orTerms.trim();
		if (!raw) return;
		let parts = raw
			.split(/\s+OR\s+/i)
			.map((p) => p.trim())
			.filter(Boolean);
		if (parts.length <= 1) {
			parts = raw
				.split(/[,|]+/)
				.map((p) => p.trim())
				.filter(Boolean);
		}
		if (parts.length) {
			const joined = `(${parts.join(' OR ')})`;
			appendToQuery(joined);
			setOrTerms('');
		}
	}, [appendToQuery, orTerms]);

	const addAndToQuery = useCallback(() => {
		const raw = andTerms.trim();
		if (!raw) return;
		let parts = raw
			.split(/\s+AND\s+/i)
			.map((p) => p.trim())
			.filter(Boolean);
		if (parts.length <= 1) {
			parts = raw
				.split(/[,|]+/)
				.map((p) => p.trim())
				.filter(Boolean);
		}
		if (parts.length) {
			const joined = `(${parts.join(' AND ')})`;
			appendToQuery(joined);
			setAndTerms('');
		}
	}, [appendToQuery, andTerms]);

	const hasResults = results.length > 0;
	const totalPages = useMemo(() => {
		if (!metadata?.totalResults || !metadata.perPage) {
			return 1;
		}
		return Math.ceil(metadata.totalResults / metadata.perPage);
	}, [metadata?.perPage, metadata?.totalResults]);

	return (
		<>
			<PageMeta
				title="Search"
				description="Search public web sources with Google Programmable Search directly from True Sight."
				noIndex
			/>

			<div className="space-y-6 min-h-screen-visible">
				<div className="space-y-1">
					<h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
						Investigative Search
					</h1>
					<p className="text-gray-600 dark:text-gray-400">
						Enrich your investigations with Google Programmable Search results, filtered through
						your workspace.
					</p>
				</div>

				<Card className="border border-dashed border-gray-200 dark:border-gray-800">
					<CardContent className="space-y-4 pt-6">
						<form className="flex flex-col gap-3 md:flex-row" onSubmit={handleSubmit}>
							<div className="relative flex-1">
								<Label htmlFor="search-query" className="sr-only">
									Search query
								</Label>
								<SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2" />
								<Input
									id="search-query"
									placeholder="Search the open web (people, companies, domains, reports...)"
									value={query}
									onChange={(event) => setQuery(event.target.value)}
									className="pl-10"
								/>
							</div>
							<div className="flex items-center gap-3 md:w-auto">
								<Button type="submit" size="lg" loading={isLoading} disabled={isLoading}>
									Search
								</Button>
							</div>
						</form>

						<Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
							<div className="flex items-center justify-between rounded-md border border-gray-200 bg-white/50 p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
								<div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
									<Filter className="h-4 w-4" />
									Filters
								</div>
								<CollapsibleTrigger asChild>
									<Button variant="outline" size="sm" type="button">
										{filtersOpen ? 'Hide' : 'Show'}
										<ChevronDown
											className={`ml-2 h-4 w-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`}
										/>
									</Button>
								</CollapsibleTrigger>
							</div>
							<CollapsibleContent className="mt-3 rounded-md border border-gray-200 bg-white/50 p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
								<div className="mt-3 flex items-center justify-end">
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={clearFilters}
										disabled={isLoading}
									>
										Clear filters
									</Button>
								</div>
								<div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
									<div className="space-y-1">
										<Label className="text-xs">Time</Label>
										<Select
											value={timeRange}
											onValueChange={async (v) => {
												setTimeRange(v as typeof timeRange);
												await handleAutoRefetch();
											}}
										>
											<SelectTrigger>
												<SelectValue placeholder="Any time" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="any">Any time</SelectItem>
												<SelectItem value="d1">Past 24 hours</SelectItem>
												<SelectItem value="w1">Past week</SelectItem>
												<SelectItem value="m1">Past month</SelectItem>
												<SelectItem value="y1">Past year</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div className="space-y-1">
										<Label className="text-xs">File type</Label>
										<Select
											value={fileType || 'any'}
											onValueChange={async (v) => {
												setFileType(v === 'any' ? '' : v);
												await handleAutoRefetch();
											}}
										>
											<SelectTrigger>
												<SelectValue placeholder="Any" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="any">Any</SelectItem>
												<SelectItem value="pdf">PDF (.pdf)</SelectItem>
												<SelectItem value="doc">Word (.doc)</SelectItem>
												<SelectItem value="docx">Word (.docx)</SelectItem>
												<SelectItem value="ppt">PowerPoint (.ppt)</SelectItem>
												<SelectItem value="pptx">PowerPoint (.pptx)</SelectItem>
												<SelectItem value="xls">Excel (.xls)</SelectItem>
												<SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
												<SelectItem value="csv">CSV (.csv)</SelectItem>
												<SelectItem value="txt">Text (.txt)</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div className="space-y-1">
										<Label htmlFor="site-search" className="text-xs">
											Site or domain
										</Label>
										<div className="flex gap-2">
											<Input
												id="site-search"
												placeholder="example.com or sub.example.com"
												value={siteSearch}
												onChange={async (e) => {
													setSiteSearch(e.target.value);
												}}
												onBlur={handleAutoRefetch}
											/>
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() =>
													siteSearch.trim() && appendToQuery(`site:${siteSearch.trim()}`)
												}
											>
												<Plus className="size-3" />
											</Button>
											<Button
												type="button"
												variant="outline"
												className="text-xs"
												size="sm"
												onClick={() =>
													siteSearch.trim() && appendToQuery(`AND site:${siteSearch.trim()}`)
												}
											>
												AND
											</Button>
											<Button
												type="button"
												variant="outline"
												className="text-xs"
												size="sm"
												onClick={() =>
													siteSearch.trim() && appendToQuery(`OR site:${siteSearch.trim()}`)
												}
											>
												OR
											</Button>
										</div>
									</div>
								</div>
								<div className="mt-6">
									<Collapsible>
										<div className="flex items-center justify-between rounded-md border border-gray-200 bg-white/60 p-3 text-sm font-medium text-gray-700 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-200">
											Advanced operators
											<CollapsibleTrigger asChild>
												<Button type="button" variant="outline" size="sm">
													Show
												</Button>
											</CollapsibleTrigger>
										</div>
										<CollapsibleContent className="mt-3 space-y-3 text-sm">
											<div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
												<div className="space-y-1">
													<Label className="text-xs">Exact phrase</Label>
													<div className="flex gap-2">
														<Input
															placeholder={'"exact phrase"'}
															value={exactTerms}
															onChange={(e) => setExactTerms(e.target.value)}
														/>
														<Button
															type="button"
															variant="outline"
															size="sm"
															onClick={addExactToQuery}
														>
															<Plus className="size-3" />
														</Button>
													</div>
												</div>
												<div className="space-y-1">
													<Label className="text-xs">Exclude (-)</Label>
													<div className="flex gap-2">
														<Input
															placeholder="word1 word2"
															value={excludeTerms}
															onChange={(e) => setExcludeTerms(e.target.value)}
														/>
														<Button
															type="button"
															variant="outline"
															size="sm"
															onClick={addExcludeToQuery}
														>
															<Plus className="size-3" />
														</Button>
													</div>
												</div>
												<div className="space-y-1">
													<Label className="text-xs">OR group</Label>
													<div className="flex gap-2">
														<Input
															placeholder="alpha, beta"
															value={orTerms}
															onChange={(e) => setOrTerms(e.target.value)}
														/>
														<Button
															type="button"
															variant="outline"
															size="sm"
															onClick={addOrToQuery}
														>
															<Plus className="size-3" />
														</Button>
													</div>
												</div>
												<div className="space-y-1">
													<Label className="text-xs">AND group</Label>
													<div className="flex gap-2">
														<Input
															placeholder="alpha, beta"
															value={andTerms}
															onChange={(e) => setAndTerms(e.target.value)}
														/>
														<Button
															type="button"
															variant="outline"
															size="sm"
															onClick={addAndToQuery}
														>
															<Plus className="size-3" />
														</Button>
													</div>
												</div>
												<div className="space-y-1">
													<Label className="text-xs">Before date</Label>
													<div className="flex gap-2">
														<Input
															placeholder="YYYY-MM-DD"
															onKeyDown={(e) => {
																if (e.key === 'Enter') {
																	const v = (e.target as HTMLInputElement).value.trim();
																	if (v) {
																		appendToQuery(`before:${v}`);
																		(e.target as HTMLInputElement).value = '';
																	}
																}
															}}
														/>
														<Button
															type="button"
															variant="outline"
															size="sm"
															onClick={(e) => {
																const input = e.currentTarget.previousSibling as HTMLInputElement;
																const v = input?.value?.trim();
																if (v) {
																	appendToQuery(`before:${v}`);
																	input.value = '';
																}
															}}
														>
															<Plus className="size-3" />
														</Button>
													</div>
												</div>
												<div className="space-y-1">
													<Label className="text-xs">After date</Label>
													<div className="flex gap-2">
														<Input
															placeholder="YYYY-MM-DD"
															onKeyDown={(e) => {
																if (e.key === 'Enter') {
																	const v = (e.target as HTMLInputElement).value.trim();
																	if (v) {
																		appendToQuery(`after:${v}`);
																		(e.target as HTMLInputElement).value = '';
																	}
																}
															}}
														/>
														<Button
															type="button"
															variant="outline"
															size="sm"
															onClick={(e) => {
																const input = e.currentTarget.previousSibling as HTMLInputElement;
																const v = input?.value?.trim();
																if (v) {
																	appendToQuery(`after:${v}`);
																	input.value = '';
																}
															}}
														>
															<Plus className="size-3" />
														</Button>
													</div>
												</div>
												<div className="space-y-1">
													<Label className="text-xs">Cache</Label>
													<div className="flex gap-2">
														<Input
															placeholder="example.com/page"
															onKeyDown={(e) => {
																if (e.key === 'Enter') {
																	const v = (e.target as HTMLInputElement).value.trim();
																	if (v) {
																		appendToQuery(`cache:${v}`);
																		(e.target as HTMLInputElement).value = '';
																	}
																}
															}}
														/>
														<Button
															type="button"
															variant="outline"
															size="sm"
															onClick={(e) => {
																const input = e.currentTarget.previousSibling as HTMLInputElement;
																const v = input?.value?.trim();
																if (v) {
																	appendToQuery(`cache:${v}`);
																	input.value = '';
																}
															}}
														>
															<Plus className="size-3" />
														</Button>
													</div>
												</div>
												<div className="space-y-1">
													<Label className="text-xs">Related site</Label>
													<div className="flex gap-2">
														<Input
															placeholder="apple.com"
															onKeyDown={(e) => {
																if (e.key === 'Enter') {
																	const v = (e.target as HTMLInputElement).value.trim();
																	if (v) {
																		appendToQuery(`related:${v}`);
																		(e.target as HTMLInputElement).value = '';
																	}
																}
															}}
														/>
														<Button
															type="button"
															variant="outline"
															size="sm"
															onClick={(e) => {
																const input = e.currentTarget.previousSibling as HTMLInputElement;
																const v = input?.value?.trim();
																if (v) {
																	appendToQuery(`related:${v}`);
																	input.value = '';
																}
															}}
														>
															<Plus className="size-3" />
														</Button>
													</div>
												</div>
												<div className="space-y-1">
													<Label className="text-xs">Title (intitle)</Label>
													<div className="flex gap-2">
														<Input
															placeholder="word"
															onKeyDown={(e) => {
																if (e.key === 'Enter') {
																	const v = (e.target as HTMLInputElement).value.trim();
																	if (v) {
																		appendToQuery(`intitle:${v}`);
																		(e.target as HTMLInputElement).value = '';
																	}
																}
															}}
														/>
														<Button
															type="button"
															variant="outline"
															size="sm"
															onClick={(e) => {
																const input = e.currentTarget.previousSibling as HTMLInputElement;
																const v = input?.value?.trim();
																if (v) {
																	appendToQuery(`intitle:${v}`);
																	input.value = '';
																}
															}}
														>
															<Plus className="size-3" />
														</Button>
													</div>
												</div>
												<div className="space-y-1">
													<Label className="text-xs">All in title</Label>
													<div className="flex gap-2">
														<Input
															placeholder="alpha beta"
															onKeyDown={(e) => {
																if (e.key === 'Enter') {
																	const v = (e.target as HTMLInputElement).value.trim();
																	if (v) {
																		appendToQuery(`allintitle:${v}`);
																		(e.target as HTMLInputElement).value = '';
																	}
																}
															}}
														/>
														<Button
															type="button"
															variant="outline"
															size="sm"
															onClick={(e) => {
																const input = e.currentTarget.previousSibling as HTMLInputElement;
																const v = input?.value?.trim();
																if (v) {
																	appendToQuery(`allintitle:${v}`);
																	input.value = '';
																}
															}}
														>
															<Plus className="size-3" />
														</Button>
													</div>
												</div>
												<div className="space-y-1">
													<Label className="text-xs">In URL</Label>
													<div className="flex gap-2">
														<Input
															placeholder="word"
															onKeyDown={(e) => {
																if (e.key === 'Enter') {
																	const v = (e.target as HTMLInputElement).value.trim();
																	if (v) {
																		appendToQuery(`inurl:${v}`);
																		(e.target as HTMLInputElement).value = '';
																	}
																}
															}}
														/>
														<Button
															type="button"
															variant="outline"
															size="sm"
															onClick={(e) => {
																const input = e.currentTarget.previousSibling as HTMLInputElement;
																const v = input?.value?.trim();
																if (v) {
																	appendToQuery(`inurl:${v}`);
																	input.value = '';
																}
															}}
														>
															<Plus className="size-3" />
														</Button>
													</div>
												</div>
												<div className="space-y-1">
													<Label className="text-xs">All in URL</Label>
													<div className="flex gap-2">
														<Input
															placeholder="alpha beta"
															onKeyDown={(e) => {
																if (e.key === 'Enter') {
																	const v = (e.target as HTMLInputElement).value.trim();
																	if (v) {
																		appendToQuery(`allinurl:${v}`);
																		(e.target as HTMLInputElement).value = '';
																	}
																}
															}}
														/>
														<Button
															type="button"
															variant="outline"
															size="sm"
															onClick={(e) => {
																const input = e.currentTarget.previousSibling as HTMLInputElement;
																const v = input?.value?.trim();
																if (v) {
																	appendToQuery(`allinurl:${v}`);
																	input.value = '';
																}
															}}
														>
															<Plus className="size-3" />
														</Button>
													</div>
												</div>
												<div className="space-y-1">
													<Label className="text-xs">In text</Label>
													<div className="flex gap-2">
														<Input
															placeholder="word"
															onKeyDown={(e) => {
																if (e.key === 'Enter') {
																	const v = (e.target as HTMLInputElement).value.trim();
																	if (v) {
																		appendToQuery(`intext:${v}`);
																		(e.target as HTMLInputElement).value = '';
																	}
																}
															}}
														/>
														<Button
															type="button"
															variant="outline"
															size="sm"
															onClick={(e) => {
																const input = e.currentTarget.previousSibling as HTMLInputElement;
																const v = input?.value?.trim();
																if (v) {
																	appendToQuery(`intext:${v}`);
																	input.value = '';
																}
															}}
														>
															<Plus className="size-3" />
														</Button>
													</div>
												</div>
												<div className="space-y-1">
													<Label className="text-xs">All in text</Label>
													<div className="flex gap-2">
														<Input
															placeholder="alpha beta"
															onKeyDown={(e) => {
																if (e.key === 'Enter') {
																	const v = (e.target as HTMLInputElement).value.trim();
																	if (v) {
																		appendToQuery(`allintext:${v}`);
																		(e.target as HTMLInputElement).value = '';
																	}
																}
															}}
														/>
														<Button
															type="button"
															variant="outline"
															size="sm"
															onClick={(e) => {
																const input = e.currentTarget.previousSibling as HTMLInputElement;
																const v = input?.value?.trim();
																if (v) {
																	appendToQuery(`allintext:${v}`);
																	input.value = '';
																}
															}}
														>
															<Plus className="size-3" />
														</Button>
													</div>
												</div>
												<div className="space-y-1">
													<Label className="text-xs">Language</Label>
													<Select
														value={languageRestriction || 'any'}
														onValueChange={async (v) => {
															setLanguageRestriction(v === 'any' ? '' : v);
															await handleAutoRefetch();
														}}
													>
														<SelectTrigger>
															<SelectValue placeholder="Any" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="any">Any</SelectItem>
															<SelectItem value="lang_en">English</SelectItem>
															<SelectItem value="lang_es">Spanish</SelectItem>
															<SelectItem value="lang_fr">French</SelectItem>
															<SelectItem value="lang_de">German</SelectItem>
															<SelectItem value="lang_pt">Portuguese</SelectItem>
														</SelectContent>
													</Select>
												</div>
											</div>

											<div className="rounded-md border border-dashed border-gray-200 p-3 text-xs text-gray-600 dark:border-gray-800 dark:text-gray-400">
												Tip: You can also type operators directly in the main search box, e.g.{' '}
												{`"apple iphone" (ipad OR iphone) site:apple.com filetype:pdf before:2010-01-01`}
												.
											</div>
										</CollapsibleContent>
									</Collapsible>
								</div>
							</CollapsibleContent>
						</Collapsible>

						<div className="flex flex-col gap-3 rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 md:flex-row md:items-center md:justify-between dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-300">
							<div className="flex items-center gap-3">
								<Switch
									id="safe-search"
									checked={safeSearch}
									onCheckedChange={handleSafeSearchToggle}
								/>
								<div>
									<Label
										htmlFor="safe-search"
										className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-200"
									>
										<ShieldCheck className="h-4 w-4 text-emerald-500" />
										Safe search
									</Label>
									<p className="text-xs text-gray-500 dark:text-gray-400">
										Filter adult content using Google&apos;s safe search controls.
									</p>
								</div>
							</div>
							<div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
								<Globe className="h-4 w-4" />
								Google Programmable Search API
							</div>
						</div>

						{error && (
							<div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950">
								<AlertTriangle className="mt-0.5 h-5 w-5" />
								<span>{error}</span>
							</div>
						)}

						{metadata && hasResults && (
							<div className="flex flex-wrap items-center gap-4 rounded-md border border-gray-200 bg-white/50 p-3 text-sm text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-300">
								<span>
									{formatNumber(metadata.totalResults)} results in {metadata.searchTime.toFixed(2)}{' '}
									seconds
								</span>
								<span className="flex items-center gap-1 text-xs tracking-wide text-gray-500 uppercase dark:text-gray-400">
									<Clock className="h-4 w-4" /> Page {page} of {formatNumber(totalPages)}
								</span>
							</div>
						)}

						{isLoading && (
							<div className="flex items-center justify-center gap-3 rounded-md border border-gray-200 bg-white/80 p-6 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-300">
								<Loader2 className="h-5 w-5 animate-spin" />
								Fetching intelligence...
							</div>
						)}

						{!isLoading && hasSearched && !hasResults && !error && (
							<div className="rounded-md border border-gray-200 bg-white/60 p-6 text-center text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-300">
								No results for{' '}
								<span className="font-medium text-gray-900 dark:text-gray-100">
									{submittedQuery}
								</span>
								. Try refining your query or removing filters.
							</div>
						)}

						{!isLoading && hasResults && (
							<div className="space-y-4">
								{selectedKeys.size > 0 && (
									<div className="flex items-center justify-between rounded-md border border-gray-200 bg-white/60 p-2 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-300">
										<span>{selectedKeys.size} selected</span>
										<Button size="sm" onClick={() => setAttachOpen(true)}>
											Attach to…
										</Button>
									</div>
								)}
								{results.map((item, index) => {
									const key = item.link ?? item.cacheId ?? `${item.title}-${index}`;
									const imageSource = item.thumbnail ?? item.image ?? null;
									const siteName =
										item.meta?.['og:site_name'] ?? item.displayLink ?? item.formattedUrl ?? '';

									return (
										<Card
											key={key}
											className="border border-gray-200 transition-shadow duration-200 hover:shadow-md dark:border-gray-800"
										>
											<CardContent className="flex flex-col gap-4 p-5 sm:flex-row">
												<div className="pt-1">
													<Checkbox
														checked={selectedKeys.has(key)}
														onCheckedChange={(checked) => {
															setSelectedKeys((prev) => {
																const next = new Set(prev);
																if (checked) next.add(key);
																else next.delete(key);
																return next;
															});
														}}
													/>
												</div>
												{imageSource && (
													<div className="w-full shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-100 sm:w-36 dark:border-gray-800 dark:bg-gray-900/40">
														<img
															src={imageSource}
															alt={item.title ?? siteName ?? 'Search result image'}
															className="h-24 w-full object-cover"
															loading="lazy"
														/>
													</div>
												)}

												<div className="flex flex-1 flex-col gap-3">
													<div className="flex items-start justify-between gap-3">
														<div className="flex flex-col gap-1">
															{siteName && (
																<span className="flex items-center gap-2 text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
																	{item.favicon && (
																		<img
																			src={item.favicon}
																			alt=""
																			className="h-4 w-4 rounded"
																			loading="lazy"
																		/>
																	)}
																	{siteName}
																</span>
															)}

															{item.link ? (
																<a
																	href={item.link}
																	target="_blank"
																	rel="noopener noreferrer"
																	className="group inline-flex items-center gap-2 text-lg font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
																>
																	<span>{item.title ?? item.link ?? 'Untitled result'}</span>
																	<ExternalLink className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
																</a>
															) : (
																<p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
																	{item.title ?? 'Untitled result'}
																</p>
															)}

															{item.displayLink && (
																<span className="text-xs text-gray-500 dark:text-gray-400">
																	{item.displayLink}
																</span>
															)}
														</div>
													</div>

													{item.snippet && (
														<p className="text-sm text-gray-700 dark:text-gray-300">
															{item.snippet}
														</p>
													)}

													{item.meta?.['og:description'] &&
														item.meta['og:description'] !== item.snippet && (
															<p className="text-xs text-gray-500 dark:text-gray-400">
																{item.meta['og:description']}
															</p>
														)}
												</div>
											</CardContent>
										</Card>
									);
								})}
							</div>
						)}

						{!isLoading && hasResults && metadata && (
							<div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 pt-4 text-sm md:flex-row dark:border-gray-800">
								<span className="text-gray-500 dark:text-gray-400">
									Page {page} of {formatNumber(totalPages)}
								</span>
								<div className="flex items-center gap-2">
									<Button
										variant="outline"
										size="sm"
										disabled={isLoading || !metadata.previousPage || page <= 1}
										onClick={() => metadata.previousPage && handlePageChange(metadata.previousPage)}
									>
										Previous
									</Button>
									<Button
										variant="outline"
										size="sm"
										disabled={isLoading || !metadata.nextPage || page >= totalPages}
										onClick={() => metadata.nextPage && handlePageChange(metadata.nextPage)}
									>
										Next
									</Button>
								</div>
							</div>
						)}
					</CardContent>
				</Card>

				<Dialog open={attachOpen} onOpenChange={setAttachOpen}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>
								Attach {selectedKeys.size} result{selectedKeys.size !== 1 ? 's' : ''} to…
							</DialogTitle>
						</DialogHeader>
						<div className="space-y-4">
							<div className="grid grid-cols-1 gap-3 md:grid-cols-3 space-y-3">
								<div>
									<Label className="text-xs">Entity type</Label>
									<Select
										value={attachType}
										onValueChange={(v) => {
											setAttachType(v as 'person' | 'business' | 'email');
											setEntitySearch('');
											setEntityOptions([]);
											setSelectedEntityId(null);
										}}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="person">Person</SelectItem>
											<SelectItem value="business">Business</SelectItem>
											<SelectItem value="email">Email (coming soon)</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className="md:col-span-2">
									<Label className="text-xs">Search</Label>
									<div className="flex gap-2">
										<Input
											value={entitySearch}
											onChange={async (e) => {
												const v = e.target.value;
												setEntitySearch(v);
												if (!v || v.trim().length < 2) {
													setEntityOptions([]);
													return;
												}
												try {
													if (attachType === 'person') {
														const { results } = await listPeople(
															user?.organization_id ?? '',
															v,
															1,
															10
														);
														setEntityOptions(
															results.map((r) => ({
																id: r.id,
																name: r.name,
																avatar: r.avatar ?? null
															}))
														);
													} else if (attachType === 'business') {
														const { results } = await listBusinesses(
															user?.organization_id ?? '',
															v,
															1,
															10
														);
														setEntityOptions(
															results.map((r) => ({
																id: r.id,
																name: r.name,
																avatar: (r as { avatar?: string | null }).avatar ?? null
															}))
														);
													}
												} catch {
													/* ignore */
												}
											}}
											placeholder={`Search ${attachType}…`}
										/>
									</div>
                  {entityOptions.length > 0 && (
									<div className="max-h-48 space-y-3 mt-3 overflow-auto rounded border border-gray-200 dark:border-gray-800">
										{entityOptions.map((opt) => (
											<button
												key={opt.id}
												type="button"
												className={`${selectedEntityId === opt.id ? 'border-l-4 border-blue-500' : ''} flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 ${selectedEntityId === opt.id ? 'bg-gray-50 dark:bg-gray-800' : ''}`}
												onClick={() => {
													setSelectedEntityId(opt.id);
													setSelectedEntityName(opt.name);
												}}
											>
												<UserAvatar
													user={{ name: opt.name, avatar: opt.avatar ?? null }}
													size="sm"
												/>
												<span>{opt.name}</span>
											</button>
										))}
									</div>
                  )}
								</div>
							</div>
						</div>
						<DialogFooter>
							<Button variant="outline" onClick={() => setAttachOpen(false)}>
								Cancel
							</Button>
							<Button
								onClick={async () => {
									if (!selectedEntityId) return;
									const selectedItems = results.filter((itm, idx) => {
										const key = itm.link ?? itm.cacheId ?? `${itm.title}-${idx}`;
										return selectedKeys.has(key);
									});
									const mentions = selectedItems.map((itm) => ({
										title: itm.title ?? null,
										link: itm.link ?? null,
										snippet: itm.snippet ?? null,
										displayLink: itm.displayLink ?? null,
										favicon: itm.favicon ?? null,
										image: itm.thumbnail ?? itm.image ?? null,
										source: 'google_pse',
										retrieved_at: new Date().toISOString()
									}));
                                    try {
                                        if (attachType === 'person') {
                                            await appendPersonWebMentions(selectedEntityId, mentions);
                                            // Log case activity for any cases whose subject is this person
                                            const { data: relatedCases } = await supabase
                                                .from('cases')
                                                .select('id,organization_id')
                                                .eq('subject_id', selectedEntityId)
                                                .eq('subject_type', 'person');
                                            if (Array.isArray(relatedCases) && relatedCases.length > 0) {
                                                const entries = relatedCases.map((c) => ({
                                                    case_id: c.id,
                                                    organization_id: c.organization_id,
                                                    actor_id: user?.id ?? null,
                                                    action: 'web_mentions_attached',
                                                    entity: 'person',
                                                    entity_id: selectedEntityId,
                                                    details: {
                                                        count: mentions.length,
                                                        sample_links: mentions
                                                            .map((m) => m.link)
                                                            .filter(Boolean)
                                                            .slice(0, 3)
                                                    }
                                                }));
                                                await supabase.from('case_audit_log').insert(entries);
                                            }
                                        } else if (attachType === 'business') {
                                            await appendBusinessWebMentions(selectedEntityId, mentions);
                                            const { data: relatedCases } = await supabase
                                                .from('cases')
                                                .select('id,organization_id')
                                                .eq('subject_id', selectedEntityId)
                                                .eq('subject_type', 'business');
                                            if (Array.isArray(relatedCases) && relatedCases.length > 0) {
                                                const entries = relatedCases.map((c) => ({
                                                    case_id: c.id,
                                                    organization_id: c.organization_id,
                                                    actor_id: user?.id ?? null,
                                                    action: 'web_mentions_attached',
                                                    entity: 'business',
                                                    entity_id: selectedEntityId,
                                                    details: {
                                                        count: mentions.length,
                                                        sample_links: mentions.map((m) => m.link).filter(Boolean).slice(0, 3)
                                                    }
                                                }));
                                                await supabase.from('case_audit_log').insert(entries);
                                            }
                                        }
										setAttachOpen(false);
										setSelectedKeys(new Set());

										toast.success(`Attached ${selectedKeys.size} result${selectedKeys.size !== 1 ? 's' : ''} to ${selectedEntityName}`);
									} catch {
										toast.error('Failed to attach results to entity');
                    console.error(error);
									}
								}}
								disabled={!selectedEntityId || selectedKeys.size === 0}
							>
								Attach
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>
		</>
	);
};

export default Search;
