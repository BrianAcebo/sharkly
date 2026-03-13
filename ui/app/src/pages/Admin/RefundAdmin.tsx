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
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import {
	Search,
	RefreshCw,
	DollarSign,
	CreditCard,
	History,
	AlertTriangle,
	CheckCircle,
	XCircle,
	Loader2,
	ChevronDown,
	ChevronUp,
	Wallet,
	Zap,
	Lock,
	ExternalLink,
	Pause,
	Play,
	XOctagon,
	Eye,
	EyeOff,
	LogOut,
	BookOpen,
	Info
} from 'lucide-react';
import PageMeta from '../../components/common/PageMeta';
import { useBreadcrumbs } from '../../hooks/useBreadcrumbs';
import { CREDIT_COSTS, CREDIT_COST_LABELS } from '../../lib/credits';
import {
	lookupOrgForRefund,
	getRefundAudit,
	processSubscriptionRefund,
	processWalletRefund,
	creditBackAction,
	cancelSubscription,
	pauseSubscription,
	resumeSubscription,
	verifyAdminPassword,
	RefundAudit
} from '../../api/adminRefunds';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '../../components/ui/dialog';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '../../components/ui/select';

const ADMIN_SESSION_KEY = 'sharkly_admin_auth';
const ADMIN_SESSION_TIME_KEY = 'sharkly_admin_last_activity';
const SESSION_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes

/** Snake-case for action keys (e.g. META_GENERATION -> meta_generation) */
function toActionKey(s: string): string {
	return s.replace(/([A-Z])/g, (m) => '_' + m.toLowerCase()).replace(/^_/, '');
}

/** Build action costs reference from lib/credits.ts (single source of truth) */
const ACTION_COSTS_REFERENCE = (() => {
	const entries: Array<{ key: string; name: string; cost: number; category: string }> = [];
	const categories: Record<string, string> = {
		Strategy: 'strategy_generation,cluster_generation,money_page_brief,article_generation',
		Content: 'meta_generation,section_rewrite,faq_generation,product_description,collection_intro,tone_adjustment',
		SEO: 'serp_analysis,ctr_optimize,cro_fixes,page_optimization,site_crawl,keyword_lookup,keyword_volume_refresh',
		Links: 'toxic_link_audit,refresh_authority,link_velocity_check',
		Insights: 'performance_insight',
		Domain: 'dns_lookup,whois_lookup'
	};
	for (const [key, cost] of Object.entries(CREDIT_COSTS)) {
		const actionKey = toActionKey(key);
		const label = (CREDIT_COST_LABELS as Record<string, string>)[key] ?? key.replace(/_/g, ' ');
		let category = 'SEO';
		for (const [cat, keys] of Object.entries(categories)) {
			if (keys.includes(actionKey)) {
				category = cat;
				break;
			}
		}
		entries.push({ key: actionKey, name: label, cost, category });
	}
	// Domain intel actions (not in CREDIT_COSTS)
	entries.push({ key: 'dns_lookup', name: 'DNS Lookup', cost: 1, category: 'Domain' });
	entries.push({ key: 'whois_lookup', name: 'WHOIS Lookup', cost: 1, category: 'Domain' });
	return entries.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
})();

// Refund policy limits
const REFUND_POLICY = {
	subscription: {
		maxDays: 7,
		maxUsagePercent: 20,
		maxRefundsIn90Days: 1
	},
	wallet: {
		minRefundCents: 100 // $1 minimum
	}
};

export default function RefundAdmin() {
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
	const [searchResults, setSearchResults] = useState<
		Array<{
			id: string;
			name: string;
			plan_code: string;
			stripe_status: string | null;
			stripe_customer_id: string | null;
			stripe_subscription_id: string | null;
			wallet_balance_cents: number;
		}>
	>([]);
	const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
	const [audit, setAudit] = useState<RefundAudit | null>(null);
	const [loading, setLoading] = useState(false);
	const [searching, setSearching] = useState(false);

	// Dialog states
	const [subRefundOpen, setSubRefundOpen] = useState(false);
	const [walletRefundOpen, setWalletRefundOpen] = useState(false);
	const [creditBackOpen, setCreditBackOpen] = useState(false);
	const [cancelSubOpen, setCancelSubOpen] = useState(false);
	const [pauseSubOpen, setPauseSubOpen] = useState(false);
	const [refundReason, setRefundReason] = useState('');
	const [creditBackAmount, setCreditBackAmount] = useState('');
	const [creditBackActionKey, setCreditBackActionKey] = useState('');
	const [creditBackCustomKey, setCreditBackCustomKey] = useState('');
	const [creditBackReason, setCreditBackReason] = useState('');
	const [cancelImmediately, setCancelImmediately] = useState(false);
	const [processing, setProcessing] = useState(false);

	// Collapsible sections
	const [usageExpanded, setUsageExpanded] = useState(false);
	const [actionsExpanded, setActionsExpanded] = useState(false);
	const [actionRefExpanded, setActionRefExpanded] = useState(false);

	// Logout function
	const handleLogout = useCallback(() => {
		setIsAuthenticated(false);
		sessionStorage.removeItem(ADMIN_SESSION_KEY);
		sessionStorage.removeItem(ADMIN_SESSION_TIME_KEY);
		setAudit(null);
		setSearchResults([]);
		setSelectedOrgId(null);
		if (activityTimeoutRef.current) {
			clearTimeout(activityTimeoutRef.current);
		}
	}, []);

	// Reset activity timer
	const resetActivityTimer = useCallback(() => {
		if (!isAuthenticated) return;

		// Update last activity time
		sessionStorage.setItem(ADMIN_SESSION_TIME_KEY, Date.now().toString());

		// Clear existing timeout
		if (activityTimeoutRef.current) {
			clearTimeout(activityTimeoutRef.current);
		}

		// Set new timeout
		activityTimeoutRef.current = setTimeout(() => {
			toast.warning('Session expired due to inactivity');
			handleLogout();
		}, SESSION_TIMEOUT_MS);
	}, [isAuthenticated, handleLogout]);

	// Check session and set up activity listeners
	useEffect(() => {
		setTitle('Admin');

		// Check session on mount
		const session = sessionStorage.getItem(ADMIN_SESSION_KEY);
		const lastActivity = sessionStorage.getItem(ADMIN_SESSION_TIME_KEY);

		if (session === 'true' && lastActivity) {
			const elapsed = Date.now() - parseInt(lastActivity, 10);
			if (elapsed < SESSION_TIMEOUT_MS) {
				setIsAuthenticated(true);
			} else {
				// Session expired
				sessionStorage.removeItem(ADMIN_SESSION_KEY);
				sessionStorage.removeItem(ADMIN_SESSION_TIME_KEY);
			}
		}
		setCheckingSession(false);
	}, [setTitle]);

	// Set up activity listeners when authenticated
	useEffect(() => {
		if (!isAuthenticated) return;

		// Reset timer on any activity
		const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

		const handleActivity = () => resetActivityTimer();

		events.forEach((event) => {
			window.addEventListener(event, handleActivity);
		});

		// Start initial timer
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
			const result = await verifyAdminPassword(password);
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
			const results = await lookupOrgForRefund(searchQuery.trim());
			setSearchResults(results);
			if (results.length === 0) {
				toast.info('No organizations found');
			}
		} catch (error: any) {
			toast.error(error.message || 'Search failed');
		} finally {
			setSearching(false);
		}
	};

	const loadAudit = async (orgId: string) => {
		setLoading(true);
		setSelectedOrgId(orgId);
		try {
			const data = await getRefundAudit(orgId);
			setAudit(data);
		} catch (error: any) {
			toast.error(error.message || 'Failed to load audit');
		} finally {
			setLoading(false);
		}
	};

	const handleSubRefund = async () => {
		if (!selectedOrgId) return;
		setProcessing(true);
		try {
			const result = await processSubscriptionRefund(selectedOrgId, refundReason || undefined);
			toast.success(`Refunded $${result.refund_amount_dollars}`);
			setSubRefundOpen(false);
			setRefundReason('');
			loadAudit(selectedOrgId);
		} catch (error: any) {
			toast.error(error.message || 'Refund failed');
		} finally {
			setProcessing(false);
		}
	};

	const handleWalletRefund = async () => {
		if (!selectedOrgId) return;
		setProcessing(true);
		try {
			const result = await processWalletRefund(selectedOrgId, refundReason || undefined);
			toast.success(`Refunded $${result.refund_amount_dollars}`);
			setWalletRefundOpen(false);
			setRefundReason('');
			loadAudit(selectedOrgId);
		} catch (error: any) {
			toast.error(error.message || 'Refund failed');
		} finally {
			setProcessing(false);
		}
	};

	const handleCreditBack = async () => {
		const actionKey = creditBackActionKey === '__custom__' ? creditBackCustomKey.trim() : creditBackActionKey;
		if (!selectedOrgId || !creditBackAmount || !actionKey || !creditBackReason) {
			toast.error('Fill in all fields');
			return;
		}
		setProcessing(true);
		try {
			const result = await creditBackAction(
				selectedOrgId,
				actionKey,
				parseInt(creditBackAmount, 10),
				creditBackReason
			);
			toast.success(`Credited back ${result.credits_added} credits`);
			setCreditBackOpen(false);
			setCreditBackAmount('');
			setCreditBackActionKey('');
			setCreditBackCustomKey('');
			setCreditBackReason('');
			loadAudit(selectedOrgId);
		} catch (error: any) {
			toast.error(error.message || 'Credit-back failed');
		} finally {
			setProcessing(false);
		}
	};

	const handleCancelSub = async () => {
		if (!selectedOrgId) return;
		setProcessing(true);
		try {
			const result = await cancelSubscription(selectedOrgId, cancelImmediately);
			toast.success(result.message);
			setCancelSubOpen(false);
			setCancelImmediately(false);
			loadAudit(selectedOrgId);
		} catch (error: any) {
			toast.error(error.message || 'Cancel failed');
		} finally {
			setProcessing(false);
		}
	};

	const handlePauseSub = async () => {
		if (!selectedOrgId) return;
		setProcessing(true);
		try {
			const result = await pauseSubscription(selectedOrgId);
			toast.success(result.message);
			setPauseSubOpen(false);
			loadAudit(selectedOrgId);
		} catch (error: any) {
			toast.error(error.message || 'Pause failed');
		} finally {
			setProcessing(false);
		}
	};

	const handleResumeSub = async () => {
		if (!selectedOrgId) return;
		setProcessing(true);
		try {
			const result = await resumeSubscription(selectedOrgId);
			toast.success(result.message);
			loadAudit(selectedOrgId);
		} catch (error: any) {
			toast.error(error.message || 'Resume failed');
		} finally {
			setProcessing(false);
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
				<PageMeta title="Admin Access | Sharkly" description="Admin access required" />
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
			<PageMeta
				title="Refund Admin | Sharkly"
				description="Manage refunds and billing for organizations"
			/>
			<div className="mx-auto max-w-6xl space-y-6 p-6">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold">Refund & Billing Admin</h1>
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
						<CardDescription>Search by org ID or name</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex gap-2">
							<Input
								placeholder="Enter org ID or name..."
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
										onClick={() => loadAudit(org.id)}
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

				{/* Action Costs Reference */}
				<Card>
					<CardHeader
						className="cursor-pointer"
						onClick={() => setActionRefExpanded(!actionRefExpanded)}
					>
						<div className="flex items-center justify-between">
							<CardTitle className="flex items-center gap-2 text-base">
								<BookOpen className="h-4 w-4" />
								Action Costs Reference
							</CardTitle>
							{actionRefExpanded ? (
								<ChevronUp className="h-4 w-4" />
							) : (
								<ChevronDown className="h-4 w-4" />
							)}
						</div>
						<CardDescription>
							Reference table of all actions and their credit costs for credit-backs
						</CardDescription>
					</CardHeader>
					{actionRefExpanded && (
						<CardContent>
							<div className="mb-4 flex items-start gap-2 rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
								<Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
								<div>
									<strong>How Credit-Back Works:</strong> When an action fails or produces incorrect
									results, you can credit back the cost to the user's included balance. Look at
									"Recent Action Results" for the user to find failed actions and use this table to
									determine the credit amount.
								</div>
							</div>
							<div className="overflow-x-auto">
								<table className="w-full text-sm">
									<thead>
										<tr className="border-b dark:border-gray-700">
											<th className="px-3 py-2 text-left font-medium">Action Key</th>
											<th className="px-3 py-2 text-left font-medium">Name</th>
											<th className="px-3 py-2 text-left font-medium">Category</th>
											<th className="px-3 py-2 text-right font-medium">Cost</th>
										</tr>
									</thead>
									<tbody>
										{ACTION_COSTS_REFERENCE.map((action) => (
											<tr
												key={action.key}
												className="border-b hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
											>
												<td className="px-3 py-2 font-mono text-xs">{action.key}</td>
												<td className="px-3 py-2">{action.name}</td>
												<td className="px-3 py-2">
													<Badge variant="outline" className="text-xs">
														{action.category}
													</Badge>
												</td>
												<td className="px-3 py-2 text-right">
													{action.cost === 0 ? (
														<span className="text-green-600 dark:text-green-400">Free</span>
													) : (
														<span>{action.cost} credits</span>
													)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</CardContent>
					)}
				</Card>

				{/* Loading state */}
				{loading && (
					<div className="flex items-center justify-center py-12">
						<Loader2 className="h-8 w-8 animate-spin text-gray-400" />
					</div>
				)}

				{/* Audit Results */}
				{audit && !loading && (
					<div className="space-y-6">
						{/* Organization Info */}
						<Card>
							<CardHeader>
								<div className="flex items-center justify-between">
									<CardTitle className="text-base">{audit.organization.name}</CardTitle>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => loadAudit(audit.organization.id)}
									>
										<RefreshCw className="h-4 w-4" />
									</Button>
								</div>
							</CardHeader>
							<CardContent>
								<div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
									<div>
										<div className="text-xs text-gray-500">Plan</div>
										<div className="font-medium">{audit.organization.plan_code}</div>
									</div>
									<div>
										<div className="text-xs text-gray-500">Status</div>
										<Badge
											variant={
												audit.organization.stripe_status === 'active' ? 'default' : 'secondary'
											}
										>
											{audit.organization.stripe_status || 'No subscription'}
										</Badge>
									</div>
									<div>
										<div className="text-xs text-gray-500">Included Credits</div>
										<div className="font-medium">
											{audit.organization.included_credits_remaining} /{' '}
											{audit.organization.included_credits_monthly}
										</div>
									</div>
									<div>
										<div className="text-xs text-gray-500">Wallet Balance</div>
										<div className="font-medium">
											{formatCents(audit.organization.wallet_balance_cents)}
										</div>
									</div>
									<div>
										<div className="text-xs text-gray-500">Last Refund</div>
										<div className="font-medium">
											{audit.organization.last_refund_at
												? formatDate(audit.organization.last_refund_at)
												: 'Never'}
										</div>
									</div>
									<div>
										<div className="text-xs text-gray-500">Refunds (90d)</div>
										<div className="font-medium">{audit.organization.refund_count_90d}</div>
									</div>
									<div>
										<div className="text-xs text-gray-500">Created</div>
										<div className="font-medium">{formatDate(audit.organization.created_at)}</div>
									</div>
								</div>

								{/* Stripe Links */}
								{(audit.organization.stripe_customer_id ||
									audit.organization.stripe_subscription_id) && (
									<div className="flex gap-2 border-t pt-3">
										{audit.organization.stripe_customer_id && (
											<Button
												variant="outline"
												size="sm"
												onClick={() => openStripeCustomer(audit.organization.stripe_customer_id!)}
											>
												<ExternalLink className="mr-1 h-3 w-3" />
												View in Stripe
											</Button>
										)}
										{audit.organization.stripe_subscription_id && (
											<Button
												variant="outline"
												size="sm"
												onClick={() =>
													openStripeSubscription(audit.organization.stripe_subscription_id!)
												}
											>
												<ExternalLink className="mr-1 h-3 w-3" />
												View Subscription
											</Button>
										)}
									</div>
								)}
							</CardContent>
						</Card>

						{/* Stripe Subscription Actions */}
						{audit.organization.stripe_subscription_id && (
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2 text-base">
										<CreditCard className="h-4 w-4" />
										Subscription Actions
									</CardTitle>
									<CardDescription>Manage the customer's Stripe subscription</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="flex flex-wrap gap-2">
										{audit.organization.stripe_status === 'paused' ? (
											<Button variant="outline" onClick={handleResumeSub} disabled={processing}>
												<Play className="mr-2 h-4 w-4" />
												Resume Subscription
											</Button>
										) : (
											<Button
												variant="outline"
												onClick={() => setPauseSubOpen(true)}
												disabled={processing}
											>
												<Pause className="mr-2 h-4 w-4" />
												Pause Subscription
											</Button>
										)}
										<Button
											variant="destructive"
											onClick={() => setCancelSubOpen(true)}
											disabled={processing}
										>
											<XOctagon className="mr-2 h-4 w-4" />
											Cancel Subscription
										</Button>
									</div>
								</CardContent>
							</Card>
						)}

						{/* Eligibility & Actions */}
						<div className="grid gap-4 md:grid-cols-2">
							{/* Subscription Refund */}
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2 text-base">
										<CreditCard className="h-4 w-4" />
										Subscription Refund
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									{audit.eligibility.subscription ? (
										<>
											<div className="flex items-center gap-2">
												{audit.eligibility.subscription.eligible ? (
													<CheckCircle className="h-5 w-5 text-green-500" />
												) : (
													<XCircle className="h-5 w-5 text-red-500" />
												)}
												<span
													className={
														audit.eligibility.subscription.eligible
															? 'text-green-600'
															: 'text-red-600'
													}
												>
													{audit.eligibility.subscription.eligible ? 'Eligible' : 'Not Eligible'}
												</span>
											</div>
											{audit.eligibility.subscription.reason && (
												<p className="text-sm text-gray-600 dark:text-gray-400">
													{audit.eligibility.subscription.reason}
												</p>
											)}
											{!audit.eligibility.subscription.eligible && (
												<div className="space-y-1 rounded bg-gray-50 p-3 text-xs dark:bg-gray-800">
													<div className="font-medium text-gray-700 dark:text-gray-300">
														Subscription refund requirements:
													</div>
													<ul className="list-inside list-disc text-gray-600 dark:text-gray-400">
														<li>
															Within {REFUND_POLICY.subscription.maxDays} days of charge (current:{' '}
															{audit.eligibility.subscription.days_since_charge ?? '?'} days)
														</li>
														<li>
															Less than {REFUND_POLICY.subscription.maxUsagePercent}% credit usage
															(current: {audit.eligibility.subscription.usage_percent ?? '?'}%)
														</li>
														<li>
															Max {REFUND_POLICY.subscription.maxRefundsIn90Days} refund per 90 days
														</li>
														<li>No open payment disputes</li>
													</ul>
												</div>
											)}
											{audit.eligibility.subscription.eligible && (
												<div className="space-y-2">
													<div className="text-sm">
														<span className="text-gray-500">Refund Amount: </span>
														<span className="font-medium">
															{formatCents(audit.eligibility.subscription.refund_amount_cents || 0)}
														</span>
													</div>
													<div className="text-sm">
														<span className="text-gray-500">Days Since Charge: </span>
														<span className="font-medium">
															{audit.eligibility.subscription.days_since_charge}
														</span>
													</div>
													<div className="text-sm">
														<span className="text-gray-500">Usage: </span>
														<span className="font-medium">
															{audit.eligibility.subscription.usage_percent}%
														</span>
													</div>
													<Button
														onClick={() => setSubRefundOpen(true)}
														className="mt-2 w-full"
														variant="destructive"
													>
														<DollarSign className="mr-2 h-4 w-4" />
														Process Subscription Refund
													</Button>
												</div>
											)}
										</>
									) : (
										<p className="text-sm text-gray-500">No subscription to refund</p>
									)}
								</CardContent>
							</Card>

							{/* Wallet Refund */}
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2 text-base">
										<Wallet className="h-4 w-4" />
										Wallet Refund
									</CardTitle>
									<CardDescription>
										Only wallet credits (top-up purchases) are refundable. Included subscription
										credits reset monthly and cannot be refunded.
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									{audit.eligibility.wallet ? (
										<>
											<div className="flex items-center gap-2">
												{audit.eligibility.wallet.eligible ? (
													<CheckCircle className="h-5 w-5 text-green-500" />
												) : (
													<XCircle className="h-5 w-5 text-red-500" />
												)}
												<span
													className={
														audit.eligibility.wallet.eligible ? 'text-green-600' : 'text-red-600'
													}
												>
													{audit.eligibility.wallet.eligible ? 'Eligible' : 'Not Eligible'}
												</span>
											</div>
											{audit.eligibility.wallet.reason && (
												<p className="text-sm text-gray-600 dark:text-gray-400">
													{audit.eligibility.wallet.reason}
												</p>
											)}
											{!audit.eligibility.wallet.eligible && (
												<div className="space-y-1 rounded bg-gray-50 p-3 text-xs dark:bg-gray-800">
													<div className="font-medium text-gray-700 dark:text-gray-300">
														Wallet refund requirements:
													</div>
													<ul className="list-inside list-disc text-gray-600 dark:text-gray-400">
														<li>
															Minimum ${(REFUND_POLICY.wallet.minRefundCents / 100).toFixed(2)}{' '}
															wallet balance
														</li>
														<li>No open payment disputes</li>
														<li>Refund is for remaining wallet balance only (not spent credits)</li>
													</ul>
												</div>
											)}
											{audit.eligibility.wallet.eligible && (
												<div className="space-y-2">
													<div className="text-sm">
														<span className="text-gray-500">Refund Amount: </span>
														<span className="font-medium">
															{formatCents(audit.eligibility.wallet.refund_amount_cents || 0)}
														</span>
													</div>
													<Button
														onClick={() => setWalletRefundOpen(true)}
														className="mt-2 w-full"
														variant="destructive"
													>
														<DollarSign className="mr-2 h-4 w-4" />
														Process Wallet Refund
													</Button>
												</div>
											)}
										</>
									) : (
										<p className="text-sm text-gray-500">No wallet balance to refund</p>
									)}
								</CardContent>
							</Card>
						</div>

						{/* Credit Back Action */}
						<Card>
							<CardHeader>
								<div className="flex items-center justify-between">
									<CardTitle className="flex items-center gap-2 text-base">
										<Zap className="h-4 w-4" />
										Credit Back Action
									</CardTitle>
									<Button variant="outline" size="sm" onClick={() => setCreditBackOpen(true)}>
										Add Credit-Back
									</Button>
								</div>
								<CardDescription>
									Manually credit back for failed or problematic actions
								</CardDescription>
							</CardHeader>
						</Card>

						{/* Recent Usage Events */}
						<Card>
							<CardHeader
								className="cursor-pointer"
								onClick={() => setUsageExpanded(!usageExpanded)}
							>
								<div className="flex items-center justify-between">
									<CardTitle className="flex items-center gap-2 text-base">
										<History className="h-4 w-4" />
										Recent Usage Events ({audit.usage_events.length})
									</CardTitle>
									{usageExpanded ? (
										<ChevronUp className="h-4 w-4" />
									) : (
										<ChevronDown className="h-4 w-4" />
									)}
								</div>
							</CardHeader>
							{usageExpanded && (
								<CardContent>
									{audit.usage_events.length === 0 ? (
										<p className="text-sm text-gray-500">No usage events</p>
									) : (
										<div className="max-h-80 space-y-2 overflow-y-auto">
											{audit.usage_events.map((event) => (
												<div
													key={event.id}
													className="flex items-center justify-between rounded bg-gray-50 p-2 dark:bg-gray-800"
												>
													<div>
														<div className="text-sm font-medium">{event.action_key}</div>
														<div className="text-xs text-gray-500">
															{formatDate(event.occurred_at)}
														</div>
													</div>
													<Badge variant="outline">-{event.credits_spent} credits</Badge>
												</div>
											))}
										</div>
									)}
								</CardContent>
							)}
						</Card>

						{/* Recent Action Results */}
						<Card>
							<CardHeader
								className="cursor-pointer"
								onClick={() => setActionsExpanded(!actionsExpanded)}
							>
								<div className="flex items-center justify-between">
									<CardTitle className="flex items-center gap-2 text-base">
										<Zap className="h-4 w-4" />
										Recent Action Results ({audit.action_results.length})
									</CardTitle>
									{actionsExpanded ? (
										<ChevronUp className="h-4 w-4" />
									) : (
										<ChevronDown className="h-4 w-4" />
									)}
								</div>
							</CardHeader>
							{actionsExpanded && (
								<CardContent>
									{audit.action_results.length === 0 ? (
										<p className="text-sm text-gray-500">No action results</p>
									) : (
										<div className="max-h-80 space-y-2 overflow-y-auto">
											{audit.action_results.map((result) => (
												<div
													key={result.id}
													className="flex items-center justify-between rounded bg-gray-50 p-2 dark:bg-gray-800"
												>
													<div className="flex-1">
														<div className="flex items-center gap-2">
															{result.success ? (
																<CheckCircle className="h-4 w-4 text-green-500" />
															) : (
																<XCircle className="h-4 w-4 text-red-500" />
															)}
															<span className="text-sm font-medium">{result.action_key}</span>
														</div>
														<div className="text-xs text-gray-500">
															{formatDate(result.created_at)}
														</div>
														{result.error_message && (
															<div className="mt-1 text-xs text-red-500">
																{result.error_message}
															</div>
														)}
													</div>
													<Badge variant="outline">{result.credits_charged} credits</Badge>
												</div>
											))}
										</div>
									)}
								</CardContent>
							)}
						</Card>

						{/* Subscription Ledger (Timeline) */}
						{audit.subscription_ledger && audit.subscription_ledger.length > 0 && (
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2 text-base">
										<History className="h-4 w-4" />
										Subscription Timeline ({audit.subscription_ledger.length})
									</CardTitle>
									<CardDescription>Human-readable timeline of billing events</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="max-h-80 space-y-2 overflow-y-auto">
										{audit.subscription_ledger.map((entry) => (
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
								</CardContent>
							</Card>
						)}

						{/* Payment Failures */}
						{audit.payment_failures && audit.payment_failures.length > 0 && (
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2 text-base">
										<XCircle className="h-4 w-4 text-red-500" />
										Payment Failures ({audit.payment_failures.length})
									</CardTitle>
									<CardDescription>
										Failed payment attempts for support troubleshooting
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="max-h-60 space-y-2 overflow-y-auto">
										{audit.payment_failures.map((failure) => (
											<div
												key={failure.id}
												className="rounded border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950"
											>
												<div className="flex items-start justify-between">
													<div>
														<div className="text-sm font-medium text-red-700 dark:text-red-300">
															{failure.failure_message || failure.failure_code || 'Payment failed'}
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
							</Card>
						)}

						{/* Refund History */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-base">
									<AlertTriangle className="h-4 w-4" />
									Refund History
								</CardTitle>
							</CardHeader>
							<CardContent>
								{audit.refund_history.length === 0 ? (
									<p className="text-sm text-gray-500">No previous refunds</p>
								) : (
									<div className="space-y-2">
										{audit.refund_history.map((refund) => (
											<div
												key={refund.id}
												className="flex items-center justify-between rounded bg-gray-50 p-2 dark:bg-gray-800"
											>
												<div>
													<div className="text-sm font-medium capitalize">{refund.refund_type}</div>
													<div className="text-xs text-gray-500">
														{formatDate(refund.requested_at)}
													</div>
													{refund.reason && (
														<div className="text-xs text-gray-500">{refund.reason}</div>
													)}
												</div>
												<div className="text-right">
													<Badge
														variant={
															refund.status === 'processed'
																? 'default'
																: refund.status === 'denied'
																	? 'destructive'
																	: 'secondary'
														}
													>
														{refund.status}
													</Badge>
													{refund.refund_amount_cents && (
														<div className="mt-1 text-sm font-medium">
															{formatCents(refund.refund_amount_cents)}
														</div>
													)}
													{refund.credits_refunded && (
														<div className="mt-1 text-sm font-medium">
															{refund.credits_refunded} credits
														</div>
													)}
												</div>
											</div>
										))}
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				)}

				{/* Subscription Refund Dialog */}
				<Dialog open={subRefundOpen} onOpenChange={setSubRefundOpen}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Process Subscription Refund</DialogTitle>
							<DialogDescription>
								This will refund{' '}
								{audit?.eligibility.subscription?.refund_amount_cents
									? formatCents(audit.eligibility.subscription.refund_amount_cents)
									: '$0.00'}{' '}
								to the customer via Stripe.
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-4">
							<div>
								<label className="text-sm font-medium">Reason (optional)</label>
								<Textarea
									placeholder="Why is this refund being processed?"
									value={refundReason}
									onChange={(e) => setRefundReason(e.target.value)}
								/>
							</div>
						</div>
						<DialogFooter>
							<Button variant="outline" onClick={() => setSubRefundOpen(false)}>
								Cancel
							</Button>
							<Button variant="destructive" onClick={handleSubRefund} disabled={processing}>
								{processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
								Confirm Refund
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				{/* Wallet Refund Dialog */}
				<Dialog open={walletRefundOpen} onOpenChange={setWalletRefundOpen}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Process Wallet Refund</DialogTitle>
							<DialogDescription>
								This will refund{' '}
								{audit?.eligibility.wallet?.refund_amount_cents
									? formatCents(audit.eligibility.wallet.refund_amount_cents)
									: '$0.00'}{' '}
								from unused wallet balance via Stripe.
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-4">
							<div>
								<label className="text-sm font-medium">Reason (optional)</label>
								<Textarea
									placeholder="Why is this refund being processed?"
									value={refundReason}
									onChange={(e) => setRefundReason(e.target.value)}
								/>
							</div>
						</div>
						<DialogFooter>
							<Button variant="outline" onClick={() => setWalletRefundOpen(false)}>
								Cancel
							</Button>
							<Button variant="destructive" onClick={handleWalletRefund} disabled={processing}>
								{processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
								Confirm Refund
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				{/* Credit Back Dialog */}
				<Dialog open={creditBackOpen} onOpenChange={setCreditBackOpen}>
					<DialogContent className="max-w-lg">
						<DialogHeader>
							<DialogTitle>Credit Back Action</DialogTitle>
							<DialogDescription>
								Add credits back to the organization's included balance for a failed or problematic
								action.
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-4">
							<div>
								<label className="mb-2 block text-sm font-medium">Select Action</label>
								<Select
									value={creditBackActionKey}
									onValueChange={(value) => {
										setCreditBackActionKey(value);
										const action = ACTION_COSTS_REFERENCE.find((a) => a.key === value);
										if (action) {
											setCreditBackAmount(action.cost.toString());
										} else if (value !== '__custom__') {
											setCreditBackAmount('');
										}
									}}
								>
									<SelectTrigger>
										<SelectValue placeholder="Choose an action..." />
									</SelectTrigger>
									<SelectContent>
										{ACTION_COSTS_REFERENCE.filter((a) => a.cost > 0).map((action) => (
											<SelectItem key={action.key} value={action.key}>
												<span className="flex items-center justify-between gap-4">
													<span>{action.name}</span>
													<span className="text-gray-500">({action.cost} credits)</span>
												</span>
											</SelectItem>
										))}
										<SelectItem value="__custom__">Custom / Other (enter action key)</SelectItem>
									</SelectContent>
								</Select>
								<p className="mt-1 text-xs text-gray-500">
									Select an action to auto-fill the credit cost, or choose Custom for unlisted actions.
								</p>
								{creditBackActionKey === '__custom__' && (
									<Input
										className="mt-2"
										placeholder="e.g. content_generation, cluster_generation"
										value={creditBackCustomKey}
										onChange={(e) => setCreditBackCustomKey(e.target.value)}
									/>
								)}
							</div>
							<div>
								<label className="mb-2 block text-sm font-medium">Credits to Add</label>
								<Input
									type="number"
									placeholder="e.g., 3"
									value={creditBackAmount}
									onChange={(e) => setCreditBackAmount(e.target.value)}
								/>
								<p className="mt-1 text-xs text-gray-500">
									Auto-filled based on action cost. Adjust if needed (e.g., partial refund).
								</p>
							</div>
							<div>
								<label className="mb-2 block text-sm font-medium">Reason (required)</label>
								<Textarea
									placeholder="e.g. 'Cluster generation failed with timeout - user reported via support'"
									value={creditBackReason}
									onChange={(e) => setCreditBackReason(e.target.value)}
									rows={3}
								/>
							</div>
						</div>
						<DialogFooter>
							<Button variant="outline" onClick={() => setCreditBackOpen(false)}>
								Cancel
							</Button>
							<Button
								onClick={handleCreditBack}
								disabled={
									processing ||
									!creditBackAmount ||
									!creditBackReason ||
									(creditBackActionKey === '__custom__' ? !creditBackCustomKey.trim() : !creditBackActionKey)
								}
							>
								{processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
								Add {creditBackAmount || '0'} Credits
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				{/* Cancel Subscription Dialog */}
				<Dialog open={cancelSubOpen} onOpenChange={setCancelSubOpen}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Cancel Subscription</DialogTitle>
							<DialogDescription>
								This will cancel the customer's subscription. Choose whether to cancel immediately
								or at the end of the billing period.
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-4">
							<div className="flex items-center gap-2">
								<input
									type="checkbox"
									id="cancel-immediately"
									checked={cancelImmediately}
									onChange={(e) => setCancelImmediately(e.target.checked)}
									className="rounded"
								/>
								<label htmlFor="cancel-immediately" className="text-sm">
									Cancel immediately (don't wait for billing period end)
								</label>
							</div>
							{cancelImmediately && (
								<div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
									<strong>Warning:</strong> Immediate cancellation will revoke access right away.
									The customer will lose access to their subscription features.
								</div>
							)}
						</div>
						<DialogFooter>
							<Button variant="outline" onClick={() => setCancelSubOpen(false)}>
								Back
							</Button>
							<Button variant="destructive" onClick={handleCancelSub} disabled={processing}>
								{processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
								{cancelImmediately ? 'Cancel Immediately' : 'Cancel at Period End'}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				{/* Pause Subscription Dialog */}
				<Dialog open={pauseSubOpen} onOpenChange={setPauseSubOpen}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Pause Subscription</DialogTitle>
							<DialogDescription>
								This will pause the subscription. No payments will be collected while paused, but
								the customer retains access until manually resumed or canceled.
							</DialogDescription>
						</DialogHeader>
						<DialogFooter>
							<Button variant="outline" onClick={() => setPauseSubOpen(false)}>
								Cancel
							</Button>
							<Button onClick={handlePauseSub} disabled={processing}>
								{processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
								Pause Subscription
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>
		</>
	);
}
