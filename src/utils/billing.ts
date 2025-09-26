export const STRIPE_CUSTOMER_PORTAL_URL = 'https://billing.stripe.com/p/login/test_fZu8wPeit9J33Yu4Kb2go00';

export type OrgRole = 'owner' | 'admin' | 'member' | string;

export const canManageBilling = (role?: OrgRole | null): boolean => {
  if (!role) {
    return false;
  }
  const normalized = role.toLowerCase();
  return normalized === 'owner' || normalized === 'admin';
};

export const startStripePortal = () => {
  window.open(STRIPE_CUSTOMER_PORTAL_URL, '_blank');
};
