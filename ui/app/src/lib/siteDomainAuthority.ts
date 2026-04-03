/**
 * Client mirror of `api/src/utils/siteDomainAuthority.ts` — keep logic in sync.
 */

export type SiteDomainAuthorityResolution = {
	value: number | null;
	known: boolean;
	source: 'audit' | 'moz' | 'none';
};

export type SiteDomainAuthorityInput = {
	lastAuditAt?: string | null;
	domainAuthorityEstimated?: number | null;
	domainAuthority?: number | null;
};

export function resolveSiteDomainAuthority(site: SiteDomainAuthorityInput | null | undefined): SiteDomainAuthorityResolution {
	if (!site) {
		return { value: null, known: false, source: 'none' };
	}

	const mozDa = Math.max(0, Math.min(100, Math.round(Number(site.domainAuthority ?? 0))));
	const auditDa = Math.max(0, Math.min(100, Math.round(Number(site.domainAuthorityEstimated ?? 0))));
	const hasAudit = site.lastAuditAt != null && String(site.lastAuditAt).trim() !== '';

	if (hasAudit) {
		return { value: auditDa, known: true, source: 'audit' };
	}
	if (mozDa > 0) {
		return { value: mozDa, known: true, source: 'moz' };
	}
	return { value: null, known: false, source: 'none' };
}
