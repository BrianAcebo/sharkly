import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { AlertTriangle, Clock, ExternalLink, Globe, Loader2, Search as SearchIcon, ShieldCheck } from 'lucide-react';

import PageMeta from '../components/common/PageMeta';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { useBreadcrumbs } from '../hooks/useBreadcrumbs';
import { useAuth } from '../hooks/useAuth';
import { api } from '../utils/api';

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
  const { session } = useAuth();
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
  const cacheRef = useRef<Map<string, SearchApiResponse>>(new Map());

  const getCacheKey = useCallback((searchQuery: string, pageNumber: number, safe: boolean) => {
    return `${safe ? '1' : '0'}|${searchQuery}|${pageNumber}`;
  }, []);

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
        setError(requestError instanceof Error ? requestError.message : 'Failed to fetch search results.');
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

      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">Investigative Search</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Enrich your investigations with Google Programmable Search results, filtered through your workspace.
          </p>
        </div>

        <Card className="border border-dashed border-gray-200 dark:border-gray-800">
          <CardContent className="space-y-4 pt-6">
            <form className="flex flex-col gap-3 md:flex-row" onSubmit={handleSubmit}>
              <div className="relative flex-1">
                <Label htmlFor="search-query" className="sr-only">
                  Search query
                </Label>
                <SearchIcon className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2" />
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

            <div className="flex flex-col gap-3 rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-300 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <Switch id="safe-search" checked={safeSearch} onCheckedChange={handleSafeSearchToggle} />
                <div>
                  <Label htmlFor="safe-search" className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-200">
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
                  {formatNumber(metadata.totalResults)} results in {metadata.searchTime.toFixed(2)} seconds
                </span>
                <span className="flex items-center gap-1 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
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
                No results for <span className="font-medium text-gray-900 dark:text-gray-100">{submittedQuery}</span>.
                Try refining your query or removing filters.
              </div>
            )}

            {!isLoading && hasResults && (
              <div className="space-y-4">
                {results.map((item, index) => {
                  const key = item.link ?? item.cacheId ?? `${item.title}-${index}`;
                  const imageSource = item.thumbnail ?? item.image ?? null;
                  const siteName = item.meta?.['og:site_name'] ?? item.displayLink ?? item.formattedUrl ?? '';

                  return (
                    <Card key={key} className="border border-gray-200 transition-shadow duration-200 hover:shadow-md dark:border-gray-800">
                      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row">
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
                                <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
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
                                <span className="text-xs text-gray-500 dark:text-gray-400">{item.displayLink}</span>
                              )}
                            </div>
                          </div>

                          {item.snippet && (
                            <p className="text-sm text-gray-700 dark:text-gray-300">{item.snippet}</p>
                          )}

                          {item.meta?.['og:description'] && item.meta['og:description'] !== item.snippet && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">{item.meta['og:description']}</p>
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
      </div>
    </>
  );
};

export default Search;
