/**
 * Single source of truth for "do we know this site's DA?"
 *
 * - Technical audit sets `last_audit_at` + `domain_authority_estimated`.
 * - Moz refresh / onboarding sets `domain_authority` (may be 0 for new domains).
 *
 * We treat DA as **unknown** when there has been no audit and Moz DA is still 0
 * (placeholder / never refreshed), so we don't substitute org-level guesses.
 */

export type SiteDomainAuthorityResolution = {
	/** Measured value 0–100, or null when unknown */
	value: number | null;
	known: boolean;
	source: 'audit' | 'moz' | 'none';
};

export type SiteDomainAuthorityRow = {
	last_audit_at?: string | null;
	domain_authority_estimated?: number | null;
	domain_authority?: number | null;
};

export function resolveSiteDomainAuthority(site: SiteDomainAuthorityRow | null | undefined): SiteDomainAuthorityResolution {
	if (!site) {
		return { value: null, known: false, source: 'none' };
	}

	const mozDa = Math.max(0, Math.min(100, Math.round(Number(site.domain_authority ?? 0))));
	const auditDa = Math.max(0, Math.min(100, Math.round(Number(site.domain_authority_estimated ?? 0))));
	const hasAudit = site.last_audit_at != null && String(site.last_audit_at).trim() !== '';

	if (hasAudit) {
		return { value: auditDa, known: true, source: 'audit' };
	}
	if (mozDa > 0) {
		return { value: mozDa, known: true, source: 'moz' };
	}
	return { value: null, known: false, source: 'none' };
}
