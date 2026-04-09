import type { BrandTheme } from '../types';

/** Matches `video-service/config/brands/sharkly.json` (canonical local brand file). */
export const sharklyTheme: BrandTheme = {
	brandId: 'sharkly',
	displayName: 'Sharkly',
	colors: {
		background: '#0a0a0a',
		primaryText: '#f5f3ed',
		accent: '#2563eb',
		gold: '#d97706',
		muted: '#6b7280',
	},
	fonts: {
		heading: 'Montserrat',
		body: 'Lato',
	},
};
