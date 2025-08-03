import { createContext } from "react";
import { Lead, SearchFilter, Communication } from "../types/leads";

interface LeadsContextType {
    selectedLead: Lead | null;
    setSelectedLead: (lead: Lead | null) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    searchHistory: string[];
    setSearchHistory: (history: string[]) => void;
    filters: SearchFilter;
    setFilters: (filters: SearchFilter) => void;
    results: { results: Lead[]; total: number };
    setResults: (results: { results: Lead[]; total: number }) => void;
    dateRange: {
        from: Date | undefined;
        to: Date | undefined;
    };
    setDateRange: (dateRange: { from: Date | undefined; to: Date | undefined }) => void;
    currentPage: number;
    setCurrentPage: (page: number) => void;
    leads: Lead[];
    loading: boolean;
    addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'communications'>) => void;
    updateLead: (id: string, updates: Partial<Lead>) => void;
    deleteLead: (id: string) => void;
    getLeadById: (id: string) => Lead | undefined;
    addCommunication: (leadId: string, communication: Omit<Communication, 'id'>) => void;
}

export const LeadsContext = createContext<LeadsContextType>({
    selectedLead: null,
    setSelectedLead: () => {},
    searchQuery: '',
    setSearchQuery: () => {},
    searchHistory: [],
    setSearchHistory: () => {},
    filters: {},
    setFilters: () => {},
    results: { results: [], total: 0 },
    setResults: () => {},
    dateRange: {
        from: undefined,
        to: undefined
    },
    setDateRange: () => {},
    currentPage: 1,
    setCurrentPage: () => {},
    leads: [],
    loading: false,
    addLead: () => {},
    updateLead: () => {},
    deleteLead: () => {},
    getLeadById: () => undefined,
    addCommunication: () => {}
});