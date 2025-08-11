import React from 'react';
import { Lead } from '../../types/leads';
import { Building2, DollarSign, Calendar, User } from 'lucide-react';
import { Badge } from '../ui/badge';
import { LEAD_PRIORITIES } from '../../utils/constants';

interface PipelineLeadCardProps {
  lead: Lead;
  onClick: () => void;
}

const PipelineLeadCard: React.FC<PipelineLeadCardProps> = ({ lead, onClick }) => {
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case LEAD_PRIORITIES.LOW:
        return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800';
      case LEAD_PRIORITIES.MEDIUM:
        return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800';
      case LEAD_PRIORITIES.HIGH:
        return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800';
      case LEAD_PRIORITIES.CRITICAL:
        return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case LEAD_PRIORITIES.LOW:
        return 'Low';
      case LEAD_PRIORITIES.MEDIUM:
        return 'Medium';
      case LEAD_PRIORITIES.HIGH:
        return 'High';
      case LEAD_PRIORITIES.CRITICAL:
        return 'Critical';
      default:
        return 'Unknown';
    }
  };

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 cursor-pointer group"
    >
      {/* Header with name and priority */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
            {lead.name}
          </h3>
          {lead.company && (
            <div className="flex items-center space-x-1 mt-1">
              <Building2 className="h-3 w-3 text-gray-400 flex-shrink-0" />
              <span className="text-xs text-gray-600 dark:text-gray-300 truncate">{lead.company}</span>
            </div>
          )}
        </div>
        <Badge 
          variant="outline" 
          className={`ml-2 flex-shrink-0 text-xs px-2 py-1 ${getPriorityColor(lead.priority || 'low')}`}
        >
          {getPriorityLabel(lead.priority || 'low')}
        </Badge>
      </div>

      {/* Value and last contact */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-1">
          <DollarSign className="h-3 w-3 text-green-500 flex-shrink-0" />
          <span className="text-sm font-semibold text-green-600 dark:text-green-400">
            ${lead.value?.toLocaleString() || '0'}
          </span>
        </div>
        <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400">
          <Calendar className="h-3 w-3" />
          <span className="text-xs">{formatDate(lead.last_contact)}</span>
        </div>
      </div>

      {/* Contact info */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center space-x-1 truncate">
          <User className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{lead.email || 'No email'}</span>
        </div>
        <div className="flex-shrink-0 ml-2">
          <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
            {lead.communications?.length || 0} comms
          </span>
        </div>
      </div>
    </div>
  );
};

export default PipelineLeadCard;
