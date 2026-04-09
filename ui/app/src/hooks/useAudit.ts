import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../utils/api';
import { supabase } from '../utils/supabaseClient';

export interface AuditCrawlabilityCheck {
	isCrawlable: boolean;
	siteReachable: boolean;
	dnsResolvable: boolean;
	sslValid: boolean;
	statusCode: number;
	robotsTxtExists: boolean;
	botAllowed: boolean;
	responseTime: number;
	issues: Array<{
		type: 'critical' | 'warning';
		title: string;
		message: string;
		solution: string;
	}>;
}

export interface AuditCrawlResults {
	totalPagesCrawled: number;
	totalIssuesFound: number;
	criticalIssues: number;
	warningIssues: number;
	infoIssues: number;
	avgResponseTime: number;
	pagesWithSSL: number;
	indexablePages: number;
	issuesByType: Record<string, number>;
}

export interface AuditDomainAuthority {
	estimated: number;
	method: string;
	confidence: 'low' | 'medium' | 'high';
	error?: string;
}

export interface AuditCoreWebVitals {
	lcpEstimate: number;
	clsEstimate: number;
	inpEstimate: number;
	status: 'good' | 'needs_improvement' | 'poor';
	error?: string;
}

export interface AuditIndexationStatus {
	pagesIndexed: number | null;
	totalPages: number;
	estimatedCrawlBudget: string;
	gscConnected: boolean;
	error?: string;
}

export interface AuditResult {
	id: string;
	siteId: string;
	createdAt: string;
	crawlabilityCheck: AuditCrawlabilityCheck;
	crawlResults: AuditCrawlResults;
	domainAuthority: AuditDomainAuthority;
	coreWebVitals: AuditCoreWebVitals;
	indexationStatus: AuditIndexationStatus;
	overallScore: number;
	healthStatus: 'critical' | 'warning' | 'good';
	recommendations: string[];
	apiErrors?: Record<string, string>;
}

export interface AuditHistoryItem {
	id: string;
	overall_score: number;
	health_status: string;
	created_at: string;
	crawl_total_pages: number;
	crawl_total_issues: number;
}

/** `latest` = dashboard card: fetch GET /latest only. Otherwise: list (no snapshot) vs detail (uuid). */
export const useAudit = (siteId: string | undefined, snapshotId?: string | null | 'latest') => {
	const [audit, setAudit] = useState<AuditResult | null>(null);
	const [history, setHistory] = useState<AuditHistoryItem[]>([]);
	// True until the first fetch for this site/mode finishes — avoids empty/detail flash.
	const [isLoading, setIsLoading] = useState(() => Boolean(siteId));
	const [isInProgress, setIsInProgress] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const isLatestCard = snapshotId === 'latest';
	const isListMode = !isLatestCard && (snapshotId == null || snapshotId === '');
	const isDetailMode = !isLatestCard && !isListMode && !!snapshotId;
	const isDetailModeRef = useRef(isDetailMode);
	isDetailModeRef.current = isDetailMode;

	// Reset when switching sites or list ↔ detail so we never flash stale data.
	useEffect(() => {
		setAudit(null);
		setError(null);
		if (!siteId) {
			setIsLoading(false);
			setHistory([]);
			return;
		}
		setIsLoading(true);
	}, [siteId, snapshotId]);

	const fetchAuditHistory = useCallback(async () => {
		if (!siteId) return;

		try {
			const {
				data: { session }
			} = await supabase.auth.getSession();
			if (!session?.access_token) return;
			const response = await api.get(`/api/audit/${siteId}/history`, {
				headers: { Authorization: `Bearer ${session.access_token}` }
			});
			if (!response.ok) {
				throw new Error('Failed to fetch history');
			}

			const data = await response.json();
			setHistory(data.audits || []);
		} catch (err) {
			console.error('Failed to fetch audit history:', err);
		}
	}, [siteId]);

	const fetchLatestFromApi = useCallback(async () => {
		if (!siteId) return null;

		const {
			data: { session }
		} = await supabase.auth.getSession();
		if (!session?.access_token) return null;

		const response = await api.get(`/api/audit/${siteId}/latest`, {
			headers: { Authorization: `Bearer ${session.access_token}` }
		});
		if (!response.ok) {
			throw new Error('Failed to fetch audit');
		}
		return response.json() as Promise<{ audit: AuditResult | null; inProgress?: boolean }>;
	}, [siteId]);

	const fetchDetailAudit = useCallback(async () => {
		if (!siteId || !snapshotId || snapshotId === 'latest') return;

		setIsLoading(true);
		setError(null);

		try {
			const {
				data: { session }
			} = await supabase.auth.getSession();
			if (!session?.access_token) return;

			const response = await api.get(`/api/audit/${siteId}/snapshot/${snapshotId}`, {
				headers: { Authorization: `Bearer ${session.access_token}` }
			});
			if (!response.ok) {
				throw new Error(response.status === 404 ? 'Report not found' : 'Failed to fetch audit');
			}

			const data = await response.json();
			setAudit(data.audit);
			setIsInProgress(data.inProgress || false);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to fetch audit');
			setAudit(null);
		} finally {
			setIsLoading(false);
		}
	}, [siteId, snapshotId]);

	const loadListPage = useCallback(async () => {
		if (!siteId) return;

		setIsLoading(true);
		setError(null);
		setAudit(null);

		try {
			await fetchAuditHistory();
			const data = await fetchLatestFromApi();
			setIsInProgress(data?.inProgress || false);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load reports');
		} finally {
			setIsLoading(false);
		}
	}, [siteId, fetchAuditHistory, fetchLatestFromApi]);

	const loadLatestCard = useCallback(async () => {
		if (!siteId) return;

		setIsLoading(true);
		setError(null);

		try {
			const data = await fetchLatestFromApi();
			setAudit(data?.audit ?? null);
			setIsInProgress(data?.inProgress || false);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to fetch audit');
			setAudit(null);
		} finally {
			setIsLoading(false);
		}
	}, [siteId, fetchLatestFromApi]);

	useEffect(() => {
		if (!siteId) return;

		if (isLatestCard) {
			loadLatestCard();
			return;
		}
		if (isListMode) {
			loadListPage();
			return;
		}
		if (isDetailMode) {
			fetchDetailAudit();
		}
	}, [siteId, snapshotId, isLatestCard, isListMode, isDetailMode, loadLatestCard, loadListPage, fetchDetailAudit]);

	// Poll while a run is in progress (list + dashboard card; not detail view)
	useEffect(() => {
		if (!isInProgress || !siteId || isDetailMode) return;

		const interval = setInterval(() => {
			if (isLatestCard) {
				loadLatestCard();
			} else if (isListMode) {
				loadListPage();
			}
		}, 3000);

		return () => clearInterval(interval);
	}, [isInProgress, siteId, isDetailMode, isLatestCard, isListMode, loadLatestCard, loadListPage]);

	const runAudit = async () => {
		if (!siteId) return;

		setIsLoading(true);
		setError(null);

		try {
			const response = await api.post(`/api/audit/${siteId}/run`, {});
			if (!response.ok) {
				throw new Error('Failed to start audit');
			}

			setIsInProgress(true);
			setTimeout(() => {
				if (isLatestCard) {
					loadLatestCard();
				} else if (!isDetailModeRef.current) {
					loadListPage();
				}
			}, 2000);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to start audit');
		} finally {
			setIsLoading(false);
		}
	};

	return {
		audit,
		history,
		isLoading,
		isInProgress,
		error,
		runAudit,
		isListMode,
		isDetailMode,
		refetch: () => {
			if (isLatestCard) loadLatestCard();
			else if (isListMode) loadListPage();
			else if (isDetailMode) fetchDetailAudit();
		}
	};
};
