import { useEffect } from 'react';
import { SearchBar } from '../components/leads/SearchBar';
import { SearchFilters } from '../components/leads/SearchFilters';
import { SearchResults } from '../components/leads/SearchResults';
import { getSearchResults, useLeads } from '../hooks/useLeads';
import PageMeta from '../components/common/PageMeta';
import useDebounce from '../hooks/useDebounce';
import { LeadsProvider } from '../providers/LeadsProvider';
import { useBreadcrumbs } from '../hooks/useBreadcrumbs';


const LeadsContent: React.FC = () => {
    // Search state
	const {
		searchQuery,
		searchHistory,
		setSearchHistory,
		filters,
		setResults,
		currentPage,
		setCurrentPage
	} = useLeads();
	const debouncedValue = useDebounce(searchQuery, 500);
	const perPage = 5;

	// Fetch results on query, filters, or page change
	useEffect(() => {
		setCurrentPage(1);

		// Add to search history if not already present
		if (debouncedValue && !searchHistory.includes(debouncedValue)) {
			setSearchHistory([debouncedValue, ...searchHistory].slice(0, 5));
		}

        console.log(debouncedValue, filters, currentPage, perPage);

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
        <>
            <SearchBar className="mb-6" />
            <SearchFilters />
            <SearchResults perPage={perPage} />
        </>
    );
};

export default function Leads() {
    const { setTitle } = useBreadcrumbs();

	useEffect(() => {
		setTitle('Leads');
	}, [setTitle]);

	return (
		<div>
			<PageMeta title="" description="" />

			<LeadsProvider>
				<LeadsContent />
			</LeadsProvider>
		</div>
	);
}
