import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useBreadcrumbs } from '../hooks/useBreadcrumbs';
import { supabase } from '../utils/supabaseClient';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Building2, 
  MessageSquare, 
  Phone, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import BrandForm from '../components/sms/BrandForm';
import CampaignForm from '../components/sms/CampaignForm';
import TollFreeForm from '../components/sms/TollFreeForm';
import { VerificationStatusResponse } from '../types/smsVerification';

const PhoneSmsVerification: React.FC = () => {
  const { user } = useAuth();
  const { setTitle } = useBreadcrumbs();
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setTitle('Phone & SMS Verification');
    if (user?.organization_id) {
      fetchVerificationStatus();
    }
  }, [user?.organization_id]);

  const fetchVerificationStatus = async () => {
    if (!user?.organization_id) return;

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('You must be logged in to view verification status');
        return;
      }

      const response = await fetch(`/api/sms/verification-status?orgId=${user.organization_id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch verification status');
      }

      const data = await response.json();
      if (data.ok) {
        setVerificationStatus(data.data);
      } else {
        toast.error(data.error || 'Failed to fetch verification status');
      }
    } catch (error) {
      console.error('Error fetching verification status:', error);
      toast.error('Failed to fetch verification status');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshStatus = async () => {
    if (!user?.organization_id) return;

    try {
      setRefreshing(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('You must be logged in to refresh status');
        return;
      }

      const response = await fetch('/api/sms/refresh-status', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orgId: user.organization_id })
      });

      if (!response.ok) {
        throw new Error('Failed to refresh status');
      }

      const data = await response.json();
      if (data.ok) {
        setVerificationStatus(data.data);
        toast.success('Status refreshed successfully');
      } else {
        toast.error(data.error || 'Failed to refresh status');
      }
    } catch (error) {
      console.error('Error refreshing status:', error);
      toast.error('Failed to refresh status');
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getStatusText = (status: string | null) => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'pending':
        return 'Pending';
      default:
        return 'Not Started';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Phone & SMS Verification
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Verify your business for better SMS deliverability and higher send rates
          </p>
        </div>
        <Button
          onClick={handleRefreshStatus}
          disabled={refreshing}
          variant="outline"
          className="flex items-center space-x-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Status</span>
        </Button>
      </div>

      {/* Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Want better SMS deliverability?
            </h3>
            <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
              Verify your business. It's optional, but highly recommended to reduce carrier filtering and unlock higher send rates.
            </p>
          </div>
        </div>
      </div>

      {/* Status Overview */}
      {verificationStatus && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Verification Status
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* A2P 10DLC Status */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <span className="font-medium text-gray-900 dark:text-white">A2P 10DLC</span>
                  <Badge className={getStatusColor(verificationStatus.a2p.status)}>
                    {getStatusIcon(verificationStatus.a2p.status)}
                    <span className="ml-1">{getStatusText(verificationStatus.a2p.status)}</span>
                  </Badge>
                </div>
                {verificationStatus.a2p.reason && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {verificationStatus.a2p.reason}
                  </p>
                )}
              </div>

              {/* Toll-Free Status */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Phone className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <span className="font-medium text-gray-900 dark:text-white">Toll-Free</span>
                  <Badge className={getStatusColor(verificationStatus.tollfree.status)}>
                    {getStatusIcon(verificationStatus.tollfree.status)}
                    <span className="ml-1">{getStatusText(verificationStatus.tollfree.status)}</span>
                  </Badge>
                </div>
                {verificationStatus.tollfree.reason && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {verificationStatus.tollfree.reason}
                  </p>
                )}
              </div>
            </div>

            {/* Technical Details */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Technical Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Subaccount:</span>
                  <span className="ml-2 font-mono text-gray-900 dark:text-white">
                    {verificationStatus.subaccountSid ? 
                      `...${verificationStatus.subaccountSid.slice(-6)}` : 
                      'Not configured'
                    }
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Messaging Service:</span>
                  <span className="ml-2 font-mono text-gray-900 dark:text-white">
                    {verificationStatus.messagingServiceSid ? 
                      `...${verificationStatus.messagingServiceSid.slice(-6)}` : 
                      'Not configured'
                    }
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">TrustHub Profile:</span>
                  <span className="ml-2 font-mono text-gray-900 dark:text-white">
                    {verificationStatus.trusthubProfileSid ? 
                      `...${verificationStatus.trusthubProfileSid.slice(-6)}` : 
                      'Not created'
                    }
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Verification Forms */}
      <Tabs defaultValue="brand" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="brand" className="flex items-center space-x-2">
            <Building2 className="h-4 w-4" />
            <span>Business</span>
          </TabsTrigger>
          <TabsTrigger value="campaign" className="flex items-center space-x-2">
            <MessageSquare className="h-4 w-4" />
            <span>Campaign</span>
          </TabsTrigger>
          <TabsTrigger value="tollfree" className="flex items-center space-x-2">
            <Phone className="h-4 w-4" />
            <span>Toll-Free</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="brand">
          <BrandForm 
            orgId={user?.organization_id || ''} 
            onSave={() => fetchVerificationStatus()}
            userRole={user?.role}
          />
        </TabsContent>

        <TabsContent value="campaign">
          <CampaignForm 
            orgId={user?.organization_id || ''} 
            onSave={() => fetchVerificationStatus()}
            onSubmit10DLC={() => fetchVerificationStatus()}
            userRole={user?.role}
          />
        </TabsContent>

        <TabsContent value="tollfree">
          <TollFreeForm 
            orgId={user?.organization_id || ''} 
            onSubmit={() => fetchVerificationStatus()}
            userRole={user?.role}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PhoneSmsVerification;
