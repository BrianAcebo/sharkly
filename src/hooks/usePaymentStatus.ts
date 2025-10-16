import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { useToast } from './useToast';
import {
  fetchWalletStatus,
  createWalletTopupIntent,
  fetchAutoRechargeSettings,
  updateAutoRechargeSettings,
  type WalletStatusResponse,
  type AutoRechargeSettings
} from '../api/billing';

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

export function usePaymentStatus({ autoRefresh = true }: { autoRefresh?: boolean } = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [walletStatus, setWalletStatus] = useState<WalletStatusResponse | null>(null);
  const [autoRecharge, setAutoRecharge] = useState<AutoRechargeSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastWalletStatusRef = useRef<WalletStatusResponse | null>(null);

  const fetchPaymentStatus = useCallback(async () => {
    if (!user?.organization_id) {
      setPaymentStatus(null);
      setWalletStatus(null);
      lastWalletStatusRef.current = null;
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const {
        data: { session }
      } = await (await import('../utils/supabaseClient')).supabase.auth.getSession();
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
      try {
        const ws = await fetchWalletStatus({
          organizationId: user.organization_id,
          accessToken: session.access_token
        });
        setWalletStatus(ws);
        lastWalletStatusRef.current = ws;
        const settings = await fetchAutoRechargeSettings({
          organizationId: user.organization_id,
          accessToken: session.access_token
        });
        setAutoRecharge(settings);
      } catch (e) {
        // ignore wallet status error
      }

    } catch (error) {
      console.error('Error fetching payment status:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch payment status');
      toast.error(error instanceof Error ? error.message : 'Failed to fetch payment status');
    } finally {
      setIsLoading(false);
    }
  }, [user?.organization_id, toast]);

  useEffect(() => {
    if (autoRefresh) {
      fetchPaymentStatus();
    }
  }, [autoRefresh, fetchPaymentStatus]);

  const checkResumeEligibility = useCallback(async () => {
    if (!user?.organization_id) {
      return false;
    }

    try {
      const {
        data: { session }
      } = await (await import('../utils/supabaseClient')).supabase.auth.getSession();
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

  const startTopup = useCallback(async (params?: { amountCents?: number; autoConfirm?: boolean; metadata?: Record<string, string> }) => {
    if (!user?.organization_id) throw new Error('No organization');

    const {
      data: { session }
    } = await (await import('../utils/supabaseClient')).supabase.auth.getSession();

    if (!session) {
      throw new Error('Not authenticated');
    }

    return createWalletTopupIntent({
      organizationId: user.organization_id,
      accessToken: session.access_token,
      amountCents: params?.amountCents,
      autoConfirm: params?.autoConfirm,
      metadata: params?.metadata
    });
  }, [user?.organization_id]);

  const refreshWallet = useCallback(async (): Promise<WalletStatusResponse | null> => {
    if (!user?.organization_id) {
      setWalletStatus(null);
      setAutoRecharge(null);
      return null;
    }

    try {
      const {
        data: { session }
      } = await (await import('../utils/supabaseClient')).supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      const [status, settings] = await Promise.all([
        fetchWalletStatus({ organizationId: user.organization_id, accessToken: session.access_token }),
        fetchAutoRechargeSettings({ organizationId: user.organization_id, accessToken: session.access_token })
      ]);

      setWalletStatus(status);
      lastWalletStatusRef.current = status;
      setAutoRecharge(settings);
      return status;
    } catch (err) {
      console.warn('Failed to refresh wallet status', err);
      return null;
    }
  }, [user?.organization_id]);

  const saveAutoRecharge = useCallback(
    async (payload: {
      enabled?: boolean;
      amount_cents?: number;
      threshold_cents?: number;
      payment_method_id?: string | null;
    }) => {
      if (!user?.organization_id) {
        throw new Error('No organization');
      }

      const {
        data: { session }
      } = await (await import('../utils/supabaseClient')).supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      const updated = await updateAutoRechargeSettings({
        organizationId: user.organization_id,
        accessToken: session.access_token,
        ...payload
      });

      setAutoRecharge(updated);
      return updated;
    },
    [user?.organization_id]
  );

  const setWalletTopUpAmount = useCallback(
    async (amountCents: number) => {
      if (!user?.organization_id) {
        throw new Error('No organization');
      }

      const {
        data: { session }
      } = await (await import('../utils/supabaseClient')).supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      const resp = await fetch(`/api/organizations/${user.organization_id}/wallet`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ top_up_amount_cents: amountCents })
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to update wallet settings');
      }

      await refreshWallet();
    },
    [user?.organization_id, refreshWallet]
  );

  const setWalletThreshold = useCallback(
    async (thresholdCents: number) => {
      if (!user?.organization_id) {
        throw new Error('No organization');
      }

      const {
        data: { session }
      } = await (await import('../utils/supabaseClient')).supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      const resp = await fetch(`/api/organizations/${user.organization_id}/wallet`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ threshold_cents: thresholdCents })
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to update wallet settings');
      }

      await refreshWallet();
    },
    [user?.organization_id, refreshWallet]
  );

  return {
    paymentStatus,
    walletStatus,
    lastWalletStatus: lastWalletStatusRef.current,
    autoRecharge,
    isLoading,
    error,
    refetch: fetchPaymentStatus,
    refreshWallet,
    checkResumeEligibility,
    startTopup,
    saveAutoRecharge,
    setWalletTopUpAmount,
    setWalletThreshold
  };
}
