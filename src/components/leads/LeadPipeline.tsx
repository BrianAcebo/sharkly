import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useLeads } from '../../hooks/useLeads';
import { Plus, Search, MoreHorizontal, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

import AddLeadModal from './AddLeadModal';
import { Lead } from '../../types/leads';
import { Button } from '../ui/button';
import { LeadStage, getStageLabel, getStageColor, stages } from '../../utils/stages';
import { SearchFilters } from './SearchFilters';
import useDebounce from '../../hooks/useDebounce';
import { LeadsFilters } from '../../api/leads';
import PipelineLeadCard from './PipelineLeadCard';

const LeadPipeline: React.FC = () => {
  const navigate = useNavigate();
  const { 
    leads, 
    updateLead, 
    loading, 
    error, 
    total, 
    page: currentPage, 
    perPage, 
    totalPages, 
    fetchLeads, 
    setPerPage 
  } = useLeads();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  
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
  
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

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
    if (debouncedSearchTerm) {
      filters.search = debouncedSearchTerm;
    }
    
    return filters;
  }, [localFilters, debouncedSearchTerm]);

  // Fetch leads when filters or search change
  useEffect(() => {
    fetchLeads(combinedFilters(), 1); // Reset to page 1 when filters change
  }, [combinedFilters, fetchLeads]);

  const filteredLeads = leads;

  const getLeadsByStage = (stage: string) => {
    return filteredLeads.filter((lead: Lead) => lead.stage === stage);
  };

  const getTotalValue = (stage: string) => {
    return getLeadsByStage(stage).reduce((sum: number, lead: Lead) => sum + (lead.value || 0), 0);
  };

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('text/plain', leadId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStage: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain');
    await updateLead(leadId, { stage: newStage as Lead['stage'] });
  };

  const handlePageChange = (page: number) => {
    fetchLeads(combinedFilters(), page);
  };

  const handleFiltersChange = (newFilters: LocalFilters) => {
    setLocalFilters(newFilters);
  };

  const handlePerPageChange = (newPerPage: number) => {
    setPerPage(newPerPage);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
        <span className="ml-2">Loading pipeline...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-red-500 mb-4">Error: {error}</p>
        <Button onClick={() => fetchLeads(combinedFilters(), 1)}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="bg-white dark:bg-gray-800 p-6 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lead Pipeline</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage your leads and track progress</p>
          </div>

          <div className="flex items-center space-x-4 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                name="lead-search"
                type="text"
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-gray-900 dark:text-gray-100 w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 focus:border-transparent"
              />
            </div>

            <Button
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>
          </div>
        </div>

        <SearchFilters
          filters={localFilters}
          onFiltersChange={handleFiltersChange}
          totalResults={total}
        />
      </div>

      <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900">
        <div className="h-full w-full overflow-auto scrollbar-branded">
          <div className="flex pb-6 gap-6 h-full min-w-max">
            {stages.map((stage: LeadStage) => (
              <div
                key={stage}
                className="bg-white dark:bg-gray-800 rounded-lg p-5 scrollbar-branded flex flex-col min-w-[400px] w-[450px] h-full overflow-y-auto border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-200"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage)}
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${getStageColor(stage as LeadStage)}`}>
                      {getStageLabel(stage)}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                      {getLeadsByStage(stage).length} leads
                    </span>
                  </div>
                  <Button variant="outline" size="sm" className="opacity-60 hover:opacity-100">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>

                <div className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-5 bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg">
                  ${getTotalValue(stage).toLocaleString()}
                </div>

                <div className="flex-1 space-y-3 overflow-auto min-h-[700px] max-h-[calc(100vh-150px)] scrollbar-branded">
                  {getLeadsByStage(stage).map((lead: Lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e: React.DragEvent) => handleDragStart(e, lead.id)}
                      className="cursor-move group"
                    >
                      <PipelineLeadCard
                        lead={lead}
                        onClick={() => {
                          navigate(`/leads/${lead.id}`);
                        }}
                      />
                    </div>
                  ))}
                  
                  {getLeadsByStage(stage).length === 0 && (
                    <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        <Plus className="h-8 w-8" />
                      </div>
                      <p className="text-sm font-medium mb-1">No leads in this stage</p>
                      <p className="text-xs opacity-75">Drag leads here or add new ones</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="bg-white dark:bg-gray-800 p-6 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
              <span>
                Showing {((currentPage - 1) * perPage) + 1} to {Math.min(currentPage * perPage, total)} of {total} leads
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label htmlFor="perPage" className="text-sm text-gray-600 dark:text-gray-400">
                  Items per page:
                </label>
                <select
                  id="perPage"
                  value={perPage}
                  onChange={(e) => handlePerPageChange(Number(e.target.value))}
                  className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <AddLeadModal
          onClose={() => setShowAddModal(false)}
          onLeadCreated={() => {
            setShowAddModal(false);
            // The useLeads hook will automatically refresh the data
          }}
        />
      )}
    </div>
  );
};

export default LeadPipeline;