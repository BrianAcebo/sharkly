import { OrganizationRow, OrgStatus } from '../types/billing.js';

/**
 * Check if an organization is in good standing (can access all features)
 */
export function isOrganizationInGoodStanding(organization: OrganizationRow | null): boolean {
  if (!organization) {
    return false;
  }

  // Check if organization status allows full access
  const goodStandingStatuses: OrgStatus[] = ['active'];
  return goodStandingStatuses.includes(organization.status);
}

/**
 * Check if an organization is behind on payments
 */
export function isOrganizationBehindOnPayments(organization: OrganizationRow | null): boolean {
  if (!organization) {
    return false;
  }

  // Check if organization has payment-related issues
  const paymentIssueStatuses: OrgStatus[] = ['payment_required', 'past_due'];
  return paymentIssueStatuses.includes(organization.status) || 
         organization.payment_action_required === true;
}

/**
 * Check if an organization is paused (but not due to payment issues)
 */
export function isOrganizationPaused(organization: OrganizationRow | null): boolean {
  if (!organization) {
    return false;
  }

  return organization.status === 'paused' && !isOrganizationBehindOnPayments(organization);
}

/**
 * Check if an organization is disabled
 */
export function isOrganizationDisabled(organization: OrganizationRow | null): boolean {
  if (!organization) {
    return false;
  }

  return organization.status === 'disabled';
}

/**
 * Get a user-friendly message explaining the organization's current status
 */
export function getOrganizationStatusMessage(organization: OrganizationRow | null): string {
  if (!organization) {
    return 'Organization not found';
  }

  switch (organization.status) {
    case 'active':
      return 'Organization is active and in good standing';
    
    case 'payment_required':
      return 'Payment action required. Please update your payment method to continue using the service.';
    
    case 'past_due':
      return 'Payment is past due. Please update your payment method to restore full access.';
    
    case 'paused':
      return 'Organization is paused. Contact support to resume service.';
    
    case 'disabled':
      return 'Organization is disabled. Contact support for assistance.';
    
    case 'deleted':
      return 'Organization has been deleted.';
    
    default:
      return 'Organization status unknown.';
  }
}

/**
 * Check if an organization can be manually resumed (not payment-related)
 */
export function canResumeOrganization(organization: OrganizationRow | null): boolean {
  if (!organization) {
    return false;
  }

  // Can only resume if paused (not due to payment issues)
  return organization.status === 'paused' && !isOrganizationBehindOnPayments(organization);
}

/**
 * Get the reason why an organization is not in good standing
 */
export function getOrganizationIssueReason(organization: OrganizationRow | null): string | null {
  if (!organization) {
    return 'Organization not found';
  }

  if (isOrganizationBehindOnPayments(organization)) {
    if (organization.payment_failure_reason) {
      return `Payment issue: ${organization.payment_failure_reason}`;
    }
    return 'Payment required to continue service';
  }

  if (isOrganizationPaused(organization)) {
    return 'Organization is paused';
  }

  if (isOrganizationDisabled(organization)) {
    return 'Organization is disabled';
  }

  return null;
}
