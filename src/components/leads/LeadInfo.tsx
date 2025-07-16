import React from 'react';
import { Lead } from '../../contexts/DataContext';
import { 
  User, 
  Building2, 
  Mail, 
  Phone, 
  Calendar, 
  DollarSign,
  Clock,
  Target
} from 'lucide-react';
import { Communication } from '../../contexts/DataContext';

interface LeadInfoProps {
  lead: Lead;
}

const LeadInfo: React.FC<LeadInfoProps> = ({ lead }) => {
  const getStageColor = (stage: string) => {
    const colors = {
      'new': 'bg-gray-100 text-gray-800',
      'contacted': 'bg-blue-100 text-blue-800',
      'qualified': 'bg-yellow-100 text-yellow-800',
      'proposal': 'bg-purple-100 text-purple-800',
      'closed-won': 'bg-green-100 text-green-800',
      'closed-lost': 'bg-red-100 text-red-800'
    };
    return colors[stage as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStageLabel = (stage: string) => {
    const labels = {
      'new': 'New Lead',
      'contacted': 'Contacted',
      'qualified': 'Qualified',
      'proposal': 'Proposal',
      'closed-won': 'Closed Won',
      'closed-lost': 'Closed Lost'
    };
    return labels[stage as keyof typeof labels] || stage;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Full Name</p>
                  <p className="font-medium text-gray-900">{lead.name}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Building2 className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Company</p>
                  <p className="font-medium text-gray-900">{lead.company}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium text-gray-900">{lead.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium text-gray-900">{lead.phone}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Deal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <DollarSign className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Deal Value</p>
                  <p className="font-medium text-gray-900">${lead.value.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Target className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Stage</p>
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStageColor(lead.stage)}`}>
                    {getStageLabel(lead.stage)}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Last Contact</p>
                  <p className="font-medium text-gray-900">{formatDate(lead.lastContact)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="font-medium text-gray-900">{formatDate(lead.createdAt)}</p>
                </div>
              </div>
            </div>
          </div>

          {lead.notes && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
              <p className="text-gray-700">{lead.notes}</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Total Communications</span>
                <span className="font-medium">{lead.communications.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Emails Sent</span>
                <span className="font-medium">
                  {lead.communications.filter((c: Communication) => c.type === 'email').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Calls Made</span>
                <span className="font-medium">
                  {lead.communications.filter((c: Communication) => c.type === 'call').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Text Messages</span>
                <span className="font-medium">
                  {lead.communications.filter((c: Communication) => c.type === 'text').length}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Assigned Agent</h3>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{lead.assignedAgent}</p>
                <p className="text-sm text-gray-500">Sales Agent</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadInfo;