/** GA4 measurement ID from repo-root env (see astro.config envDir). */
export function getGaMeasurementId(): string | undefined {
	return import.meta.env.PUBLIC_GA_MEASUREMENT_ID?.trim();
}

export function getFrontendBaseUrl(): string {
	return (import.meta.env.FRONTEND_URL ?? 'https://app.sharkly.co').replace(/\/$/, '');
}
