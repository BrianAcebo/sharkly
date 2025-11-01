import { OrganizationRow } from '../types/billing';

/**
 * Feature gating based on Stripe subscription status
 * Uses Stripe data as source of truth
 */

/**
 * Check if organization has access to bundled features
 * For trials with "no bundled minutes", keep included quotas at 0 until stripe_status='active'
 */
export function hasBundledFeatures(organization: OrganizationRow | null): boolean {
  if (!organization) {
    return false;
  }

  // Only active subscriptions get bundled features
  // Trials and incomplete subscriptions don't get bundled features
  return organization.stripe_status === 'active';
}

/**
 * Check if organization can use pay-as-you-go features
 * Usage is allowed even during trials (pay-as-you-go)
 */
export function canUsePayAsYouGo(organization: OrganizationRow | null): boolean {
  if (!organization) {
    return false;
  }

  // Pay-as-you-go is allowed for active subscriptions and trials
  // Not allowed for incomplete, canceled, or past_due
  return ['active', 'trialing'].includes(organization.stripe_status || '');
}

/**
 * Check if organization needs to add payment method
 * Handles dunning edge case where payment method fails at conversion
 */
export function needsPaymentMethod(organization: OrganizationRow | null): boolean {
  if (!organization) {
    return false;
  }

  // Incomplete status means payment method is needed
  return organization.stripe_status === 'incomplete';
}

/**
 * Get effective quotas for the organization
 * Returns 0 for bundled features during trials, actual values for active subscriptions
 */
export function getEffectiveQuotas(organization: OrganizationRow | null): {
  includedSeats: number;
  includedCredits: number;
} {
  if (!organization) {
    return {
      includedSeats: 0,
      includedCredits: 0
    };
  }

  // If not active, return 0 for bundled features (pay-as-you-go only)
  if (!hasBundledFeatures(organization)) {
    return {
      includedSeats: 0,
      includedCredits: 0
    };
  }

  // Active subscription gets full bundled features
  return {
    includedSeats: organization.included_seats || 0,
    includedCredits: organization.included_credits || 0,
  };
}

/**
 * Check if organization is in a valid state to use the service
 */
export function canUseService(organization: OrganizationRow | null): boolean {
  if (!organization) {
    return false;
  }

  // Can use service if active, trialing, or can use pay-as-you-go
  return organization.stripe_status === 'active' || 
         organization.stripe_status === 'trialing' ||
         canUsePayAsYouGo(organization);
}
