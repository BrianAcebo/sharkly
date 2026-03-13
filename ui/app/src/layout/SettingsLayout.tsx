import { Link, Outlet, useLocation } from 'react-router';
import type { LucideIcon } from 'lucide-react';
import { User, Building2, CreditCard, Receipt, Bell, Plug } from 'lucide-react';

const SETTINGS_NAV: { path: string; label: string; icon: LucideIcon; badge?: string }[] = [
	{ path: '/settings/profile', label: 'Profile', icon: User },
	// { path: '/settings/integrations', label: 'Integrations', icon: Plug },
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
				<div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700">
					{SETTINGS_NAV.map((item) => {
						const isActive = location.pathname === item.path;
						return (
							<Link
								key={item.path}
								to={item.path}
								className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors ${
									isActive
										? 'bg-brand-500-light text-brand-600 dark:text-brand-400 font-semibold'
										: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:bg-gray-900 dark:text-gray-400 dark:text-white'
								}`}
							>
								<span className="flex items-center gap-2">
									<item.icon className="size-4 shrink-0" />
									{item.label}
								</span>
								{item.badge && (
									<span className="rounded bg-gray-50 px-2 py-0.5 text-[10px] text-gray-500 dark:bg-gray-900 dark:text-gray-400">
										{item.badge}
									</span>
								)}
							</Link>
						);
					})}
				</div>
			</nav>
			<div className="min-w-0 flex-1">
				<Outlet />
			</div>
		</div>
	);
}
