import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { CaseSearchBar } from '../../components/cases/CaseSearchBar';
import { CaseSearchFilters } from '../../components/cases/CaseSearchFilters';
import { CaseSearchResults } from '../../components/cases/CaseSearchResults';
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
    const location = useLocation();
    const assignedToId = useMemo(() => {
        const params = new URLSearchParams(location.search);
        const id = params.get('assignee');
        return id || undefined;
    }, [location.search]);

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
            perPage,
            assignedToId
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
        user?.organization_id,
        assignedToId
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
                    <CaseSearchBar />
                    <div className="flex items-center gap-2">
                        <CreateCaseDialog onCreated={fetchCases} />
                    </div>
                </div>
				<CaseSearchFilters onManageClick={() => setManageOpen(true)} />
                <CaseSearchResults perPage={perPage} onChanged={fetchCases} />
			</div>
            <CategoryTagManager open={manageOpen} onOpenChange={setManageOpen} />
		</div>
	);
}
