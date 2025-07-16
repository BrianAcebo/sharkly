import { LeadsContext } from "../contexts/LeadsContext";
import { useState } from "react";
import { Lead } from "../contexts/DataContext";
import { SearchFilter } from "../types/leads";

interface LeadProviderProps {
    children: React.ReactNode;
}

export const LeadsProvider: React.FC<LeadProviderProps> = ({ children }) => {
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
	const [searchQuery, setSearchQuery] = useState<string>('');
	const [searchHistory, setSearchHistory] = useState<string[]>([]);
	const [filters, setFilters] = useState<SearchFilter>({
		status: 'all',
		dateRange: { from: undefined, to: undefined },
		sortBy: 'recent',
		priorityLevel: 'all'
	});
	const [results, setResults] = useState<{
		results: Lead[];
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
		<LeadsContext.Provider
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
				setCurrentPage,
                selectedLead,
                setSelectedLead
			}}
		>
			{children}
		</LeadsContext.Provider>
	);
};