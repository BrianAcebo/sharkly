import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { OrganizationRow } from '../types/billing';
import type { SeatSummary, SeatSummaryResponse } from '../types/organization';
import { supabase } from '../utils/supabaseClient';
import { api } from '../utils/api';
import type { PlanCode, StripeSubStatus } from '../types/billing';

interface SubscriptionStatusResponse {
  organization: {
    id: string;
    name: string;
    plan_code: PlanCode | null;
    plan_price_cents: number | null;
    included_seats: number | null;
    included_credits: number | null;
  };
  subscription: {
    id: string | null;
    status: StripeSubStatus | null;
    trial_end: string | null;
    is_on_trial: boolean;
    trial_has_ended: boolean;
    trial_status: 'none' | 'active' | 'ended' | 'invalid';
    days_remaining: number | null;
    trial_expired: boolean;
  };
  stripe_data: Record<string, unknown> | null;
  user_role: string;
}

export function useOrganization() {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<OrganizationRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seatSummary, setSeatSummary] = useState<SeatSummary | null>(null);

  const fetchOrganization = useCallback(async () => {
    if (!user?.organization_id) {
      setOrganization(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const response = await api.get(`/api/subscription/${user.organization_id}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch subscription status');
      }

      const data: SubscriptionStatusResponse = await response.json();
      
      // Convert API response to OrganizationRow format
      const orgData: OrganizationRow = {
        id: data.organization.id,
        name: data.organization.name,
        owner_id: null,
        website: null,
        industry: null,
        ein: null,
        address_street: null,
        address_city: null,
        address_state: null,
        address_zip: null,
        address_country: null,
        tz: 'UTC',
        stripe_customer_id: null,
        stripe_subscription_id: data.subscription.id,
        stripe_status: data.subscription.status,
        // Use server-reported status; fall back to 'pending' if missing
        status:
          ((data.organization as unknown as { status?: string })?.status ?? 'pending') as OrganizationRow['status'],
        plan_code: data.organization.plan_code,
        plan_price_cents: data.organization.plan_price_cents,
        included_seats: data.organization.included_seats,
        included_credits: (data.organization as unknown as { included_credits?: number | null })?.included_credits ?? null,
        included_credits_monthly: (data.organization as unknown as { included_credits_monthly?: number | null })?.included_credits_monthly ?? ((data.organization as unknown as { included_credits?: number | null })?.included_credits ?? null),
        included_credits_remaining: (data.organization as unknown as { included_credits_remaining?: number | null })?.included_credits_remaining ?? null,
        included_chat_messages_monthly: (data.organization as unknown as { included_chat_messages_monthly?: number | null })?.included_chat_messages_monthly ?? null,
        chat_messages_remaining: (data.organization as unknown as { chat_messages_remaining?: number | null })?.chat_messages_remaining ?? null,
        trial_end: data.subscription.trial_end,
        stripe_trial_end: data.subscription.trial_end ?? null,
        payment_action_required: null,
        dunning_enabled: null,
        last_payment_failed_at: null,
        payment_retry_count: null,
        next_payment_retry_at: null,
        payment_failure_reason: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setOrganization(orgData);

      try {
        const seatResp = await api.get(`/api/organizations/${data.organization.id}/seats`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });
        if (!seatResp.ok) {
          throw new Error('Failed to load seat summary');
        }
        const seatData: SeatSummaryResponse = await seatResp.json();
        setSeatSummary(seatData.summary);
      } catch (seatError) {
        console.error('Failed to load seat summary', seatError);
        setSeatSummary(null);
      }
    } catch (err) {
      console.error('Error in fetchOrganization:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch organization data');
      setOrganization(null);
      setSeatSummary(null);
    } finally {
      setLoading(false);
    }
  }, [user?.organization_id]);

  useEffect(() => {
    fetchOrganization();
  }, [fetchOrganization]);

  return {
    organization,
    loading,
    error,
    refetch: fetchOrganization,
    seatSummary
  };
}
