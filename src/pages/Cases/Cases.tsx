import { useEffect } from 'react';
import { SearchBar } from '../../components/cases/SearchBar';
import { SearchFilters } from '../../components/cases/SearchFilters';
import { SearchResults } from '../../components/cases/SearchResults';
import { getSearchResults, useCase } from '../../hooks/useCase';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import PageMeta from '../../components/common/PageMeta';
import useDebounce from '../../hooks/useDebounce';

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
	const perPage = 5;

	// Fetch results on query, filters, or page change
	useEffect(() => {
		setCurrentPage(1);

		// Add to search history if not already present
		if (debouncedValue && !searchHistory.includes(debouncedValue)) {
			setSearchHistory([debouncedValue, ...searchHistory].slice(0, 5));
		}

		const searchResults = getSearchResults(debouncedValue, filters, currentPage, perPage);
		setResults(searchResults);
	}, [
		debouncedValue,
		filters,
		currentPage,
		searchHistory,
		setSearchHistory,
		setResults,
		setCurrentPage
	]);

	return (
		<div>
			<PageMeta title="" description="" />

			<PageBreadcrumb pageTitle="All Cases" />

			<div>
				<SearchBar className="mb-6" />
				<SearchFilters />
				<SearchResults perPage={perPage} />
			</div>
		</div>
	);
}
