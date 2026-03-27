/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_SENTRY_DSN?: string;
	readonly VITE_SENTRY_ENVIRONMENT?: string;
	/** Set in CI to the same value Sentry uses for the release (e.g. git SHA) */
	readonly VITE_SENTRY_RELEASE?: string;
}
