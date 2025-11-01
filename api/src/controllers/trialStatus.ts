import { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';
import { OrganizationRow } from '../types/billing.js';

export interface TrialStatusResponse {
  isOnTrial: boolean;
  trialEndDate: string | null;
  daysRemaining: number | null;
  isExpired: boolean;
  trialEndFormatted: string | null;
  statusMessage: string;
  isEndingSoon: boolean;
  warningLevel: 'none' | 'warning' | 'danger';
}

function getTrialStatus(organization: OrganizationRow | null): TrialStatusResponse {
  if (!organization || !organization.trial_end) {
    return {
      isOnTrial: false,
      trialEndDate: null,
      daysRemaining: null,
      isExpired: false,
      trialEndFormatted: null,
      statusMessage: 'No active trial found.',
      isEndingSoon: false,
      warningLevel: 'none'
    };
  }

  const now = new Date();
  const trialEndDate = new Date(organization.trial_end);

  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const startOfUtcDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const nowDay = startOfUtcDay(now);
  const endDay = startOfUtcDay(trialEndDate);
  const daysRemaining = Math.floor((endDay.getTime() - nowDay.getTime()) / MS_PER_DAY);
  
  const isExpired = daysRemaining < 0;
  const isOnTrial = !isExpired && organization.stripe_status === 'trialing';

  let statusMessage = 'No active trial found.';
  if (isOnTrial) {
    if (daysRemaining === 0) {
      statusMessage = 'Your 7-day pay-as-you-go trial ends today!';
    } else if (daysRemaining === 1) {
      statusMessage = 'Your 7-day pay-as-you-go trial ends tomorrow!';
    } else if (daysRemaining <= 7) {
      statusMessage = `Your 7-day pay-as-you-go trial ends in ${daysRemaining} days.`;
    } else {
      statusMessage = `Your 7-day pay-as-you-go trial ends on ${trialEndDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}.`;
    }
  } else if (isExpired) {
    statusMessage = 'Your 7-day pay-as-you-go trial has ended. Please update your subscription to continue using the service.';
  }

  const isEndingSoon = isOnTrial && daysRemaining !== null && daysRemaining <= 3;
  
  let warningLevel: 'none' | 'warning' | 'danger' = 'none';
  if (isOnTrial) {
    if (daysRemaining !== null) {
      if (daysRemaining <= 1) {
        warningLevel = 'danger';
      } else if (daysRemaining <= 3) {
        warningLevel = 'warning';
      }
    }
  }

  return {
    isOnTrial,
    trialEndDate: organization.trial_end,
    daysRemaining: isOnTrial ? daysRemaining : null,
    isExpired,
    trialEndFormatted: trialEndDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    statusMessage,
    isEndingSoon,
    warningLevel
  };
}

export const getTrialStatusForOrg = async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;
    const userId = (req as { user: { id: string } }).user.id;

    if (!orgId) {
      return res.status(400).json({ 
        error: 'Organization ID is required' 
      });
    }

    // Get organization with billing information
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        owner_id,
        stripe_customer_id,
        stripe_subscription_id,
        stripe_status,
        status,
        plan_code,
        plan_price_cents,
        included_seats,
        included_credits,
        current_period_start,
        current_period_end,
        trial_end,
        cancel_at_period_end,
        created_at,
        updated_at
      `)
      .eq('id', orgId)
      .single();

    if (orgError) {
      console.error('Error fetching organization:', orgError);
      return res.status(500).json({ 
        error: 'Failed to fetch organization' 
      });
    }

    if (!organization) {
      return res.status(404).json({ 
        error: 'Organization not found' 
      });
    }

    // Check if user has access to this organization
    const { data: userOrg, error: userOrgError } = await supabase
      .from('user_organizations')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', orgId)
      .single();

    if (userOrgError || !userOrg) {
      return res.status(403).json({ 
        error: 'Access denied' 
      });
    }

    const trialStatus = getTrialStatus(organization as unknown as OrganizationRow);

    res.json(trialStatus);
  } catch (error) {
    console.error('Error getting trial status:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
};
