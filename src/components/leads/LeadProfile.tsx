import React, { useState } from 'react';
import { ArrowLeft, Edit, Trash2, Plus, MessageCircle, Phone } from 'lucide-react';
import LeadInfo from './LeadInfo';
import CommunicationHistory from '../communications/CommunicationHistory';
import CommunicationComposer from '../communications/CommunicationComposer';
import CallConfirmation from './CallConfirmation';
import EditLeadModal from './EditLeadModal';
import { useNavigate, Link } from 'react-router';
import { Button } from '../ui/button';
import { deleteLeadService } from '../../utils/leadService';
import { toast } from 'sonner';
import { Lead } from '../../types/leads';

const LeadProfile: React.FC<{ lead: Lead }> = ({ lead }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'communications'>('info');
  const [showComposer, setShowComposer] = useState(false);
  const [composerType, setComposerType] = useState<'email' | 'text' | 'call'>('email');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCallConfirm, setShowCallConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const navigate = useNavigate();
  
  const tabs = [
    { id: 'info', label: 'Lead Information' },
    { id: 'communications', label: `Communications (${lead?.communications?.length || 0})` }
  ];

  const handleCompose = (type: 'email' | 'text' | 'call') => {
    setComposerType(type);
    setShowComposer(true);
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/pipeline');
    }
  };

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!lead) return;
    
    try {
      await deleteLeadService(lead.id);
      toast.success('Lead deleted successfully!');
      navigate('/pipeline');
    } catch (error) {
      console.error('Error deleting lead:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete lead';
      toast.error(`Failed to delete lead: ${errorMessage}`);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  if (!lead) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Lead not found</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto scrollbar-branded">
      <div className="bg-white dark:bg-gray-800 shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={handleBack}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{lead?.name}</h1>
              <p className="text-gray-600 dark:text-gray-400">{lead?.company}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="secondary"
              onClick={() => handleCompose('email')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Email
            </Button>
            <Link to={`/leads/${lead.id}/sms`}>
              <Button variant="secondary">
                <MessageCircle className="h-4 w-4 mr-2" />
                SMS
              </Button>
            </Link>
            <Button
              variant="secondary"
              onClick={() => setShowCallConfirm(true)}
            >
              <Phone className="h-4 w-4 mr-2" />
              Call
            </Button>
            <Button variant="outline" onClick={handleEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'info' | 'communications')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="flex-1">
        {activeTab === 'info' && lead && <LeadInfo lead={lead} />}
        {activeTab === 'communications' && lead && <CommunicationHistory lead={lead} />}
      </div>

      {showComposer && (
        <CommunicationComposer
          leadId={lead?.id || ''}
          type={composerType}
          onClose={() => setShowComposer(false)}
        />
      )}

      {showCallConfirm && lead && (
        <CallConfirmation
          leadName={lead.name || 'Unknown Lead'}
          leadPhone={lead.phone || ''}
          leadId={lead.id}
          onClose={() => setShowCallConfirm(false)}
          onCallInitiated={(callSid) => {
            console.log('Call initiated with SID:', callSid);
            // You could log this call in your communications history
          }}
        />
      )}

      {showEditModal && lead && (
        <EditLeadModal
          lead={lead}
          onClose={() => setShowEditModal(false)}
          onLeadUpdated={() => {
            toast.success('Lead updated successfully!');
            // You could refresh the lead data here if needed
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
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
                  Delete Lead
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  This action cannot be undone.
                </p>
              </div>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Are you sure you want to delete "{lead?.name}"?
              </p>
              {lead?.company && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Company: {lead.company}
                </p>
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
};

export default LeadProfile;