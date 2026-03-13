import { useEffect, useState } from 'react';
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

export const useAudit = (siteId: string | undefined) => {
	const [audit, setAudit] = useState<AuditResult | null>(null);
	const [history, setHistory] = useState<AuditHistoryItem[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isInProgress, setIsInProgress] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [lastRefresh, setLastRefresh] = useState<number>(Date.now());

	const fetchLatestAudit = async () => {
		if (!siteId) return;

		setIsLoading(true);
		setError(null);

		try {
			const {
				data: { session }
			} = await supabase.auth.getSession();
			if (!session?.access_token) return;
			const response = await api.get(`/api/audit/${siteId}/latest`, {
				headers: { Authorization: `Bearer ${session.access_token}` }
			});
			if (!response.ok) {
				throw new Error('Failed to fetch audit');
			}

			const data = await response.json();
			setAudit(data.audit);
			setIsInProgress(data.inProgress || false);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to fetch audit');
		} finally {
			setIsLoading(false);
		}
	};

	const fetchAuditHistory = async () => {
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
	};

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
			// Poll for results
			setTimeout(() => {
				fetchLatestAudit();
				fetchAuditHistory();
			}, 2000);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to start audit');
		} finally {
			setIsLoading(false);
		}
	};

	// Fetch on mount and when siteId changes
	useEffect(() => {
		fetchLatestAudit();
		fetchAuditHistory();
	}, [siteId]);

	// Poll if in progress
	useEffect(() => {
		if (!isInProgress || !siteId) return;

		const interval = setInterval(() => {
			fetchLatestAudit();
		}, 3000);

		return () => clearInterval(interval);
	}, [isInProgress, siteId]);

	return {
		audit,
		history,
		isLoading,
		isInProgress,
		error,
		runAudit,
		refetch: () => {
			setLastRefresh(Date.now());
			fetchLatestAudit();
			fetchAuditHistory();
		}
	};
};
