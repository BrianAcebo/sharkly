export const STRIPE_CUSTOMER_PORTAL_URL = import.meta.env.VITE_STRIPE_CUSTOMER_PORTAL_URL;

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
