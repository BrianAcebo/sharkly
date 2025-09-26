import { OrganizationRow } from '../types/billing';

export interface TrialStatus {
  isOnTrial: boolean;
  trialEndDate: Date | null;
  daysRemaining: number | null;
  isExpired: boolean;
  trialEndFormatted: string | null;
}

/**
 * Check if an organization is currently on a free trial
 * Uses Stripe data as source of truth with proper trial detection logic
 */
export function getTrialStatus(organization: OrganizationRow | null): TrialStatus {
  if (!organization || !organization.trial_end) {
    return {
      isOnTrial: false,
      trialEndDate: null,
      daysRemaining: null,
      isExpired: false,
      trialEndFormatted: null
    };
  }

  const now = new Date();
  const trialEndDate = new Date(organization.trial_end);

  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const startOfUtcDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const nowDay = startOfUtcDay(now);
  const endDay = startOfUtcDay(trialEndDate);

  const calendarDiffDays = Math.floor((endDay.getTime() - nowDay.getTime()) / MS_PER_DAY);

  // Trial is considered active while Stripe says trialing and end date is today or in the future
  const isOnTrial = organization.stripe_status === 'trialing' && calendarDiffDays >= 0;

  // Expired if end date (in UTC calendar terms) is in the past
  const isExpired = calendarDiffDays < 0;

  // Days remaining in calendar days (0 = ends today)
  const daysRemaining = isOnTrial ? calendarDiffDays : null;

  return {
    isOnTrial,
    trialEndDate,
    daysRemaining,
    isExpired,
    trialEndFormatted: trialEndDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  };
}

/**
 * Get a user-friendly trial status message
 */
export function getTrialStatusMessage(organization: OrganizationRow | null): string {
  if (!organization) {
    return 'No organization found.';
  }

  // Handle dunning edge case - incomplete status means no longer on trial
  if (organization.stripe_status === 'incomplete') {
    return 'Please add a payment method to continue using the service.';
  }

  const status = getTrialStatus(organization);
  
  // Trial has ended (regardless of status)
  if (status.isExpired) {
    return 'Your free trial has ended. Please update your subscription to continue using the service.';
  }
  
  // Not on trial
  if (!status.isOnTrial) {
    return 'No active trial found.';
  }

  // On trial - show days remaining
  if (status.daysRemaining === null) {
    return 'Trial status unavailable.';
  }

  if (status.daysRemaining <= 0) {
    return 'Your free trial ends today!';
  } else if (status.daysRemaining === 1) {
    return 'Your free trial ends tomorrow!';
  } else if (status.daysRemaining <= 7) {
    return `Your free trial ends in ${status.daysRemaining} days.`;
  } else {
    return `Your free trial ends on ${status.trialEndFormatted}.`;
  }
}

/**
 * Check if trial is ending soon (within 3 days)
 */
export function isTrialEndingSoon(organization: OrganizationRow | null): boolean {
  const status = getTrialStatus(organization);
  return status.isOnTrial && status.daysRemaining !== null && status.daysRemaining <= 3;
}

/**
 * Get trial warning level for UI styling
 */
export function getTrialWarningLevel(organization: OrganizationRow | null): 'none' | 'warning' | 'danger' {
  if (!organization) {
    return 'none';
  }

  // Handle dunning edge case - incomplete status means no longer on trial
  if (organization.stripe_status === 'incomplete') {
    return 'danger';
  }

  const status = getTrialStatus(organization);
  
  if (!status.isOnTrial) {
    return 'none';
  }
  
  if (status.daysRemaining === null) {
    return 'warning';
  }
  
  if (status.daysRemaining <= 1) {
    return 'danger';
  } else if (status.daysRemaining <= 3) {
    return 'warning';
  }
  
  return 'none';
}

/**
 * Check if the app should be blocked due to trial/subscription issues
 */
export function shouldBlockApp(organization: OrganizationRow | null, hasStripeStatus: boolean): boolean {
  if (!organization) {
    return false;
  }

  if (!hasStripeStatus) {
    return false;
  }

  if (!organization.stripe_status) {
    return true;
  }

  return !['active', 'trialing'].includes(organization.stripe_status);
}

/**
 * Check if user needs to add a payment method
 */
export function needsPaymentMethod(organization: OrganizationRow | null): boolean {
  if (!organization) {
    return false;
  }

  // Need payment if subscription is incomplete
  if (organization.stripe_status === 'incomplete') {
    return true;
  }

  // Need payment if trial expired and no active subscription
  const status = getTrialStatus(organization);
  if (status.isExpired && organization.stripe_status !== 'active') {
    return true;
  }

  return false;
}
