import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useToast } from './useToast';
import { OrganizationRow } from '../types/billing';

interface PaymentStatus {
  isInGoodStanding: boolean;
  isBehindOnPayments: boolean;
  statusMessage: string;
  issueReason: string | null;
  organization: {
    id: string;
    name: string;
    org_status: string;
    stripe_status: string | null;
    payment_action_required: boolean | null;
    dunning_enabled: boolean | null;
    last_payment_failed_at: string | null;
    payment_retry_count: number | null;
    next_payment_retry_at: string | null;
    payment_failure_reason: string | null;
  };
}

export function usePaymentStatus() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentStatus = useCallback(async () => {
    if (!user?.organization_id) {
      setPaymentStatus(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data: { session } } = await (await import('../utils/supabaseClient')).supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/organizations/${user.organization_id}/payment-status`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch payment status');
      }

      const data = await response.json();
      setPaymentStatus(data);

    } catch (error) {
      console.error('Error fetching payment status:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch payment status');
      toast.error(error instanceof Error ? error.message : 'Failed to fetch payment status');
    } finally {
      setIsLoading(false);
    }
  }, [user?.organization_id, toast]);

  useEffect(() => {
    fetchPaymentStatus();
  }, [fetchPaymentStatus]);

  const checkResumeEligibility = useCallback(async () => {
    if (!user?.organization_id) {
      return false;
    }

    try {
      const { data: { session } } = await (await import('../utils/supabaseClient')).supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/organizations/${user.organization_id}/resume-eligibility`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to check resume eligibility');
      }

      const data = await response.json();
      return data.canResume;

    } catch (error) {
      console.error('Error checking resume eligibility:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to check resume eligibility');
      return false;
    }
  }, [user?.organization_id, toast]);

  return {
    paymentStatus,
    isLoading,
    error,
    refetch: fetchPaymentStatus,
    checkResumeEligibility
  };
}
