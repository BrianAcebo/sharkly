import React, { useState } from 'react';
import { useData } from '../../hooks/useData';
import { Plus, Search, Filter, MoreHorizontal } from 'lucide-react';
import LeadCard from './LeadCard';
import AddLeadModal from './AddLeadModal';
import { Lead } from '../../contexts/DataContext';
import { useLeads } from '../../hooks/useLeads';
import Button from '../form/button/Button';

const stages = [
  { id: 'new', name: 'New Leads', color: 'bg-gray-100 text-gray-800' },
  { id: 'contacted', name: 'Contacted', color: 'bg-blue-100 text-blue-800' },
  { id: 'qualified', name: 'Qualified', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'proposal', name: 'Proposal', color: 'bg-purple-100 text-purple-800' },
  { id: 'closed-won', name: 'Closed Won', color: 'bg-green-100 text-green-800' },
  { id: 'closed-lost', name: 'Closed Lost', color: 'bg-red-100 text-red-800' },
];

const LeadPipeline: React.FC = () => {
  const { leads, updateLead } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const { setSelectedLead } = useLeads();

  const filteredLeads = leads.filter((lead: Lead) =>
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getLeadsByStage = (stage: string) => {
    return filteredLeads.filter((lead: Lead) => lead.stage === stage);
  };

  const getTotalValue = (stage: string) => {
    return getLeadsByStage(stage).reduce((sum: number, lead: Lead) => sum + lead.value, 0);
  };

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('text/plain', leadId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, newStage: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain');
    updateLead(leadId, { stage: newStage as Lead['stage'] });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white shadow-sm border-b p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lead Pipeline</h1>
            <p className="text-gray-600">Manage your leads and track progress</p>
          </div>
          <Button
            variant="primary"
            startIcon={<Plus className="h-4 w-4" />}
            onClick={() => setShowAddModal(true)}
          >
            Add Lead
          </Button>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <Button variant="outline" startIcon={<Filter className="h-4 w-4" />}>
            Filter
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900">
        <div className="h-full p-6">
          <div className="flex gap-4 h-full min-w-max overflow-x-auto">
            {stages.map((stage) => (
              <div
                key={stage.id}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 flex flex-col min-w-[280px] w-80 border border-gray-200 dark:border-gray-700"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${stage.color}`}>
                      {stage.name}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {getLeadsByStage(stage.id).length}
                    </span>
                  </div>
                  <Button variant="icon" startIcon={<MoreHorizontal className="h-4 w-4" />} />
                </div>

                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    ${getTotalValue(stage.id).toLocaleString()}
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3">
                  {getLeadsByStage(stage.id).map((lead: Lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      className="cursor-move"
                    >
                      <LeadCard
                        lead={lead}
                        onClick={() => setSelectedLead(lead)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showAddModal && (
        <AddLeadModal onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
};

export default LeadPipeline;