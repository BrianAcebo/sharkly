import { Link, Outlet, useLocation } from 'react-router';

const SETTINGS_NAV = [
	{ path: '/settings/integrations', label: 'Integrations', icon: '🔌' },
	{ path: '/settings/credits', label: 'Credits & Billing', icon: '💳' },
	{ path: '/settings/brand-voice', label: 'Brand Voice', icon: '🎨' },
	{ path: '/settings/team', label: 'Team', icon: '👥', badge: 'Coming Soon' },
];

export default function SettingsLayout() {
	const location = useLocation();

	return (
		<div className="flex gap-6">
			<nav className="w-[200px] shrink-0">
				<div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white p-3">
					{SETTINGS_NAV.map((item) => {
						const isActive = location.pathname === item.path;
						return (
							<Link
								key={item.path}
								to={item.path}
								className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors ${
									isActive
										? 'bg-brand-500-light font-semibold text-brand-600 dark:text-brand-400'
										: 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:bg-gray-900 hover:text-gray-900 dark:text-white'
								}`}
							>
								<span className="flex items-center gap-2">
									{item.icon}
									{item.label}
								</span>
								{item.badge && (
									<span className="rounded bg-gray-50 dark:bg-gray-900 px-2 py-0.5 text-[10px] text-gray-500 dark:text-gray-400">
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
