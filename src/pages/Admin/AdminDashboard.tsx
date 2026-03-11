import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import InputField from '../../components/form/input/InputField';

import { DollarSign, FileText, Shield, Lock, Eye, EyeOff, Loader2, LogOut, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import PageMeta from '../../components/common/PageMeta';
import { api } from '../../utils/api';
import { supabase } from '../../utils/supabaseClient';

const ADMIN_SESSION_KEY = 'sharkly_admin_auth';
const ADMIN_SESSION_TIME_KEY = 'sharkly_admin_last_activity';
const SESSION_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes

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

export default function AdminDashboard() {
	// Auth state
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [authLoading, setAuthLoading] = useState(false);
	const [checkingSession, setCheckingSession] = useState(true);
	const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Logout function
	const handleLogout = useCallback(() => {
		setIsAuthenticated(false);
		sessionStorage.removeItem(ADMIN_SESSION_KEY);
		sessionStorage.removeItem(ADMIN_SESSION_TIME_KEY);
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
	}, []);

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
				<PageMeta title="Admin | True Sight" description="Admin access required" />
				<div className="flex min-h-[60vh] items-center justify-center">
					<Card className="w-full max-w-sm">
						<CardHeader className="text-center">
							<div className="mx-auto mb-4 w-fit rounded-full bg-gray-100 p-3 dark:bg-gray-800">
								<Lock className="h-6 w-6 text-gray-900 dark:text-gray-100" />
							</div>
							<CardTitle>Admin Access Required</CardTitle>
							<CardDescription>Enter the admin password to continue</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								<div className="relative">
									<InputField
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
			<PageMeta title="Admin | True Sight" description="Admin dashboard for support operations" />
			<div className="mx-auto max-w-4xl p-6">
				<div className="mb-4 flex justify-end">
					<Button variant="destructive" size="sm" onClick={handleLogout}>
						<LogOut className="mr-2 h-4 w-4" />
						Logout
					</Button>
				</div>

				<div className="mb-8 text-center">
					<div className="mx-auto mb-4 w-fit rounded-full bg-gray-100 p-4 dark:bg-gray-800">
						<Shield className="h-8 w-8" />
					</div>
					<h1 className="text-2xl font-bold">Admin Dashboard</h1>
					<p className="mt-2 text-gray-500">Support tools for managing customers</p>
				</div>

				<div className="grid gap-6 md:grid-cols-2">
					<Link to="/admin/stripe">
						<Card className="h-full cursor-pointer transition-all hover:border-blue-500 hover:shadow-lg">
							<CardHeader>
								<div className="flex items-center gap-3">
									<div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
										<FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
									</div>
									<div>
										<CardTitle>Stripe Audit Trail</CardTitle>
										<CardDescription>View billing history & events</CardDescription>
									</div>
								</div>
							</CardHeader>
							<CardContent>
								<ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
									<li>• Subscription timeline</li>
									<li>• Invoices & charges</li>
									<li>• Payment failures</li>
									<li>• Webhook events</li>
								</ul>
							</CardContent>
						</Card>
					</Link>

					<Link to="/admin/refunds">
						<Card className="h-full cursor-pointer transition-all hover:border-green-500 hover:shadow-lg">
							<CardHeader>
								<div className="flex items-center gap-3">
									<div className="rounded-lg bg-green-100 p-2 dark:bg-green-900">
										<DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
									</div>
									<div>
										<CardTitle>Refund Management</CardTitle>
										<CardDescription>Process refunds & credits</CardDescription>
									</div>
								</div>
							</CardHeader>
							<CardContent>
								<ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
									<li>• Subscription refunds</li>
									<li>• Wallet refunds</li>
									<li>• Action credit-backs</li>
									<li>• Subscription management</li>
								</ul>
							</CardContent>
						</Card>
					</Link>
					<Link to="/admin/blog">
						<Card className="h-full cursor-pointer transition-all hover:border-purple-500 hover:shadow-lg">
							<CardHeader>
								<div className="flex items-center gap-3">
									<div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900">
										<BookOpen className="h-6 w-6 text-purple-600 dark:text-purple-400" />
									</div>
									<div>
										<CardTitle>Blog CMS</CardTitle>
										<CardDescription>Write & publish SEO content</CardDescription>
									</div>
								</div>
							</CardHeader>
							<CardContent>
								<ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
									<li>• Tiptap rich text editor</li>
									<li>• Categories & glossary</li>
									<li>• SEO meta tags & SERP preview</li>
									<li>• Draft / publish workflow</li>
								</ul>
							</CardContent>
						</Card>
					</Link>
				</div>
			</div>
		</>
	);
}
