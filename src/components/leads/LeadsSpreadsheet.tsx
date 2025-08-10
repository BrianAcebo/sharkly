import React, { useState, useEffect } from 'react';
import { Lead } from '../../types/leads';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import { Edit, Trash2, MoreHorizontal, Eye, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { getStageColor, getStageLabel } from '../../utils/stages';
import { LEAD_STAGES, LEAD_PRIORITIES } from '../../utils/constants';

interface LeadsSpreadsheetProps {
  leads: Lead[];
  total: number;
  currentPage: number;
  totalPages: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onEditLead: (lead: Lead) => void;
  onViewLead: (lead: Lead) => void;
  onDeleteLeads: (leadIds: string[]) => void;
  onBulkUpdate: (leadIds: string[], updates: Partial<Lead>) => void;
}

export function LeadsSpreadsheet({ 
  leads, 
  total,
  currentPage,
  totalPages,
  perPage,
  onPageChange,
  onEditLead, 
  onViewLead,
  onDeleteLeads, 
  onBulkUpdate
}: LeadsSpreadsheetProps) {
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    leadIds: string[];
    leadNames: string[];
    isBulk: boolean;
  }>({
    isOpen: false,
    leadIds: [],
    leadNames: [],
    isBulk: false
  });

  // Reset selection when leads change
  useEffect(() => {
    setSelectedLeads(new Set());
    setSelectAll(false);
  }, [leads]);

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedLeads(new Set(leads.map(lead => lead.id)));
    } else {
      setSelectedLeads(new Set());
    }
  };

  const handleSelectLead = (leadId: string, checked: boolean) => {
    const newSelected = new Set(selectedLeads);
    if (checked) {
      newSelected.add(leadId);
    } else {
      newSelected.delete(leadId);
    }
    setSelectedLeads(newSelected);
    setSelectAll(newSelected.size === leads.length);
  };

  const handleBulkDelete = () => {
    if (selectedLeads.size > 0) {
      const leadIds = Array.from(selectedLeads);
      const leadNames = leads
        .filter(lead => leadIds.includes(lead.id))
        .map(lead => lead.name);
      
      setDeleteConfirm({
        isOpen: true,
        leadIds,
        leadNames,
        isBulk: true
      });
    }
  };

  const handleSingleDelete = (lead: Lead) => {
    setDeleteConfirm({
      isOpen: true,
      leadIds: [lead.id],
      leadNames: [lead.name],
      isBulk: false
    });
  };

  const confirmDelete = () => {
    onDeleteLeads(deleteConfirm.leadIds);
    if (deleteConfirm.isBulk) {
      setSelectedLeads(new Set());
      setSelectAll(false);
    }
    setDeleteConfirm({
      isOpen: false,
      leadIds: [],
      leadNames: [],
      isBulk: false
    });
  };

  const cancelDelete = () => {
    setDeleteConfirm({
      isOpen: false,
      leadIds: [],
      leadNames: [],
      isBulk: false
    });
  };

  const handleBulkStageUpdate = (stage: Lead['stage']) => {
    if (selectedLeads.size > 0) {
      onBulkUpdate(Array.from(selectedLeads), { stage });
    }
  };

  const handleBulkPriorityUpdate = (priority: Lead['priority']) => {
    if (selectedLeads.size > 0) {
      onBulkUpdate(Array.from(selectedLeads), { priority });
    }
  };

  const goToPage = (page: number) => {
    onPageChange(page);
  };

  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(totalPages);
  const goToNextPage = () => goToPage(currentPage + 1);
  const goToPreviousPage = () => goToPage(currentPage - 1);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case LEAD_PRIORITIES.LOW:
        return 'border-none text-green-700 dark:text-green-400';
      case LEAD_PRIORITIES.MEDIUM:
        return 'border-none text-amber-700 dark:text-amber-400';
      case LEAD_PRIORITIES.HIGH:
        return 'border-none text-red-700 dark:text-red-400';
      case LEAD_PRIORITIES.CRITICAL:
        return 'border-none text-red-900 dark:text-red-600';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {selectedLeads.size > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {selectedLeads.size} lead{selectedLeads.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Update Stage
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleBulkStageUpdate(LEAD_STAGES.NEW)}>
                    New Lead
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkStageUpdate(LEAD_STAGES.CONTACTED)}>
                    Contacted
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkStageUpdate(LEAD_STAGES.QUALIFIED)}>
                    Qualified
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkStageUpdate(LEAD_STAGES.PROPOSAL)}>
                    Proposal
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkStageUpdate(LEAD_STAGES.CLOSED_WON)}>
                    Closed Won
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkStageUpdate(LEAD_STAGES.CLOSED_LOST)}>
                    Closed Lost
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Update Priority
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleBulkPriorityUpdate(LEAD_PRIORITIES.LOW)}>
                    Low
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkPriorityUpdate(LEAD_PRIORITIES.MEDIUM)}>
                    Medium
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkPriorityUpdate(LEAD_PRIORITIES.HIGH)}>
                    High
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkPriorityUpdate(LEAD_PRIORITIES.CRITICAL)}>
                    Critical
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleBulkDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Spreadsheet Table */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <thead className="bg-white dark:bg-gray-900">
              <tr>
                <th className="w-12 px-4 py-3 text-left border-b border-gray-200 dark:border-gray-700">
                  <Checkbox 
                    checked={selectAll}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th className="w-32 px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
                  Name
                </th>
                <th className="w-48 px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
                  Email
                </th>
                <th className="w-32 px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
                  Company
                </th>
                <th className="w-32 px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
                  Tags
                </th>
                <th className="w-24 px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
                  Stage
                </th>
                <th className="w-20 px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
                  Priority
                </th>
                <th className="w-24 px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
                  Value
                </th>
                <th className="w-24 px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
                  Created
                </th>
                <th className="w-20 px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
                  View
                </th>
                <th className="w-20 px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {leads.map((lead, i) => (
                <tr 
                  key={lead.id} 
                  className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${i % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}
                >
                  <td className="w-12 px-4 py-3">
                    <Checkbox 
                      checked={selectedLeads.has(lead.id)}
                      onCheckedChange={(checked) => handleSelectLead(lead.id, checked as boolean)}
                    />
                  </td>
                  <td className="w-32 px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    <div className="truncate" title={lead.name}>
                      {lead.name}
                    </div>
                  </td>
                  <td className="w-48 px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    <div className="truncate" title={lead.email}>
                      {lead.email}
                    </div>
                  </td>
                  <td className="w-32 px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    <div className="truncate" title={lead.company || '-'}>
                      {lead.company || '-'}
                    </div>
                  </td>
                  <td className="w-32 px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    <div className="truncate" title={lead.tags?.join(', ') || '-'}>
                      {lead.tags?.join(', ') || '-'}
                    </div>
                  </td>
                  <td className="w-24 px-4 py-3">
                    <Badge
                      variant="outline"
                      className={`capitalize ${getStageColor(lead.stage)}`}
                    >
                      {getStageLabel(lead.stage)}
                    </Badge>
                  </td>
                  <td className="w-20 px-4 py-3">
                    <Badge
                      variant="outline"
                      className={`uppercase ${getPriorityColor(lead.priority)}`}
                    >
                      {lead.priority}
                    </Badge>
                  </td>
                  <td className="w-24 px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    <div className="truncate" title={lead.value ? `$${lead.value.toLocaleString()}` : '-'}>
                      {lead.value ? `$${lead.value.toLocaleString()}` : '-'}
                    </div>
                  </td>
                  <td className="w-24 px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    <div className="truncate" title={new Date(lead.created_at).toLocaleDateString()}>
                      {new Date(lead.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="w-20 px-4 py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewLead(lead)}
                      className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                      title="View lead details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                  <td className="w-20 px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => onEditLead(lead)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleSingleDelete(lead)}
                          className="text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
            <span>
              Showing {((currentPage - 1) * perPage) + 1} to {Math.min(currentPage * perPage, total)} of {total} leads
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToFirstPage}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousPage}
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
                    onClick={() => goToPage(pageNum)}
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
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={goToLastPage}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                  <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {deleteConfirm.isBulk ? 'Delete Multiple Leads' : 'Delete Lead'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  This action cannot be undone.
                </p>
              </div>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {deleteConfirm.isBulk 
                  ? `Are you sure you want to delete ${deleteConfirm.leadIds.length} leads?`
                  : `Are you sure you want to delete "${deleteConfirm.leadNames[0]}"?`
                }
              </p>
              {deleteConfirm.isBulk && deleteConfirm.leadNames.length > 0 && (
                <div className="mt-2 max-h-32 overflow-y-auto">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Leads to be deleted:</p>
                  <div className="text-xs text-gray-700 dark:text-gray-300">
                    {deleteConfirm.leadNames.map((name, index) => (
                      <div key={index} className="truncate">• {name}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={cancelDelete}
                className="px-4 py-2"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                className="px-4 py-2"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 