import React, { useState } from 'react';
import { CaseContext } from '../contexts/CaseContext';
import { Case, SearchFilter } from '../types/case';

export const CaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [searchQuery, setSearchQuery] = useState<string>('');
	const [searchHistory, setSearchHistory] = useState<string[]>([]);
	const [filters, setFilters] = useState<SearchFilter>({
		status: 'all',
		dateRange: { from: undefined, to: undefined },
		sortBy: 'recent',
		priorityLevel: 'all'
	});
	const [results, setResults] = useState<{
		results: Case[];
		total: number;
	}>({ results: [], total: 0 });
	const [dateRange, setDateRange] = useState<{
		from: Date | undefined;
		to: Date | undefined;
	}>({
		from: filters.dateRange?.from,
		to: filters.dateRange?.to
	});
	const [currentPage, setCurrentPage] = useState<number>(1);

	return (
		<CaseContext.Provider
			value={{
				searchQuery,
				setSearchQuery,
				searchHistory,
				setSearchHistory,
				filters,
				setFilters,
				results,
				setResults,
				dateRange,
				setDateRange,
				currentPage,
				setCurrentPage
			}}
		>
			{children}
		</CaseContext.Provider>
	);
};
