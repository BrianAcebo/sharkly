import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { AlertCircle, Info, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../utils/supabaseClient';
import { api } from '../../utils/api';

interface TollFreeFormProps {
  orgId: string;
  onSubmit: () => void;
  userRole?: string;
}

const TollFreeForm: React.FC<TollFreeFormProps> = ({ orgId, onSubmit, userRole }) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasBrandProfile, setHasBrandProfile] = useState(false);
  const [hasCampaignProfile, setHasCampaignProfile] = useState(false);
  const [formData, setFormData] = useState({
    est_monthly_messages: 1000,
    traffic_type: 'mixed' as 'transactional' | 'mixed'
  });

  useEffect(() => {
    if (orgId) {
      checkPrerequisites();
    }
  }, [orgId]);

  const checkPrerequisites = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('You must be logged in to check prerequisites');
        return;
      }

      // Check if brand and campaign profiles exist
      // TODO: Implement actual checks
      setHasBrandProfile(true); // Placeholder
      setHasCampaignProfile(true); // Placeholder
    } catch (error) {
      console.error('Error checking prerequisites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Check if user has permission to edit
    if (userRole && !['owner', 'admin'].includes(userRole)) {
      toast.error('Only organization owners and admins can edit SMS verification settings');
      return;
    }

    if (!hasBrandProfile || !hasCampaignProfile) {
      toast.error('Please complete Brand and Campaign profiles first');
      return;
    }

    try {
      setSubmitting(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('You must be logged in to submit Toll-Free verification');
        return;
      }

      const response = await api.post(
        '/api/sms/submit-tollfree',
        { orgId },
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit Toll-Free verification');
      }

      const data = await response.json();
      if (data.ok) {
        toast.success('Toll-Free verification submitted successfully');
        onSubmit();
      } else {
        toast.error(data.error || 'Failed to submit Toll-Free verification');
      }
    } catch (error) {
      console.error('Error submitting Toll-Free verification:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit Toll-Free verification');
    } finally {
      setSubmitting(false);
    }
  };

  // Check if user has permission to edit
  const canEdit = !userRole || ['owner', 'admin'].includes(userRole);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!canEdit) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Phone className="h-5 w-5" />
            <span>Toll-Free Verification</span>
          </CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Alternative to 10DLC for organizations with Toll-Free numbers
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Access Restricted
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Only organization owners and admins can edit SMS verification settings.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Phone className="h-5 w-5" />
          <span>Toll-Free Verification</span>
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Alternative to 10DLC for organizations with Toll-Free numbers
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Prerequisites Check */}
        {(!hasBrandProfile || !hasCampaignProfile) && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Prerequisites Required
                </h3>
                <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                  Please complete your Brand and Campaign profiles before submitting Toll-Free verification.
                </p>
                <div className="mt-2 space-y-1">
                  {!hasBrandProfile && (
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      • Brand profile incomplete
                    </p>
                  )}
                  {!hasCampaignProfile && (
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      • Campaign profile incomplete
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info Banner */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Toll-Free Verification
              </h3>
              <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                This will use your existing Brand and Campaign information to submit for Toll-Free verification.
                This is an alternative to 10DLC for organizations that prefer to use Toll-Free numbers.
              </p>
            </div>
          </div>
        </div>

        {/* Additional Fields for Toll-Free */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Toll-Free Specific Settings</h3>
          
          <div>
            <label htmlFor="est_monthly_messages" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Estimated Monthly Messages *
            </label>
            <input
              id="est_monthly_messages"
              type="number"
              value={formData.est_monthly_messages}
              onChange={(e) => setFormData(prev => ({ ...prev, est_monthly_messages: parseInt(e.target.value) || 0 }))}
              placeholder="1000"
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label htmlFor="traffic_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Traffic Type *
            </label>
            <Select
              value={formData.traffic_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, traffic_type: value as 'transactional' | 'mixed' }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transactional">Transactional</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Transactional: Only automated messages (confirmations, alerts). Mixed: Both transactional and promotional messages.
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={submitting || !hasBrandProfile || !hasCampaignProfile}
            className="flex items-center space-x-2"
          >
            {submitting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Phone className="h-4 w-4" />
            )}
            <span>{submitting ? 'Submitting...' : 'Submit Toll-Free Verification'}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TollFreeForm;
