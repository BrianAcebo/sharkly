import React, { useState, useMemo } from 'react';
import { SearchBar } from '../components/leads/SearchBar';
import { SearchFilters } from '../components/leads/SearchFilters';
import { SearchResults } from '../components/leads/SearchResults';
import AddLeadModal from '../components/leads/AddLeadModal';
import EditLeadModal from '../components/leads/EditLeadModal';
import PageMeta from '../components/common/PageMeta';
import useDebounce from '../hooks/useDebounce';
import { useBreadcrumbs } from '../hooks/useBreadcrumbs';
import { useLeads } from '../hooks/useLeads';
import { Button } from '../components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { Lead } from '../types/leads';
import { getAllLeads } from '../api';

const LeadsContent: React.FC = () => {
  const {
    leads,
    loading,
    error,
    refreshLeads
  } = useLeads();
  
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

  // Temporary debug function
  const debugLeads = async () => {
    console.log('Debug: Checking all leads in database...');
    const allLeads = await getAllLeads();
    console.log('Debug: All leads found:', allLeads);
  };

  // Filter and paginate leads using useMemo for performance
  const { filteredLeads, totalPages: localTotalPages, currentLeads } = useMemo(() => {
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
    const total = filtered.length;
    const totalPages = Math.ceil(total / perPage);
    const startIndex = (currentPage - 1) * perPage;
    const paginatedResults = filtered.slice(startIndex, startIndex + perPage);

    return {
      filteredLeads: filtered,
      totalPages,
      currentLeads: paginatedResults
    };
  }, [leads, debouncedSearchQuery, filters, currentPage]);

  const handleLeadCreated = () => {
    setShowAddModal(false);
    refreshLeads();
  };

  const handleLeadUpdated = () => {
    setEditingLead(null);
    refreshLeads();
  };

  const handleLeadDeleted = () => {
    setEditingLead(null);
    refreshLeads();
  };

  const handleEditLead = (lead: Lead) => {
    setEditingLead(lead);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading leads...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-red-500 mb-4">Error: {error}</p>
        <Button onClick={refreshLeads}>Retry</Button>
        <Button onClick={debugLeads} className="mt-2">Debug: Check All Leads</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leads</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your leads and prospects</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Lead
        </Button>
      </div>

      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
      />

      <SearchFilters
        filters={filters}
        onFiltersChange={setFilters}
      />

      <SearchResults
        leads={currentLeads}
        totalLeads={filteredLeads.length}
        currentPage={currentPage}
        totalPages={localTotalPages}
        onPageChange={handlePageChange}
        onEditLead={handleEditLead}
      />

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
  useBreadcrumbs();

  return (
    <>
      <PageMeta title="Leads" description="Manage your leads and prospects" />
      <LeadsContent />
    </>
  );
}
