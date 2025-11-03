import React, { useCallback, useEffect, useState } from 'react';
import { SearchBar } from '../../components/cases/SearchBar';
import { SearchFilters } from '../../components/cases/SearchFilters';
import { SearchResults } from '../../components/cases/SearchResults';
import { getSearchResults, useCase } from '../../hooks/useCase';
import { useAuth } from '../../contexts/AuthContext';
//
import type { Case as UICase } from '../../types/case';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import PageMeta from '../../components/common/PageMeta';
import useDebounce from '../../hooks/useDebounce';
import CreateCaseDialog from '../../components/cases/CreateCaseDialog';
import CategoryTagManager from '../../components/cases/CategoryTagManager';
//
import { useBreadcrumbs } from '../../hooks/useBreadcrumbs';

export default function Cases() {
	// Search state
	const {
		searchQuery,
		searchHistory,
		setSearchHistory,
		filters,
		setResults,
		currentPage,
		setCurrentPage
	} = useCase();
    const debouncedValue = useDebounce(searchQuery, 500);
    const { user } = useAuth();
    const { setTitle } = useBreadcrumbs();

    const perPage = 5;
    const [manageOpen, setManageOpen] = useState(false);

    useEffect(() => {
        setTitle('Cases');
    }, [setTitle]);

	// Fetch results on query, filters, or page change
    const fetchCases = useCallback(async () => {
        setCurrentPage(1);

        if (debouncedValue && !searchHistory.includes(debouncedValue)) {
            setSearchHistory([debouncedValue, ...searchHistory].slice(0, 5));
        }

        if (!user?.organization_id) {
            setResults({ results: [], total: 0 });
            return;
        }

        const { results: rows, total } = await getSearchResults(
            user.organization_id,
            debouncedValue,
            filters,
            currentPage,
            perPage
        );
        setResults({ results: rows as UICase[], total });
    }, [
        currentPage,
        debouncedValue,
        filters,
        perPage,
        searchHistory,
        setCurrentPage,
        setResults,
        setSearchHistory,
        user?.organization_id
    ]);

    useEffect(() => {
        fetchCases();
    }, [
        debouncedValue,
        filters,
        currentPage,
        searchHistory,
        setSearchHistory,
        setResults,
        setCurrentPage,
        user?.organization_id,
        fetchCases
    ]);

	return (
		<div>
			<PageMeta title="Cases" description="Manage your cases" noIndex />

			<PageBreadcrumb pageTitle="All Cases" />

			<div>
                <div className="mb-6 flex gap-10 items-center justify-between">
                    <SearchBar />
                    <div className="flex items-center gap-2">
                        <CreateCaseDialog onCreated={fetchCases} />
                    </div>
                </div>
				<SearchFilters onManageClick={() => setManageOpen(true)} />
                <SearchResults perPage={perPage} onChanged={fetchCases} />
			</div>
            <CategoryTagManager open={manageOpen} onOpenChange={setManageOpen} />
		</div>
	);
}
