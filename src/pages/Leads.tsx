import React, { useState, useMemo } from 'react';
import { LeadService } from '../utils/leadService';
import { Lead } from '../contexts/DataContext';
import { SearchBar } from '../components/leads/SearchBar';
import { SearchFilters } from '../components/leads/SearchFilters';
import { SearchResults } from '../components/leads/SearchResults';
import AddLeadModal from '../components/leads/AddLeadModal';
import EditLeadModal from '../components/leads/EditLeadModal';
import PageMeta from '../components/common/PageMeta';
import useDebounce from '../hooks/useDebounce';
import { useBreadcrumbs } from '../hooks/useBreadcrumbs';
import { Button } from '../components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { useToast } from '../hooks/useToast';

// Custom hook for managing leads data
const useLeadsData = () => {
    const { toast } = useToast();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchLeads = async () => {
        try {
            setIsLoading(true);
            const fetchedLeads = await LeadService.getLeads();
            // Convert the fetched leads to match the DataContext Lead type
            const convertedLeads: Lead[] = fetchedLeads.map(lead => ({
                id: lead.id,
                name: lead.name,
                email: lead.email,
                phone: lead.phone || '',
                company: lead.company || '',
                stage: lead.stage,
                value: lead.value || 0,
                lastContact: lead.last_contact || '',
                notes: lead.notes || '',
                communications: [],
                avatar: undefined,
                title: lead.title || '',
                description: '',
                category: lead.category || '',
                status: lead.status,
                priority: lead.priority,
                tags: lead.tags || [],
                assignedTo: [],
                createdAt: new Date(lead.created_at),
                updatedAt: new Date(lead.updated_at)
            }));
            setLeads(convertedLeads);
        } catch (error) {
            console.error('Error fetching leads:', error);
            toast({
                title: 'Error',
                description: 'Failed to fetch leads',
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch leads on mount
    React.useEffect(() => {
        fetchLeads();
    }, []);

    return { leads, isLoading, refetch: fetchLeads };
};

const LeadsContent: React.FC = () => {
    const { leads, isLoading, refetch } = useLeadsData();
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({
        status: 'all',
        priority: 'all',
        stage: 'all'
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingLead, setEditingLead] = useState<Lead | null>(null);
    const perPage = 10;
    const debouncedSearchQuery = useDebounce(searchQuery, 500);

    // Filter and paginate leads using useMemo for performance
    const { filteredLeads, totalPages, currentLeads } = useMemo(() => {
        let filtered = [...leads];

        // Apply search filter
        if (debouncedSearchQuery) {
            filtered = filtered.filter(lead =>
                lead.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                lead.email.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                lead.company?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
            );
        }

        // Apply status filter
        if (filters.status !== 'all') {
            filtered = filtered.filter(lead => lead.status === filters.status);
        }

        // Apply priority filter
        if (filters.priority !== 'all') {
            filtered = filtered.filter(lead => lead.priority === filters.priority);
        }

        // Apply stage filter
        if (filters.stage !== 'all') {
            filtered = filtered.filter(lead => lead.stage === filters.stage);
        }

        // Calculate pagination
        const totalPages = Math.ceil(filtered.length / perPage);
        const startIndex = (currentPage - 1) * perPage;
        const endIndex = startIndex + perPage;
        const currentLeads = filtered.slice(startIndex, endIndex);

        return { filteredLeads: filtered, totalPages, currentLeads };
    }, [leads, debouncedSearchQuery, filters, currentPage, perPage]);

    // Event handlers - simple functions, no need for useCallback
    const handleLeadCreated = () => {
        refetch();
    };

    const handleLeadUpdated = () => {
        refetch();
        setEditingLead(null);
    };

    const handleLeadDeleted = () => {
        refetch();
        setEditingLead(null);
    };

    const handleEditLead = (lead: Lead) => {
        setEditingLead(lead);
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        // Scroll to top of results
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading leads...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leads</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Manage your sales leads and track their progress
                    </p>
                </div>
                <Button onClick={() => setShowAddModal(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Lead
                </Button>
            </div>

            {/* Search and Filters */}
            <div className="space-y-4">
                <SearchBar 
                    value={searchQuery}
                    onChange={setSearchQuery}
                    className="mb-6" 
                />
                <SearchFilters 
                    filters={filters}
                    onFiltersChange={setFilters}
                />
            </div>

            {/* Results */}
            <SearchResults 
                leads={currentLeads}
                totalLeads={filteredLeads.length}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                onEditLead={handleEditLead}
            />

            {/* Modals */}
            {showAddModal && (
                <AddLeadModal
                    onClose={() => setShowAddModal(false)}
                    onLeadCreated={handleLeadCreated}
                />
            )}

            {editingLead && (
                <EditLeadModal
                    lead={editingLead}
                    onClose={() => setEditingLead(null)}
                    onLeadUpdated={handleLeadUpdated}
                    onLeadDeleted={handleLeadDeleted}
                />
            )}
        </div>
    );
};

export default function Leads() {
    const { setTitle } = useBreadcrumbs();

    // Simple effect for setting breadcrumb title
    React.useEffect(() => {
        setTitle('Leads');
    }, [setTitle]);

    return (
        <div className="container mx-auto px-4 py-8">
            <PageMeta title="Leads | Paperboat CRM" description="Manage your sales leads and track their progress" />
            <LeadsContent />
        </div>
    );
}
