import { createContext } from 'react';
import { Case, SearchFilter } from '../types/case';

type CaseContextType = {
	searchQuery: string;
	setSearchQuery: (query: string) => void;
	searchHistory: string[];
	setSearchHistory: (history: string[]) => void;
	filters: SearchFilter;
	setFilters: (filters: SearchFilter) => void;
	results: {
		results: Case[];
		total: number;
	};
	setResults: (results: { results: Case[]; total: number }) => void;
	dateRange: {
		from: Date | undefined;
		to: Date | undefined;
	};
	setDateRange: (dateRange: { from: Date | undefined; to: Date | undefined }) => void;
	currentPage: number;
	setCurrentPage: (page: number) => void;
};

export const CaseContext = createContext<CaseContextType | undefined>(undefined);
