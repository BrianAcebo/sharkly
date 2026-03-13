import { useState, useEffect, useRef, useCallback } from 'react';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import {
	Search,
	RefreshCw,
	History,
	FileText,
	CreditCard,
	AlertTriangle,
	CheckCircle,
	XCircle,
	Loader2,
	ChevronDown,
	ChevronUp,
	Lock,
	ExternalLink,
	Eye,
	EyeOff,
	LogOut,
	Webhook,
	Receipt,
	Clock
} from 'lucide-react';
import PageMeta from '../../components/common/PageMeta';
import { useBreadcrumbs } from '../../hooks/useBreadcrumbs';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '../../components/ui/select';
import { api } from '../../utils/api';
import { supabase } from '../../utils/supabaseClient';

const ADMIN_SESSION_KEY = 'sharkly_admin_auth';
const ADMIN_SESSION_TIME_KEY = 'sharkly_admin_last_activity';
const SESSION_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes

interface Organization {
	id: string;
	name: string;
	plan_code: string;
	stripe_status: string | null;
	stripe_customer_id: string | null;
	stripe_subscription_id: string | null;
	created_at: string;
}

interface WebhookEvent {
	id: string;
	stripe_event_id: string;
	event_type: string;
	status: string;
	processing_error: string | null;
	received_at: string;
	processed_at: string | null;
}

interface SubscriptionSnapshot {
	id: string;
	stripe_subscription_id: string;
	event_type: string;
	status: string;
	current_period_start: string | null;
	current_period_end: string | null;
	cancel_at_period_end: boolean;
	created_at: string;
}

interface Invoice {
	id: string;
	stripe_invoice_id: string;
	status: string;
	amount_due: number;
	amount_paid: number;
	invoice_pdf: string | null;
	hosted_invoice_url: string | null;
	billing_reason: string | null;
	created_at: string;
}

interface Charge {
	id: string;
	stripe_charge_id: string;
	amount: number;
	amount_refunded: number;
	status: string;
	paid: boolean;
	refunded: boolean;
	receipt_url: string | null;
	card_brand: string | null;
	card_last4: string | null;
	stripe_created_at: string;
}

interface LedgerEntry {
	id: string;
	event_type: string;
	description: string;
	amount_cents: number | null;
	balance_impact: string;
	created_at: string;
}

interface PaymentFailure {
	id: string;
	failure_code: string | null;
	failure_message: string | null;
	decline_code: string | null;
	next_action: string | null;
	attempt_count: number;
	created_at: string;
}

interface AuditData {
	organization: Organization;
	webhook_events: WebhookEvent[];
	subscription_snapshots: SubscriptionSnapshot[];
	invoices: Invoice[];
	charges: Charge[];
	ledger: LedgerEntry[];
	payment_failures: PaymentFailure[];
}

// Helper to get auth headers
async function getAuthHeaders(): Promise<HeadersInit> {
	const {
		data: { session }
	} = await supabase.auth.getSession();
	return {
		'Content-Type': 'application/json',
		...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
	};
}

export default function StripeAudit() {
	const { setTitle } = useBreadcrumbs();

	// Auth state
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [authLoading, setAuthLoading] = useState(false);
	const [checkingSession, setCheckingSession] = useState(true);
	const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Search state
	const [searchQuery, setSearchQuery] = useState('');
	const [searchResults, setSearchResults] = useState<Organization[]>([]);
	const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
	const [auditData, setAuditData] = useState<AuditData | null>(null);
	const [loading, setLoading] = useState(false);
	const [searching, setSearching] = useState(false);
	const [syncing, setSyncing] = useState(false);

	// Filter state
	const [webhookTypeFilter, setWebhookTypeFilter] = useState<string>('all');

	// Collapsible sections
	const [webhooksExpanded, setWebhooksExpanded] = useState(true);
	const [snapshotsExpanded, setSnapshotsExpanded] = useState(false);
	const [invoicesExpanded, setInvoicesExpanded] = useState(true);
	const [chargesExpanded, setChargesExpanded] = useState(true);
	const [ledgerExpanded, setLedgerExpanded] = useState(true);
	const [failuresExpanded, setFailuresExpanded] = useState(true);

	// Logout function
	const handleLogout = useCallback(() => {
		setIsAuthenticated(false);
		sessionStorage.removeItem(ADMIN_SESSION_KEY);
		sessionStorage.removeItem(ADMIN_SESSION_TIME_KEY);
		setAuditData(null);
		setSearchResults([]);
		setSelectedOrgId(null);
		if (activityTimeoutRef.current) {
			clearTimeout(activityTimeoutRef.current);
		}
	}, []);

	// Reset activity timer
	const resetActivityTimer = useCallback(() => {
		if (!isAuthenticated) return;

		sessionStorage.setItem(ADMIN_SESSION_TIME_KEY, Date.now().toString());

		if (activityTimeoutRef.current) {
			clearTimeout(activityTimeoutRef.current);
		}

		activityTimeoutRef.current = setTimeout(() => {
			toast.warning('Session expired due to inactivity');
			handleLogout();
		}, SESSION_TIMEOUT_MS);
	}, [isAuthenticated, handleLogout]);

	// Check session on mount
	useEffect(() => {
		setTitle('Stripe Audit');

		const session = sessionStorage.getItem(ADMIN_SESSION_KEY);
		const lastActivity = sessionStorage.getItem(ADMIN_SESSION_TIME_KEY);

		if (session === 'true' && lastActivity) {
			const elapsed = Date.now() - parseInt(lastActivity, 10);
			if (elapsed < SESSION_TIMEOUT_MS) {
				setIsAuthenticated(true);
			} else {
				sessionStorage.removeItem(ADMIN_SESSION_KEY);
				sessionStorage.removeItem(ADMIN_SESSION_TIME_KEY);
			}
		}
		setCheckingSession(false);
	}, [setTitle]);

	// Set up activity listeners when authenticated
	useEffect(() => {
		if (!isAuthenticated) return;

		const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
		const handleActivity = () => resetActivityTimer();

		events.forEach((event) => {
			window.addEventListener(event, handleActivity);
		});

		resetActivityTimer();

		return () => {
			events.forEach((event) => {
				window.removeEventListener(event, handleActivity);
			});
			if (activityTimeoutRef.current) {
				clearTimeout(activityTimeoutRef.current);
			}
		};
	}, [isAuthenticated, resetActivityTimer]);

	const handleLogin = async () => {
		if (!password.trim()) return;
		setAuthLoading(true);
		try {
			const headers = await getAuthHeaders();
			const resp = await api.post('/api/billing/admin/verify-password', { password }, { headers });
			const result = await resp.json();
			if (result.valid) {
				setIsAuthenticated(true);
				sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
				sessionStorage.setItem(ADMIN_SESSION_TIME_KEY, Date.now().toString());
				toast.success('Access granted');
			} else {
				toast.error('Invalid password');
			}
		} catch {
			toast.error('Verification failed');
		} finally {
			setAuthLoading(false);
			setPassword('');
		}
	};

	const handleSearch = async () => {
		if (!searchQuery.trim()) return;
		setSearching(true);
		try {
			const headers = await getAuthHeaders();
			const resp = await api.get(
				`/api/billing/admin/refunds/lookup?query=${encodeURIComponent(searchQuery.trim())}`,
				{ headers }
			);
			if (!resp.ok) throw new Error('Search failed');
			const results = await resp.json();
			setSearchResults(results);
			if (results.length === 0) {
				toast.info('No organizations found');
			}
		} catch (error: unknown) {
			toast.error((error as Error).message || 'Search failed');
		} finally {
			setSearching(false);
		}
	};

	const loadAuditData = async (orgId: string) => {
		setLoading(true);
		setSelectedOrgId(orgId);
		try {
			const headers = await getAuthHeaders();

			// Get org info
			const orgResp = await api.get(`/api/billing/admin/refunds/audit/${orgId}`, { headers });
			if (!orgResp.ok) throw new Error('Failed to load org');
			const orgData = await orgResp.json();

			// Get webhook events
			const { data: webhookEvents } = await supabase
				.from('stripe_webhook_events')
				.select(
					'id, stripe_event_id, event_type, status, processing_error, received_at, processed_at'
				)
				.eq('org_id', orgId)
				.order('received_at', { ascending: false })
				.limit(50);

			// Get subscription snapshots
			const { data: snapshots } = await supabase
				.from('stripe_subscription_snapshots')
				.select(
					'id, stripe_subscription_id, event_type, status, current_period_start, current_period_end, cancel_at_period_end, created_at'
				)
				.eq('org_id', orgId)
				.order('created_at', { ascending: false })
				.limit(30);

			// Get invoices
			const { data: invoices } = await supabase
				.from('stripe_invoices')
				.select(
					'id, stripe_invoice_id, status, amount_due, amount_paid, invoice_pdf, hosted_invoice_url, billing_reason, created_at'
				)
				.eq('org_id', orgId)
				.order('created_at', { ascending: false })
				.limit(20);

			// Get charges
			const { data: charges } = await supabase
				.from('stripe_charges')
				.select(
					'id, stripe_charge_id, amount, amount_refunded, status, paid, refunded, receipt_url, card_brand, card_last4, stripe_created_at'
				)
				.eq('organization_id', orgId)
				.order('stripe_created_at', { ascending: false })
				.limit(20);

			// Get ledger
			const { data: ledger } = await supabase
				.from('stripe_subscription_ledger')
				.select('id, event_type, description, amount_cents, balance_impact, created_at')
				.eq('organization_id', orgId)
				.order('created_at', { ascending: false })
				.limit(50);

			// Get payment failures
			const { data: failures } = await supabase
				.from('stripe_payment_failures')
				.select(
					'id, failure_code, failure_message, decline_code, next_action, attempt_count, created_at'
				)
				.eq('organization_id', orgId)
				.order('created_at', { ascending: false })
				.limit(20);

			setAuditData({
				organization: orgData.organization,
				webhook_events: webhookEvents || [],
				subscription_snapshots: snapshots || [],
				invoices: invoices || [],
				charges: charges || [],
				ledger: ledger || [],
				payment_failures: failures || []
			});
		} catch (error: unknown) {
			toast.error((error as Error).message || 'Failed to load audit data');
		} finally {
			setLoading(false);
		}
	};

	const handleSyncFromStripe = async () => {
		if (!selectedOrgId) return;
		setSyncing(true);
		try {
			const headers = await getAuthHeaders();
			const resp = await api.post(
				'/api/billing/admin/stripe/sync',
				{ orgId: selectedOrgId },
				{ headers }
			);
			const result = await resp.json();

			if (!resp.ok) {
				throw new Error(result.error || 'Sync failed');
			}

			toast.success(
				`Synced: ${result.results?.invoices || 0} invoices, ${result.results?.charges || 0} charges`
			);

			// Reload audit data to show updated info
			await loadAuditData(selectedOrgId);
		} catch (error: unknown) {
			toast.error((error as Error).message || 'Sync failed');
		} finally {
			setSyncing(false);
		}
	};

	const formatDate = (dateStr: string) => {
		return new Date(dateStr).toLocaleString();
	};

	const formatCents = (cents: number) => {
		return `$${(cents / 100).toFixed(2)}`;
	};

	const openStripeCustomer = (customerId: string) => {
		window.open(`https://dashboard.stripe.com/customers/${customerId}`, '_blank');
	};

	const openStripeSubscription = (subId: string) => {
		window.open(`https://dashboard.stripe.com/subscriptions/${subId}`, '_blank');
	};

	// Get unique webhook event types for filter
	const webhookEventTypes = auditData?.webhook_events
		? [...new Set(auditData.webhook_events.map((e) => e.event_type))]
		: [];

	// Filter webhook events
	const filteredWebhookEvents =
		auditData?.webhook_events.filter(
			(e) => webhookTypeFilter === 'all' || e.event_type === webhookTypeFilter
		) || [];

	// Show loading while checking session
	if (checkingSession) {
		return (
			<div className="flex min-h-[60vh] items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-gray-400" />
			</div>
		);
	}

	// Password gate
	if (!isAuthenticated) {
		return (
			<>
				<PageMeta title="Stripe Audit | Sharkly" description="Stripe audit trail for support" />
				<div className="flex min-h-[60vh] items-center justify-center">
					<Card className="w-full max-w-sm">
						<CardHeader className="text-center">
							<div className="mx-auto mb-4 w-fit rounded-full bg-gray-100 p-3 dark:bg-gray-800">
								<Lock className="h-6 w-6" />
							</div>
							<CardTitle>Admin Access Required</CardTitle>
							<CardDescription>Enter the admin password to continue</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								<div className="relative">
									<Input
										type={showPassword ? 'text' : 'password'}
										placeholder="Password"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
										autoFocus
									/>
									<button
										type="button"
										className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
										onClick={() => setShowPassword(!showPassword)}
									>
										{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
									</button>
								</div>
								<Button className="w-full" onClick={handleLogin} disabled={authLoading}>
									{authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
									Unlock
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			</>
		);
	}

	return (
		<>
			<PageMeta title="Stripe Audit | Sharkly" description="Stripe audit trail for support" />
			<div className="mx-auto max-w-7xl space-y-6 p-6">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold">Stripe Audit Trail</h1>
					<Button variant="destructive" size="sm" onClick={handleLogout}>
						<LogOut className="mr-2 h-4 w-4" />
						Logout
					</Button>
				</div>

				{/* Search */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<Search className="h-4 w-4" />
							Search Organization
						</CardTitle>
						<CardDescription>Search by org ID, name, or Stripe customer ID</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex gap-2">
							<Input
								placeholder="Enter org ID, name, or Stripe customer ID..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
								className="flex-1"
							/>
							<Button onClick={handleSearch} disabled={searching}>
								{searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
							</Button>
						</div>

						{searchResults.length > 0 && (
							<div className="mt-4 space-y-2">
								{searchResults.map((org) => (
									<div
										key={org.id}
										className={`cursor-pointer rounded border p-3 transition-colors ${
											selectedOrgId === org.id
												? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
												: 'hover:bg-gray-50 dark:hover:bg-gray-800'
										}`}
										onClick={() => loadAuditData(org.id)}
									>
										<div className="flex items-center justify-between">
											<div>
												<div className="font-medium">{org.name}</div>
												<div className="font-mono text-xs text-gray-500">{org.id}</div>
											</div>
											<div className="flex items-center gap-2">
												<Badge variant="outline">{org.plan_code}</Badge>
												<Badge variant={org.stripe_status === 'active' ? 'default' : 'secondary'}>
													{org.stripe_status || 'no sub'}
												</Badge>
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>

				{/* Loading state */}
				{loading && (
					<div className="flex items-center justify-center py-12">
						<Loader2 className="h-8 w-8 animate-spin text-gray-400" />
					</div>
				)}

				{/* Audit Data */}
				{auditData && !loading && (
					<div className="space-y-6">
						{/* Organization Info */}
						<Card>
							<CardHeader>
								<div className="flex items-center justify-between">
									<CardTitle className="text-base">{auditData.organization.name}</CardTitle>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => loadAuditData(auditData.organization.id)}
									>
										<RefreshCw className="h-4 w-4" />
									</Button>
								</div>
							</CardHeader>
							<CardContent>
								<div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
									<div>
										<div className="text-xs text-gray-500">Plan</div>
										<div className="font-medium">{auditData.organization.plan_code}</div>
									</div>
									<div>
										<div className="text-xs text-gray-500">Status</div>
										<Badge
											variant={
												auditData.organization.stripe_status === 'active' ? 'default' : 'secondary'
											}
										>
											{auditData.organization.stripe_status || 'No subscription'}
										</Badge>
									</div>
									<div>
										<div className="text-xs text-gray-500">Customer ID</div>
										<div className="font-mono text-xs">
											{auditData.organization.stripe_customer_id || 'N/A'}
										</div>
									</div>
									<div>
										<div className="text-xs text-gray-500">Created</div>
										<div className="font-medium">
											{formatDate(auditData.organization.created_at)}
										</div>
									</div>
								</div>

								{/* Stripe Links & Actions */}
								{(auditData.organization.stripe_customer_id ||
									auditData.organization.stripe_subscription_id) && (
									<div className="flex flex-wrap gap-2 border-t pt-3">
										{auditData.organization.stripe_customer_id && (
											<Button
												variant="outline"
												size="sm"
												onClick={() =>
													openStripeCustomer(auditData.organization.stripe_customer_id!)
												}
											>
												<ExternalLink className="mr-1 h-3 w-3" />
												View Customer in Stripe
											</Button>
										)}
										{auditData.organization.stripe_subscription_id && (
											<Button
												variant="outline"
												size="sm"
												onClick={() =>
													openStripeSubscription(auditData.organization.stripe_subscription_id!)
												}
											>
												<ExternalLink className="mr-1 h-3 w-3" />
												View Subscription
											</Button>
										)}
										<Button
											variant="default"
											size="sm"
											onClick={handleSyncFromStripe}
											disabled={syncing}
										>
											{syncing ? (
												<Loader2 className="mr-1 h-3 w-3 animate-spin" />
											) : (
												<RefreshCw className="mr-1 h-3 w-3" />
											)}
											{syncing ? 'Syncing...' : 'Sync from Stripe'}
										</Button>
									</div>
								)}
							</CardContent>
						</Card>

						{/* Subscription Ledger (Timeline) */}
						<Card>
							<CardHeader
								className="cursor-pointer"
								onClick={() => setLedgerExpanded(!ledgerExpanded)}
							>
								<div className="flex items-center justify-between">
									<CardTitle className="flex items-center gap-2 text-base">
										<Clock className="h-4 w-4" />
										Subscription Timeline ({auditData.ledger.length})
									</CardTitle>
									{ledgerExpanded ? (
										<ChevronUp className="h-4 w-4" />
									) : (
										<ChevronDown className="h-4 w-4" />
									)}
								</div>
								<CardDescription>Human-readable timeline of billing events</CardDescription>
							</CardHeader>
							{ledgerExpanded && (
								<CardContent>
									{auditData.ledger.length === 0 ? (
										<p className="text-sm text-gray-500">No timeline events yet</p>
									) : (
										<div className="max-h-96 space-y-2 overflow-y-auto">
											{auditData.ledger.map((entry) => (
												<div
													key={entry.id}
													className="flex items-start justify-between rounded bg-gray-50 p-2 dark:bg-gray-800"
												>
													<div className="flex-1">
														<div className="flex items-center gap-2">
															<span
																className={`rounded px-2 py-0.5 text-xs ${
																	entry.balance_impact === 'credit'
																		? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
																		: entry.balance_impact === 'debit'
																			? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
																			: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
																}`}
															>
																{entry.event_type.replace(/_/g, ' ')}
															</span>
														</div>
														<div className="mt-1 text-sm">{entry.description}</div>
														<div className="text-xs text-gray-500">
															{formatDate(entry.created_at)}
														</div>
													</div>
													{entry.amount_cents && entry.amount_cents > 0 && (
														<div
															className={`text-sm font-medium ${
																entry.balance_impact === 'credit'
																	? 'text-green-600'
																	: entry.balance_impact === 'debit'
																		? 'text-red-600'
																		: ''
															}`}
														>
															{entry.balance_impact === 'debit' ? '-' : ''}
															{formatCents(entry.amount_cents)}
														</div>
													)}
												</div>
											))}
										</div>
									)}
								</CardContent>
							)}
						</Card>

						{/* Payment Failures */}
						{auditData.payment_failures.length > 0 && (
							<Card>
								<CardHeader
									className="cursor-pointer"
									onClick={() => setFailuresExpanded(!failuresExpanded)}
								>
									<div className="flex items-center justify-between">
										<CardTitle className="flex items-center gap-2 text-base">
											<AlertTriangle className="h-4 w-4 text-red-500" />
											Payment Failures ({auditData.payment_failures.length})
										</CardTitle>
										{failuresExpanded ? (
											<ChevronUp className="h-4 w-4" />
										) : (
											<ChevronDown className="h-4 w-4" />
										)}
									</div>
									<CardDescription>Failed payment attempts for troubleshooting</CardDescription>
								</CardHeader>
								{failuresExpanded && (
									<CardContent>
										<div className="max-h-60 space-y-2 overflow-y-auto">
											{auditData.payment_failures.map((failure) => (
												<div
													key={failure.id}
													className="rounded border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950"
												>
													<div className="flex items-start justify-between">
														<div>
															<div className="text-sm font-medium text-red-700 dark:text-red-300">
																{failure.failure_message ||
																	failure.failure_code ||
																	'Payment failed'}
															</div>
															{failure.decline_code && (
																<div className="text-xs text-red-600 dark:text-red-400">
																	Decline code: {failure.decline_code}
																</div>
															)}
															{failure.next_action && (
																<div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
																	Recommended: {failure.next_action.replace(/_/g, ' ')}
																</div>
															)}
															<div className="mt-1 text-xs text-gray-500">
																{formatDate(failure.created_at)}
															</div>
														</div>
														<Badge variant="outline" className="border-red-300 text-red-600">
															Attempt #{failure.attempt_count}
														</Badge>
													</div>
												</div>
											))}
										</div>
									</CardContent>
								)}
							</Card>
						)}

						{/* Invoices */}
						<Card>
							<CardHeader
								className="cursor-pointer"
								onClick={() => setInvoicesExpanded(!invoicesExpanded)}
							>
								<div className="flex items-center justify-between">
									<CardTitle className="flex items-center gap-2 text-base">
										<FileText className="h-4 w-4" />
										Invoices ({auditData.invoices.length})
									</CardTitle>
									{invoicesExpanded ? (
										<ChevronUp className="h-4 w-4" />
									) : (
										<ChevronDown className="h-4 w-4" />
									)}
								</div>
							</CardHeader>
							{invoicesExpanded && (
								<CardContent>
									{auditData.invoices.length === 0 ? (
										<p className="text-sm text-gray-500">No invoices</p>
									) : (
										<div className="max-h-80 space-y-2 overflow-y-auto">
											{auditData.invoices.map((inv) => (
												<div
													key={inv.id}
													className="flex items-center justify-between rounded bg-gray-50 p-2 dark:bg-gray-800"
												>
													<div>
														<div className="font-mono text-xs">{inv.stripe_invoice_id}</div>
														<div className="text-xs text-gray-500">
															{inv.billing_reason} • {formatDate(inv.created_at)}
														</div>
													</div>
													<div className="flex items-center gap-2">
														<div className="text-right">
															<div className="font-medium">{formatCents(inv.amount_paid)}</div>
															<Badge
																variant={inv.status === 'paid' ? 'default' : 'secondary'}
																className="text-xs"
															>
																{inv.status}
															</Badge>
														</div>
														{inv.invoice_pdf && (
															<Button
																variant="ghost"
																size="sm"
																onClick={() => window.open(inv.invoice_pdf!, '_blank')}
															>
																<FileText className="h-4 w-4" />
															</Button>
														)}
														{inv.hosted_invoice_url && (
															<Button
																variant="ghost"
																size="sm"
																onClick={() => window.open(inv.hosted_invoice_url!, '_blank')}
															>
																<ExternalLink className="h-4 w-4" />
															</Button>
														)}
													</div>
												</div>
											))}
										</div>
									)}
								</CardContent>
							)}
						</Card>

						{/* Charges */}
						<Card>
							<CardHeader
								className="cursor-pointer"
								onClick={() => setChargesExpanded(!chargesExpanded)}
							>
								<div className="flex items-center justify-between">
									<CardTitle className="flex items-center gap-2 text-base">
										<CreditCard className="h-4 w-4" />
										Charges ({auditData.charges.length})
									</CardTitle>
									{chargesExpanded ? (
										<ChevronUp className="h-4 w-4" />
									) : (
										<ChevronDown className="h-4 w-4" />
									)}
								</div>
							</CardHeader>
							{chargesExpanded && (
								<CardContent>
									{auditData.charges.length === 0 ? (
										<p className="text-sm text-gray-500">No charges</p>
									) : (
										<div className="max-h-80 space-y-2 overflow-y-auto">
											{auditData.charges.map((charge) => (
												<div
													key={charge.id}
													className="flex items-center justify-between rounded bg-gray-50 p-2 dark:bg-gray-800"
												>
													<div>
														<div className="flex items-center gap-2">
															{charge.status === 'succeeded' ? (
																<CheckCircle className="h-4 w-4 text-green-500" />
															) : (
																<XCircle className="h-4 w-4 text-red-500" />
															)}
															<span className="font-medium">{formatCents(charge.amount)}</span>
															{charge.refunded && (
																<Badge variant="outline" className="text-xs">
																	Refunded: {formatCents(charge.amount_refunded)}
																</Badge>
															)}
														</div>
														<div className="text-xs text-gray-500">
															{charge.card_brand} •••• {charge.card_last4} •{' '}
															{formatDate(charge.stripe_created_at)}
														</div>
													</div>
													<div className="flex items-center gap-2">
														<Badge
															variant={charge.status === 'succeeded' ? 'default' : 'destructive'}
														>
															{charge.status}
														</Badge>
														{charge.receipt_url && (
															<Button
																variant="ghost"
																size="sm"
																onClick={() => window.open(charge.receipt_url!, '_blank')}
															>
																<Receipt className="h-4 w-4" />
															</Button>
														)}
													</div>
												</div>
											))}
										</div>
									)}
								</CardContent>
							)}
						</Card>

						{/* Webhook Events */}
						<Card>
							<CardHeader
								className="cursor-pointer"
								onClick={() => setWebhooksExpanded(!webhooksExpanded)}
							>
								<div className="flex items-center justify-between">
									<CardTitle className="flex items-center gap-2 text-base">
										<Webhook className="h-4 w-4" />
										Webhook Events ({auditData.webhook_events.length})
									</CardTitle>
									{webhooksExpanded ? (
										<ChevronUp className="h-4 w-4" />
									) : (
										<ChevronDown className="h-4 w-4" />
									)}
								</div>
								<CardDescription>Raw Stripe webhook events received</CardDescription>
							</CardHeader>
							{webhooksExpanded && (
								<CardContent>
									{/* Filter */}
									<div className="mb-4">
										<Select value={webhookTypeFilter} onValueChange={setWebhookTypeFilter}>
											<SelectTrigger className="w-64">
												<SelectValue placeholder="Filter by event type" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="all">All events</SelectItem>
												{webhookEventTypes.map((type) => (
													<SelectItem key={type} value={type}>
														{type}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									{filteredWebhookEvents.length === 0 ? (
										<p className="text-sm text-gray-500">No webhook events</p>
									) : (
										<div className="max-h-96 space-y-2 overflow-y-auto">
											{filteredWebhookEvents.map((event) => (
												<div
													key={event.id}
													className="flex items-center justify-between rounded bg-gray-50 p-2 dark:bg-gray-800"
												>
													<div>
														<div className="text-sm font-medium">{event.event_type}</div>
														<div className="font-mono text-xs text-gray-500">
															{event.stripe_event_id}
														</div>
														<div className="text-xs text-gray-500">
															{formatDate(event.received_at)}
														</div>
														{event.processing_error && (
															<div className="mt-1 text-xs text-red-500">
																{event.processing_error}
															</div>
														)}
													</div>
													<Badge
														variant={
															event.status === 'processed'
																? 'default'
																: event.status === 'failed'
																	? 'destructive'
																	: 'secondary'
														}
													>
														{event.status}
													</Badge>
												</div>
											))}
										</div>
									)}
								</CardContent>
							)}
						</Card>

						{/* Subscription Snapshots */}
						<Card>
							<CardHeader
								className="cursor-pointer"
								onClick={() => setSnapshotsExpanded(!snapshotsExpanded)}
							>
								<div className="flex items-center justify-between">
									<CardTitle className="flex items-center gap-2 text-base">
										<History className="h-4 w-4" />
										Subscription Snapshots ({auditData.subscription_snapshots.length})
									</CardTitle>
									{snapshotsExpanded ? (
										<ChevronUp className="h-4 w-4" />
									) : (
										<ChevronDown className="h-4 w-4" />
									)}
								</div>
								<CardDescription>Historical subscription state changes</CardDescription>
							</CardHeader>
							{snapshotsExpanded && (
								<CardContent>
									{auditData.subscription_snapshots.length === 0 ? (
										<p className="text-sm text-gray-500">No subscription snapshots</p>
									) : (
										<div className="max-h-80 space-y-2 overflow-y-auto">
											{auditData.subscription_snapshots.map((snap) => (
												<div
													key={snap.id}
													className="flex items-center justify-between rounded bg-gray-50 p-2 dark:bg-gray-800"
												>
													<div>
														<div className="flex items-center gap-2">
															<Badge variant="outline" className="text-xs">
																{snap.event_type}
															</Badge>
															<Badge variant={snap.status === 'active' ? 'default' : 'secondary'}>
																{snap.status}
															</Badge>
														</div>
														<div className="mt-1 text-xs text-gray-500">
															Period:{' '}
															{snap.current_period_start
																? formatDate(snap.current_period_start)
																: 'N/A'}{' '}
															→{' '}
															{snap.current_period_end
																? formatDate(snap.current_period_end)
																: 'N/A'}
														</div>
														<div className="text-xs text-gray-500">
															{formatDate(snap.created_at)}
														</div>
													</div>
													{snap.cancel_at_period_end && (
														<Badge variant="destructive" className="text-xs">
															Cancel at period end
														</Badge>
													)}
												</div>
											))}
										</div>
									)}
								</CardContent>
							)}
						</Card>
					</div>
				)}
			</div>
		</>
	);
}
