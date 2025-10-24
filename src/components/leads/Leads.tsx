import { useState, useEffect, useCallback } from 'react';
import { SearchBar } from '../leads/SearchBar';
import { SearchFilters } from '../leads/SearchFilters';
import { SearchResults } from '../leads/SearchResults';
import { LeadsSpreadsheet } from '../leads/LeadsSpreadsheet';
import { LeadsImportExport } from '../leads/LeadsImportExport';
import AddLeadModal from '../leads/AddLeadModal';
import EditLeadModal from '../leads/EditLeadModal';
import useDebounce from '../../hooks/useDebounce';
import { useLeads } from '../../hooks/useLeads';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Plus, Loader2, Grid3X3, List, Download } from 'lucide-react';
import { Lead, CreateLeadData } from '../../types/leads';
import { LeadsFilters } from '../../api/leads';
import { bulkUpdateLeadsService, bulkDeleteLeadsService, bulkImportLeadsService } from '../../utils/leadService';
import { toast } from 'sonner';

export default function Leads() {
  const { user } = useAuth();
  const {
    leads,
    loading,
    error,
    total,
    page: currentPage,
    perPage,
    totalPages,
    fetchLeads,
    setPerPage,
    refreshLeads
  } = useLeads();

  const [searchQuery, setSearchQuery] = useState('');
  // Local interface for SearchFilters compatibility
  type LocalFilters = {
    status: string;
    priority: string;
    stage: string;
    dateRange?: { from?: Date; to?: Date };
  };

  const [localFilters, setLocalFilters] = useState<LocalFilters>({
    status: 'all',
    priority: 'all',
    stage: 'all',
    dateRange: undefined
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportExportModal, setShowImportExportModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'spreadsheet'>('cards');
  
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // Create combined filters object for API calls
  const combinedFilters = useCallback(() => {
    const filters: LeadsFilters = {};
    
    if (localFilters.status !== 'all') {
      filters.status = localFilters.status as 'active' | 'in_progress' | 'closed';
    }
    if (localFilters.priority !== 'all') {
      filters.priority = localFilters.priority as 'low' | 'medium' | 'high' | 'critical';
    }
    if (localFilters.stage !== 'all') {
      filters.stage = localFilters.stage as 'new' | 'contacted' | 'qualified' | 'proposal' | 'closed-won' | 'closed-lost';
    }
    if (localFilters.dateRange) {
      filters.dateRange = localFilters.dateRange;
    }
    if (debouncedSearchQuery) {
      filters.search = debouncedSearchQuery;
    }
    
    return filters;
  }, [localFilters, debouncedSearchQuery]);

  // Fetch leads when filters or search change
  useEffect(() => {
    if (user?.organization_id) {
      fetchLeads(combinedFilters(), 1); // Reset to page 1 when filters change
    }
  }, [combinedFilters, user?.organization_id, fetchLeads]);

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

  const handleViewLead = (lead: Lead) => {
    // Navigate to the lead detail page
    window.location.href = `/leads/${lead.id}`;
  };

  const handlePageChange = (page: number) => {
    if (user?.organization_id) {
      fetchLeads(combinedFilters(), page);
    }
  };

  const handleFiltersChange = (newFilters: LocalFilters) => {
    setLocalFilters(newFilters);
  };

  const handleBulkUpdate = async (leadIds: string[], updates: Partial<Lead>) => {
    try {
      await bulkUpdateLeadsService(leadIds, updates);
      toast.success(`Updated ${leadIds.length} lead${leadIds.length !== 1 ? 's' : ''}`);
      refreshLeads();
    } catch (error) {
      // Silent error handling
    }
  };

  const handleBulkDelete = async (leadIds: string[]) => {
    try {
      await bulkDeleteLeadsService(leadIds);
      toast.success(`Deleted ${leadIds.length} lead${leadIds.length !== 1 ? 's' : ''}`);
      refreshLeads();
    } catch (error) {
      // Silent error handling
    }
  };

  const handleImportLeads = async (leads: CreateLeadData[]) => {
    try {
      await bulkImportLeadsService(leads);
      refreshLeads();
    } catch (error) {
      // Silent error handling
    }
  };

  const handleExportLeads = async (): Promise<Lead[]> => {
    try {
      if (!user?.organization_id) {
        throw new Error('No organization ID available');
      }
      const { getAllLeadsForExport } = await import('../../utils/leadService');
      const leads = await getAllLeadsForExport(user.organization_id, combinedFilters());
      return leads;
    } catch (error) {
      return [];
    }
  };

  const handleEmailExport = async (email: string, filters: LeadsFilters): Promise<void> => {
    try {
      // Import the emailLeadsExport function
      const { emailLeadsExport } = await import('../../api/leads');
      // Use current filters if no specific filters provided
      const exportFilters = Object.keys(filters).length > 0 ? filters : combinedFilters();
      await emailLeadsExport(email, exportFilters);
    } catch (error) {
      // Silent error handling
    }
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
        <div className="flex items-center space-x-2">
          <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg">
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="rounded-r-none"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'spreadsheet' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('spreadsheet')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setShowImportExportModal(true)}
            >
              <Download className="h-4 w-4 mr-2" />
              Import/Export
            </Button>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>
          </div>
        </div>
      </div>

      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
      />

      <SearchFilters
        filters={localFilters}
        onFiltersChange={handleFiltersChange}
      />

      {viewMode === 'cards' ? (
        <SearchResults
          leads={leads}
          totalLeads={total}
          currentPage={currentPage}
          totalPages={totalPages}
          perPage={perPage}
          onPageChange={handlePageChange}
          onPerPageChange={setPerPage}
          onEditLead={handleEditLead}
        />
      ) : (
        <LeadsSpreadsheet
          leads={leads}
          total={total}
          currentPage={currentPage}
          totalPages={totalPages}
          perPage={perPage}
          onPageChange={handlePageChange}
          onEditLead={handleEditLead}
          onViewLead={handleViewLead}
          onDeleteLeads={handleBulkDelete}
          onBulkUpdate={handleBulkUpdate}
        />
      )}

      {showAddModal && (
        <AddLeadModal
          onClose={() => setShowAddModal(false)}
          onLeadCreated={handleLeadCreated}
        />
      )}

      {showImportExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Import/Export Leads
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowImportExportModal(false)}
              >
                ×
              </Button>
            </div>
            <LeadsImportExport
              leads={leads}
              onImportLeads={handleImportLeads}
              onExportLeads={handleExportLeads}
              onEmailExport={handleEmailExport}
            />
          </div>
        </div>
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
