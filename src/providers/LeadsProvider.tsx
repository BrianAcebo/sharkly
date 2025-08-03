import { LeadsContext } from '../contexts/LeadsContext';
import { useState, useEffect } from 'react';
import { Lead, SearchFilter, Communication } from '../types/leads';
import { useAuth } from '../contexts/AuthContext';
import { getLeads } from '../api/leads';
import { toast } from 'sonner';

interface LeadProviderProps {
	children: React.ReactNode;
}

export const LeadsProvider: React.FC<LeadProviderProps> = ({ children }) => {
	const { user } = useAuth();
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
	const [loading, setLoading] = useState<boolean>(false);

	const [leads, setLeads] = useState<Lead[]>([]);

	// Fetch leads when component mounts or user changes
	useEffect(() => {
		const fetchLeads = async () => {
			if (!user?.organization_id) {
				return;
			}

			setLoading(true);
			try {
				const response = await getLeads({}, 1, 100, user.organization_id);
				setLeads(response.leads);
				setResults({ results: response.leads, total: response.total });
			} catch (error) {
				console.error('Error fetching leads:', error);
				toast.error('Failed to fetch leads');
			} finally {
				setLoading(false);
			}
		};

		fetchLeads();
	}, [user?.organization_id]);

	const addLead = (leadData: Omit<Lead, 'id' | 'createdAt' | 'communications'>) => {
		const newLead: Lead = {
			...leadData,
			id: Date.now().toString(),
			created_at: new Date().toISOString(),
			communications: []
		};
		setLeads((prev) => [...prev, newLead]);
	};

	const updateLead = (id: string, updates: Partial<Lead>) => {
		setLeads((prev) => prev.map((lead) => (lead.id === id ? { ...lead, ...updates } : lead)));
	};

	const deleteLead = (id: string) => {
		setLeads((prev) => prev.filter((lead) => lead.id !== id));
	};

	const addCommunication = (leadId: string, commData: Omit<Communication, 'id'>) => {
		const newCommunication: Communication = {
			...commData,
			id: Date.now().toString()
		};

		setLeads((prev) =>
			prev.map((lead) =>
				lead.id === leadId
					? {
							...lead,
							communications: [...lead.communications, newCommunication],
							lastContact: new Date().toISOString().split('T')[0]
						}
					: lead
			)
		);
	};

	const getLeadById = (id: string) => {
		return leads.find((lead) => lead.id === id);
	};

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
				setSelectedLead,
				leads,
				loading,
				addLead,
				updateLead,
				deleteLead,
				getLeadById,
				addCommunication
			}}
		>
			{children}
		</LeadsContext.Provider>
	);
};
