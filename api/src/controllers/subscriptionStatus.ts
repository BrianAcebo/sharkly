import { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';
import Stripe from 'stripe';
import { unixToISO } from '../types/billing.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

export const getSubscriptionStatus = async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    // First, get the organization and verify ownership
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select()
      .eq('id', organizationId)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: 'Organization not found' });
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

    // If we have a Stripe subscription ID, fetch the latest data from Stripe
    let stripeData = null;
    if (org.stripe_subscription_id) {
      try {
        const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
        
        stripeData = {
          id: subscription.id,
          status: subscription.status,
          trial_end: subscription.trial_end ? unixToISO(subscription.trial_end) : null,
          cancel_at_period_end: subscription.cancel_at_period_end,
          created: unixToISO(subscription.created),
          ended_at: subscription.ended_at ? unixToISO(subscription.ended_at) : null,
        };

        // Update the organization with the latest Stripe data
        const updateData = {
          stripe_status: subscription.status,
          trial_end: subscription.trial_end ? unixToISO(subscription.trial_end) : null,
          updated_at: new Date().toISOString()
        };

        await supabase
          .from('organizations')
          .update(updateData)
          .eq('id', organizationId);

      } catch (stripeError) {
        console.error('Error fetching subscription from Stripe:', stripeError);
        // Continue with database data if Stripe fetch fails
      }
    }

    // Calculate trial status based on Stripe's authoritative signals
    const now = new Date();
    const trialEndDate = org.trial_end ? new Date(org.trial_end) : null;
    
    // Trial is active if stripe_status = 'trialing' and now() < trial_end
    const isOnTrial = org.stripe_status === 'trialing' && 
                     trialEndDate && 
                     now < trialEndDate;
    
    // Trial has ended if now() >= trial_end (regardless of status)
    const trialHasEnded = trialEndDate && now >= trialEndDate;
    
    // Calculate days remaining (only if still on trial)
    const daysRemaining = isOnTrial && trialEndDate ? 
      Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 3600 * 24)) : 
      null;
    
    // Determine trial status
    let trialStatus = 'none';
    if (isOnTrial) {
      trialStatus = 'active';
    } else if (trialHasEnded) {
      trialStatus = 'ended';
    } else if (org.stripe_status === 'trialing' && !trialEndDate) {
      trialStatus = 'invalid'; // trialing status but no trial_end date
    }

    const response = {
      organization: {...org},
      subscription: {
        id: org.stripe_subscription_id,
        status: org.stripe_status,
        trial_end: org.trial_end,
        current_period_start: org.current_period_start,
        current_period_end: org.current_period_end,
        is_on_trial: isOnTrial,
        trial_has_ended: trialHasEnded,
        trial_status: trialStatus,
        days_remaining: daysRemaining,
        trial_expired: trialHasEnded,
      },
      stripe_data: stripeData,
      user_role: userOrg.role
    };

    res.json(response);

  } catch (error) {
    console.error('Error fetching subscription status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
