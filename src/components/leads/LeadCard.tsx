import React from 'react';
import { Lead } from '../../types/leads';
import { Building2, Phone, Mail, Calendar, DollarSign } from 'lucide-react';
import { LeadStage, getStageColor, getStageLabel } from '../../utils/stages';
import { Button } from '../ui/button';

interface LeadCardProps {
  lead: Lead;
  onClick: () => void;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, onClick }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg dark:shadow-gray-700 transition-shadow duration-200 cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{lead.name}</h3>
          <div className="flex items-center space-x-1 mt-1">
            <Building2 className="h-3 w-3 text-gray-400" />
            <span className="text-xs text-gray-600 dark:text-gray-300">{lead.company}</span>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <DollarSign className="h-3 w-3 text-green-500" />
          <span className="text-xs font-medium text-green-600">
            ${lead.value?.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Mail className="h-3 w-3 text-gray-400" />
          <span className="text-xs text-gray-600 dark:text-gray-300 truncate">{lead.email || '-'}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Phone className="h-3 w-3 text-gray-400" />
          <span className="text-xs text-gray-600 dark:text-gray-300">{lead.phone || '-'}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Calendar className="h-3 w-3 text-gray-400" />
          <span className="text-xs text-gray-600 dark:text-gray-300">
            Last contact: {formatDate(lead.last_contact || '')}
          </span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className={`capitalize px-2 py-1 rounded-full text-xs font-medium ${getStageColor(lead.stage as LeadStage)}`}>
              {getStageLabel(lead.stage)}
            </span>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {lead.communications.length} interactions
          </span>
        </div>
      </div>

      {lead.notes && (
        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Notes: <i>{lead.notes.length > 60 ? `${lead.notes.substring(0, 60)}...` : lead.notes}</i>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        <a href={`/leads/${lead.id}`}>
          <Button variant="outline" size="xs" className="w-full">
            View Lead
          </Button>
        </a>
      </div>
    </div>
  );
};

export default LeadCard;