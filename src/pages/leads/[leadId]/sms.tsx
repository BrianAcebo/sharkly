import React, { useState, useEffect } from 'react';
import { ArrowLeft, MessageCircle, Phone } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { supabase } from '../../../utils/supabaseClient';
import MyNumberBadge from '../../../components/sms/MyNumberBadge';
import SmsThread from '../../../components/sms/SmsThread';
import SmsComposer from '../../../components/sms/SmsComposer';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  company?: string;
}

const LeadSmsPage: React.FC = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const [lead, setLead] = useState<Lead | null>(null);
  const [agentPhone, setAgentPhone] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch lead data
  useEffect(() => {
    if (!leadId) return;
    fetchLead();
  }, [leadId]);

  const fetchLead = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (error) throw error;

      setLead(data);
    } catch (err) {
      console.error('Error fetching lead:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch lead');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNumberChange = (phoneNumber: string) => {
    setAgentPhone(phoneNumber);
  };

  const handleSmsSent = () => {
    // Refresh the SMS thread
    setRefreshKey(prev => prev + 1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
            <span className="ml-4 text-lg text-gray-600 dark:text-gray-400">Loading lead...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <MessageCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Lead Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error || 'The lead you are looking for could not be found.'}
            </p>
            <Link
              to="/leads"
              className="inline-flex items-center px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Leads
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link
              to={`/leads/${leadId}`}
              className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Lead
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-brand-100 dark:bg-brand-900 rounded-full flex items-center justify-center">
              <MessageCircle className="h-6 w-6 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                SMS with {lead.first_name} {lead.last_name}
              </h1>
              <div className="flex items-center space-x-4 mt-2 text-gray-600 dark:text-gray-400">
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4" />
                  <span>{lead.phone}</span>
                </div>
                {lead.company && (
                  <span>• {lead.company}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* SMS Thread and Composer */}
          <div className="lg:col-span-2 space-y-6">
            {agentPhone ? (
              <>
                <SmsThread 
                  key={refreshKey}
                  agentPhone={agentPhone} 
                  leadPhone={lead.phone} 
                />
                <SmsComposer 
                  leadPhone={lead.phone} 
                  onSent={handleSmsSent}
                  disabled={!agentPhone}
                />
              </>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
                <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No Business Number
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  You need a business phone number to send and receive SMS messages.
                </p>
                <Link
                  to="/settings/number"
                  className="inline-flex items-center px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Get Business Number
                </Link>
              </div>
            )}
          </div>

          {/* Sidebar - Business Number Management */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Business Number
              </h3>
              <MyNumberBadge onNumberChange={handleNumberChange} />
            </div>
            
            {/* Lead Info Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Lead Information
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Name
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {lead.first_name} {lead.last_name}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Phone
                  </label>
                  <p className="text-gray-900 dark:text-white font-mono">
                    {lead.phone}
                  </p>
                </div>
                
                {lead.email && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {lead.email}
                    </p>
                  </div>
                )}
                
                {lead.company && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Company
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {lead.company}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* SMS Tips */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
                SMS Best Practices
              </h3>
              <ul className="space-y-2 text-blue-800 dark:text-blue-200 text-sm">
                <li>• Keep messages concise and clear</li>
                <li>• Include a clear call-to-action</li>
                <li>• Respond promptly to maintain engagement</li>
                <li>• Use professional but friendly tone</li>
                <li>• Avoid sending during late hours</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadSmsPage;
