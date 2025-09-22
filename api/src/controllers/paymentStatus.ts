import { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient';
import { isOrganizationInGoodStanding, isOrganizationBehindOnPayments, getOrganizationStatusMessage, getOrganizationIssueReason } from '../utils/paymentStatus';

/**
 * Get payment status for an organization
 */
export const getPaymentStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { organizationId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!organizationId) {
      return res.status(400).json({ error: 'Missing organizationId' });
    }

    // Check if user has access to this organization
    const { data: userOrg, error: userOrgError } = await supabase
      .from('user_organizations')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single();

    if (userOrgError || !userOrg) {
      return res.status(403).json({ error: 'Access denied to this organization' });
    }

    // Get organization data
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const paymentStatus = {
      isInGoodStanding: isOrganizationInGoodStanding(org),
      isBehindOnPayments: isOrganizationBehindOnPayments(org),
      statusMessage: getOrganizationStatusMessage(org),
      issueReason: getOrganizationIssueReason(org),
      organization: {
        id: org.id,
        name: org.name,
        org_status: org.org_status,
        stripe_status: org.stripe_status,
        payment_action_required: org.payment_action_required,
        dunning_enabled: org.dunning_enabled,
        last_payment_failed_at: org.last_payment_failed_at,
        payment_retry_count: org.payment_retry_count,
        next_payment_retry_at: org.next_payment_retry_at,
        payment_failure_reason: org.payment_failure_reason
      }
    };

    res.json(paymentStatus);

  } catch (error) {
    console.error('Error getting payment status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Check if organization can be resumed after payment
 */
export const checkResumeEligibility = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { organizationId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!organizationId) {
      return res.status(400).json({ error: 'Missing organizationId' });
    }

    // Check if user has access to this organization
    const { data: userOrg, error: userOrgError } = await supabase
      .from('user_organizations')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single();

    if (userOrgError || !userOrg) {
      return res.status(403).json({ error: 'Access denied to this organization' });
    }

    // Get organization data
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const canResume = isOrganizationBehindOnPayments(org) && 
                     (org.org_status === 'payment_required' || org.org_status === 'past_due');

    res.json({
      canResume,
      currentStatus: org.org_status,
      reason: canResume ? 'Organization can be resumed after payment' : getOrganizationIssueReason(org)
    });

  } catch (error) {
    console.error('Error checking resume eligibility:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get organizations that need payment attention (admin endpoint)
 */
export const getOrganizationsNeedingPaymentAttention = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is admin (you might want to implement proper admin check)
    // For now, we'll just check if they have access to any organization
    const { data: userOrgs, error: userOrgsError } = await supabase
      .from('user_organizations')
      .select('organization_id, role')
      .eq('user_id', userId);

    if (userOrgsError || !userOrgs || userOrgs.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get organizations with payment issues
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('*')
      .in('id', userOrgs.map(uo => uo.organization_id))
      .in('org_status', ['payment_required', 'past_due']);

    if (orgsError) {
      console.error('Error fetching organizations with payment issues:', orgsError);
      return res.status(500).json({ error: 'Failed to fetch organizations' });
    }

    const organizationsWithIssues = orgs.map(org => ({
      id: org.id,
      name: org.name,
      org_status: org.org_status,
      stripe_status: org.stripe_status,
      payment_action_required: org.payment_action_required,
      last_payment_failed_at: org.last_payment_failed_at,
      payment_retry_count: org.payment_retry_count,
      next_payment_retry_at: org.next_payment_retry_at,
      payment_failure_reason: org.payment_failure_reason,
      statusMessage: getOrganizationStatusMessage(org),
      issueReason: getOrganizationIssueReason(org)
    }));

    res.json({
      organizations: organizationsWithIssues,
      count: organizationsWithIssues.length
    });

  } catch (error) {
    console.error('Error getting organizations needing payment attention:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
