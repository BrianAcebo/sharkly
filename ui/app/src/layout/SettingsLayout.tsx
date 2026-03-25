import { Link, Outlet, useLocation } from 'react-router';
import type { LucideIcon } from 'lucide-react';
import { User, Building2, CreditCard, Receipt, Bell } from 'lucide-react';
import { cn } from '../utils/common';

const SETTINGS_NAV: { path: string; label: string; icon: LucideIcon; badge?: string }[] = [
	{ path: '/settings/profile', label: 'Profile', icon: User },
	{ path: '/settings/organization', label: 'Organization', icon: Building2 },
	{ path: '/settings/credits', label: 'Credits & Usage', icon: CreditCard },
	{ path: '/settings/billing', label: 'Billing', icon: Receipt },
	{ path: '/settings/notifications', label: 'Notifications', icon: Bell }
];

export default function SettingsLayout() {
	const location = useLocation();

	return (
		<div className="flex gap-6">
			<nav className="sticky top-[calc(var(--spacing-header-height)+16px)] h-fit w-[200px] shrink-0">
				<div className="rounded-xl border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-800 dark:bg-white/3">
					<div className="flex flex-col gap-1">
						{SETTINGS_NAV.map((item) => {
							const isActive = location.pathname === item.path;
							return (
								<Link
									key={item.path}
									to={item.path}
									className={cn(
										'flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
										isActive
											? 'bg-brand-50 text-brand-700 shadow-sm ring-1 ring-brand-200/70 dark:bg-brand-900/25 dark:text-brand-300 dark:ring-brand-500/25'
											: 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/6 dark:hover:text-gray-100'
									)}
								>
									<span className="flex min-w-0 items-center gap-2">
										<item.icon className="size-4 shrink-0 opacity-90" aria-hidden />
										{item.label}
									</span>
									{item.badge && (
										<span className="shrink-0 rounded bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600 dark:bg-white/10 dark:text-gray-400">
											{item.badge}
										</span>
									)}
								</Link>
							);
						})}
					</div>
				</div>
			</nav>
			<div className="min-w-0 flex-1">
				<Outlet />
			</div>
		</div>
	);
}
