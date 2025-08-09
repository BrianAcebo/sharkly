import React, { useState } from 'react';
import { Lead } from '../../types/leads';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import { Edit, Trash2, MoreHorizontal, Eye } from 'lucide-react';
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
  onEditLead: (lead: Lead) => void;
  onViewLead: (lead: Lead) => void;
  onDeleteLeads: (leadIds: string[]) => void;
  onBulkUpdate: (leadIds: string[], updates: Partial<Lead>) => void;
}

export function LeadsSpreadsheet({ 
  leads, 
  onEditLead, 
  onViewLead,
  onDeleteLeads, 
  onBulkUpdate 
}: LeadsSpreadsheetProps) {
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

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
      onDeleteLeads(Array.from(selectedLeads));
      setSelectedLeads(new Set());
      setSelectAll(false);
    }
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
          <table className="w-full">
            <thead className="bg-white dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left">
                  <Checkbox 
                    checked={selectAll}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100">
                  Company
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100">
                  Stage
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100">
                  Priority
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100">
                  Value
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100">
                  Created
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {leads.map((lead) => (
                <tr 
                  key={lead.id} 
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td className="px-4 py-3">
                    <Checkbox 
                      checked={selectedLeads.has(lead.id)}
                      onCheckedChange={(checked) => handleSelectLead(lead.id, checked as boolean)}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    {lead.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {lead.email}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {lead.company || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={`capitalize ${getStageColor(lead.stage)}`}
                    >
                      {getStageLabel(lead.stage)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={`uppercase ${getPriorityColor(lead.priority)}`}
                    >
                      {lead.priority}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {lead.value ? `$${lead.value.toLocaleString()}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => onViewLead(lead)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEditLead(lead)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onDeleteLeads([lead.id])}
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
    </div>
  );
} 