import { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';
import { OrgStatus } from '../types/billing.js';
import { isOrganizationInGoodStanding, isOrganizationBehindOnPayments } from '../utils/paymentStatus.js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

export const updateOrganizationStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { organizationId } = req.params;
    const { status, pauseStripeSubscription, resumeStripeSubscription } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!organizationId || !status) {
      return res.status(400).json({ error: 'Missing required fields: organizationId, status' });
    }

    // Validate status
    const validStatuses: OrgStatus[] = ['active', 'paused', 'disabled', 'deleted', 'payment_required', 'past_due'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be one of: active, paused, disabled, deleted, payment_required, past_due' });
    }

    // Check if user has permission to update organization status
    const { data: userOrg, error: userOrgError } = await supabase
      .from('user_organizations')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single();

    if (userOrgError || !userOrg) {
      return res.status(403).json({ error: 'Access denied to this organization' });
    }

    // Only owners can change organization status
    if (userOrg.role !== 'owner') {
      return res.status(403).json({ error: 'Only organization owners can change organization status' });
    }

    // Prevent manual changes to payment-related statuses
    if (status === 'payment_required' || status === 'past_due') {
      return res.status(400).json({ 
        error: 'Payment-related statuses can only be changed through payment processing. Please update your payment method to resolve payment issues.' 
      });
    }

    // Get organization data including payment status
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Check payment status before allowing resumption
    if (status === 'active' && org.status === 'paused') {
      // Only allow resumption if organization is in good standing with payments
      if (isOrganizationBehindOnPayments(org)) {
        return res.status(400).json({ 
          error: 'Cannot resume organization due to payment issues. Please resolve payment problems first by updating your payment method.' 
        });
      }
      
      // Additional check: ensure organization is in good standing
      if (!isOrganizationInGoodStanding(org)) {
        return res.status(400).json({ 
          error: 'Organization is not in good standing. Please resolve any outstanding issues before resuming.' 
        });
      }
    }

    // Handle Stripe subscription pausing/resuming
    if (org.stripe_subscription_id) {
      try {
        if (pauseStripeSubscription && status === 'paused') {
          // Pause Stripe subscription
          await stripe.subscriptions.update(org.stripe_subscription_id, {
            pause_collection: {
              behavior: 'void'
            }
          });
          console.log(`[STRIPE] Paused subscription ${org.stripe_subscription_id} for organization ${organizationId}`);
        } else if (resumeStripeSubscription && status === 'active') {
          // Resume Stripe subscription
          await stripe.subscriptions.update(org.stripe_subscription_id, {
            pause_collection: null
          });
          console.log(`[STRIPE] Resumed subscription ${org.stripe_subscription_id} for organization ${organizationId}`);
        }
      } catch (stripeError) {
        console.error('Error updating Stripe subscription:', stripeError);
        // Continue with organization status update even if Stripe fails
        // This ensures the organization status is still updated
      }
    }

    // Update organization status
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', organizationId);

    if (updateError) {
      console.error('Error updating organization status:', updateError);
      return res.status(500).json({ error: 'Failed to update organization status' });
    }

    console.log(`[status] Updated organization ${organizationId} status to ${status} by user ${userId}`);

    res.json({ 
      success: true, 
      message: `Organization ${status === 'active' ? 'resumed' : status === 'paused' ? 'paused' : 'status updated'} successfully` 
    });

  } catch (error) {
    console.error('Error updating organization status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getOrganizationStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { organizationId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!organizationId) {
      return res.status(400).json({ error: 'Missing organizationId' });
    }

    // Check if user has access to organization
    const { data: userOrg, error: userOrgError } = await supabase
      .from('user_organizations')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single();

    if (userOrgError || !userOrg) {
      return res.status(403).json({ error: 'Access denied to this organization' });
    }

    // Get organization status
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('status, name')
      .eq('id', organizationId)
      .single();

    if (orgError || !org) {
      console.error('[status_API] Organization not found:', { organizationId, orgError });
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({
      success: true,
      data: {
        status: org.status,
        name: org.name
      }
    });

  } catch (error) {
    console.error('Error getting organization status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const handlePaymentFailure = async (organizationId: string) => {
  try {
    console.log(`[PAYMENT_FAILURE] Handling payment failure for organization ${organizationId}`);

    // Update organization status to paused due to payment failure
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        status: 'paused',
        updated_at: new Date().toISOString()
      })
      .eq('id', organizationId);

    if (updateError) {
      console.error('Error updating organization status for payment failure:', updateError);
      return false;
    }

    // Get organization data to pause Stripe subscription
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('stripe_subscription_id')
      .eq('id', organizationId)
      .single();

    if (orgError || !org) {
      console.error('Organization not found for payment failure handling:', orgError);
      return false;
    }

    // Pause Stripe subscription if it exists
    if (org.stripe_subscription_id) {
      try {
        await stripe.subscriptions.update(org.stripe_subscription_id, {
          pause_collection: {
            behavior: 'void'
          }
        });
        console.log(`[STRIPE] Paused subscription ${org.stripe_subscription_id} due to payment failure for organization ${organizationId}`);
      } catch (stripeError) {
        console.error('Error pausing Stripe subscription for payment failure:', stripeError);
        // Continue even if Stripe fails
      }
    }

    console.log(`[PAYMENT_FAILURE] Successfully paused organization ${organizationId} due to payment failure`);
    return true;

  } catch (error) {
    console.error('Error handling payment failure:', error);
    return false;
  }
};
