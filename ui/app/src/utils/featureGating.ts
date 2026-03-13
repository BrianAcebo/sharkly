import { OrganizationRow } from '../types/billing';
import type { PlanCode } from '../types/billing';

/**
 * Feature gating based on Stripe subscription status and plan tier
 * Uses Stripe data as source of truth
 */

/** Tier order for comparison (lower index = lower tier) */
const TIER_ORDER = ['builder', 'growth', 'scale', 'pro'] as const;
type Tier = (typeof TIER_ORDER)[number];

/**
 * Normalize plan_code to base tier (strip _test suffix)
 */
function toBaseTier(planCode: PlanCode | string | null): Tier | null {
  if (!planCode || typeof planCode !== 'string') return null;
  const base = planCode.replace(/_test$/, '');
  return TIER_ORDER.includes(base as Tier) ? (base as Tier) : null;
}

/**
 * Check if organization has at least the required plan tier.
 * Order: builder < growth < scale < pro
 */
export function hasPlanAtLeast(organization: OrganizationRow | null, requiredTier: Tier): boolean {
  if (!organization?.plan_code) return false;
  const plan = toBaseTier(organization.plan_code);
  if (!plan) return false;
  const requiredIdx = TIER_ORDER.indexOf(requiredTier);
  const currentIdx = TIER_ORDER.indexOf(plan);
  if (requiredIdx < 0 || currentIdx < 0) return false;
  return currentIdx >= requiredIdx;
}

/**
 * Check if organization has Fin (AI Assistant) access.
 * Regular plan feature: included when plan has included_chat_messages_monthly > 0.
 */
export function hasFinAccess(organization: OrganizationRow | null): boolean {
  if (!organization) return false;
  return (organization.included_chat_messages_monthly ?? 0) > 0;
}

/**
 * Check if organization can access Performance page (traffic chart, page-level GSC data)
 */
export function canAccessPerformance(organization: OrganizationRow | null): boolean {
  return hasPlanAtLeast(organization, 'growth');
}

/**
 * Check if organization can access Rankings page (keyword positions, CTR, Navboost)
 */
export function canAccessRankings(organization: OrganizationRow | null): boolean {
  return hasPlanAtLeast(organization, 'growth');
}

/**
 * Check if organization can access Technical page (full audit, EEAT, toxic links, etc.)
 */
export function canAccessTechnical(organization: OrganizationRow | null): boolean {
  return hasPlanAtLeast(organization, 'scale');
}

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
