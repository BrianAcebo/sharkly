import React, { useState } from 'react';
import { ArrowLeft, Edit, Trash2, Plus } from 'lucide-react';
import LeadInfo from './LeadInfo';
import CommunicationHistory from '../communications/CommunicationHistory';
import CommunicationComposer from '../communications/CommunicationComposer';
import { useLeads } from '../../hooks/useLeads';
import { useNavigate } from 'react-router';
import { Button } from '../ui/button';

const LeadProfile: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'info' | 'communications'>('info');
  const [showComposer, setShowComposer] = useState(false);
  const [composerType, setComposerType] = useState<'email' | 'text' | 'call'>('email');
  const { selectedLead, setSelectedLead } = useLeads();
  const navigate = useNavigate();
  const tabs = [
    { id: 'info', label: 'Lead Information' },
    { id: 'communications', label: `Communications (${selectedLead?.communications.length || 0})` }
  ];

  const handleCompose = (type: 'email' | 'text' | 'call') => {
    setComposerType(type);
    setShowComposer(true);
  };

  const handleBack = () => {
    setSelectedLead(null);
    navigate('/pipeline');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white dark:bg-gray-800 shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              startIcon={<ArrowLeft className="h-5 w-5" />}
              onClick={handleBack}
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedLead?.name}</h1>
              <p className="text-gray-600 dark:text-gray-400">{selectedLead?.company}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="secondary"
              startIcon={<Plus className="h-4 w-4" />}
              onClick={() => handleCompose('email')}
            >
              Email
            </Button>
            <Button
              variant="success"
              startIcon={<Plus className="h-4 w-4" />}
              onClick={() => handleCompose('text')}
            >
              Text
            </Button>
            <Button
              variant="warning"
              startIcon={<Plus className="h-4 w-4" />}
              onClick={() => handleCompose('call')}
            >
              Call
            </Button>
            <Button variant="icon" startIcon={<Edit className="h-4 w-4" />} />
            <Button variant="danger" startIcon={<Trash2 className="h-4 w-4" />} />
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

      <div className="flex-1 overflow-hidden">
        {activeTab === 'info' && selectedLead &&<LeadInfo lead={selectedLead} />}
        {activeTab === 'communications' && selectedLead &&<CommunicationHistory lead={selectedLead} />}
      </div>

      {showComposer && (
        <CommunicationComposer
          leadId={selectedLead?.id || ''}
          type={composerType}
          onClose={() => setShowComposer(false)}
        />
      )}
    </div>
  );
};

export default LeadProfile;