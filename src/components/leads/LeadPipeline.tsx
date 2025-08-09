import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useLeads } from '../../hooks/useLeads';
import { Plus, Search, Filter, MoreHorizontal } from 'lucide-react';
import LeadCard from './LeadCard';
import AddLeadModal from './AddLeadModal';
import { Lead } from '../../types/leads';
import { Button } from '../ui/button';
import { LeadStage, getStageLabel, getStageColor, stages } from '../../utils/stages';

const LeadPipeline: React.FC = () => {
  const navigate = useNavigate();
  const { leads, updateLead } = useLeads();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredLeads = leads.filter((lead: Lead) =>
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="bg-white dark:bg-gray-800 p-6 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lead Pipeline</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage your leads and track progress</p>
          </div>
          <Button
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>

        <div className="flex items-center space-x-4">
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
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900">
        <div className="h-full w-full overflow-auto">
          <div className="flex pb-6 gap-4 h-full min-w-max">
            {stages.map((stage: LeadStage) => (
              <div
                key={stage}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 flex flex-col min-w-[280px] w-80 border border-gray-200 dark:border-gray-700"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStageColor(stage as LeadStage)}`}>
                      {getStageLabel(stage)}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {getLeadsByStage(stage).length}
                    </span>
                  </div>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>

                <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  ${getTotalValue(stage).toLocaleString()}
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto">
                  {getLeadsByStage(stage).map((lead: Lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e: React.DragEvent) => handleDragStart(e, lead.id)}
                      className="cursor-move"
                    >
                      <LeadCard
                        lead={lead}
                        onClick={() => {
                          // Navigate to lead profile
                          navigate(`/leads/${lead.id}`);
                        }}
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