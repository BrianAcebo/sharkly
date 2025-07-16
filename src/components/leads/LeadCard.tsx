import React from 'react';
import { Lead } from '../../contexts/DataContext';
import { Building2, Phone, Mail, Calendar, DollarSign } from 'lucide-react';

interface LeadCardProps {
  lead: Lead;
  onClick: () => void;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, onClick }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // const getStatusColor = (stage: Lead['stage']) => {
  //   const colors = {
  //     'new': 'bg-gray-100 text-gray-800',
  //     'contacted': 'bg-blue-100 text-blue-800',
  //     'qualified': 'bg-yellow-100 text-yellow-800',
  //     'proposal': 'bg-purple-100 text-purple-800',
  //     'closed-won': 'bg-green-100 text-green-800',
  //     'closed-lost': 'bg-red-100 text-red-800'
  //   };
  //   return colors[stage as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  // };

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow duration-200 cursor-pointer"
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
            ${lead.value.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Mail className="h-3 w-3 text-gray-400" />
          <span className="text-xs text-gray-600 dark:text-gray-300 truncate">{lead.email}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Phone className="h-3 w-3 text-gray-400" />
          <span className="text-xs text-gray-600 dark:text-gray-300">{lead.phone}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Calendar className="h-3 w-3 text-gray-400" />
          <span className="text-xs text-gray-600 dark:text-gray-300">
            Last contact: {formatDate(lead.lastContact)}
          </span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-xs text-gray-600 dark:text-gray-300">{lead.assignedAgent}</span>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {lead.communications.length} interactions
          </span>
        </div>
      </div>

      {lead.notes && (
        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-600 rounded text-xs text-gray-600 dark:text-gray-300">
          {lead.notes.length > 60 ? `${lead.notes.substring(0, 60)}...` : lead.notes}
        </div>
      )}
    </div>
  );
};

export default LeadCard;