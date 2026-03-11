import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
	LayoutDashboard,
	BarChart2,
	Settings,
	LogOut,
	Building2,
	Bot,
	BookOpen,
	Code2,
	GitFork,
	Globe,
	Key,
	MapIcon,
	ChevronDown,
	Wrench,
	CalendarDays,
	TrendingUp
} from 'lucide-react';
import { Link } from 'react-router';
import UserAvatar from '../common/UserAvatar';
import { useSidebar } from '../../hooks/useSidebar';
import { Logo } from '../common/Logo';
import { canAccessPerformance, canAccessTechnical } from '../../utils/featureGating';
import type { OrganizationRow } from '../../types/billing';

type MenuItem = {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	path?: string;
	children?: MenuItem[];
};

interface AppSidebarProps {
	organization?: OrganizationRow | null;
}

const Sidebar: React.FC<AppSidebarProps> = ({ organization }) => {
	const { user, signOut } = useAuth();
	const { isExpanded, isMobileOpen } = useSidebar();
	const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

	const canAccessPerformancePage = organization ? canAccessPerformance(organization) : false;
	const canAccessTechnicalPage = organization ? canAccessTechnical(organization) : false;

	const menuItems: MenuItem[] = useMemo(() => {
		const items: MenuItem[] = [
			{ icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
			{
				icon: BookOpen,
				label: 'Content',
				children: [
					{ icon: MapIcon, label: 'Strategy', path: '/strategy' },
					{ icon: GitFork, label: 'Clusters', path: '/clusters' },
					{ icon: CalendarDays, label: 'Calendar', path: '/calendar' },
					{ icon: Key, label: 'Keywords', path: '/keywords' }
				]
			}
		];

		if (canAccessPerformancePage) {
			items.push({ icon: BarChart2, label: 'Performance', path: '/performance' });
		}
		if (canAccessPerformancePage) {
			items.push({ icon: TrendingUp, label: 'Rankings', path: '/rankings' });
		}

		// Technical: Schema Generator (Builder+), Site Audit (Scale+)
		const technicalChildren: MenuItem[] = [{ icon: Code2, label: 'Schema Generator', path: '/schema-generator' }];
		if (canAccessTechnicalPage) {
			technicalChildren.unshift({ icon: Wrench, label: 'Site Audit', path: '/technical' });
		}
		items.push({
			icon: Wrench,
			label: 'Technical',
			path: '/technical',
			children: technicalChildren
		});

		items.push(
			{ icon: Globe, label: 'Sites', path: '/sites' },
			{ icon: Bot, label: 'Fin', path: '/assistant' },
			{ icon: Building2, label: 'Organization', path: '/organization' },
			{ icon: Settings, label: 'Settings', path: '/settings' }
		);

		return items;
	}, [canAccessPerformancePage, canAccessTechnicalPage]);

	const isActive = useCallback((it: MenuItem): boolean => {
		if (it.path) return window.location.pathname.startsWith(it.path);
		if (it.children) return it.children.some((c) => isActive(c));
		return false;
	}, []);

	useEffect(() => {
		const initialOpenGroups: Record<string, boolean> = {};
		menuItems.forEach((item) => {
			if (item.children) {
				initialOpenGroups[item.label] = item.children.some((c) => isActive(c));
			}
		});
		setOpenGroups(initialOpenGroups);
	}, [menuItems, isActive]);

	return (
		<aside
			className={`fixed top-0 left-0 z-50 mt-16 flex h-screen flex-col border-r border-gray-200 bg-white text-gray-900 transition-all duration-300 ease-in-out lg:mt-0 dark:border-gray-600 dark:bg-gray-900 ${isExpanded || isMobileOpen ? 'w-55' : 'w-22'} ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
		>
			<div className="h-header-height flex items-center justify-center border-b border-gray-200 pt-4 pb-2 dark:border-gray-600">
				<Link to="/">
					<Logo isIcon={!(isExpanded || isMobileOpen)} width={115} height="auto" />
				</Link>
			</div>

			<nav className="scrollbar-branded mb-6 flex flex-1 overflow-y-auto py-8">
				<ul className="w-full space-y-2 px-2">
					{menuItems.map((item: MenuItem, index) => {
						const active = isActive(item);
						if (item.children) {
							const group = item;
							const isOpen = openGroups[item.label] ?? false;
							return (
								<li key={item.label + index}>
									<button
										onClick={() => setOpenGroups((m) => ({ ...m, [item.label]: !isOpen }))}
										className={`flex w-full items-center space-x-3 rounded-lg px-4 py-3 transition-colors duration-200 ${
											active
												? 'bg-brand-300/30 text-brand-500 dark:bg-brand-900/20 dark:text-brand-400 font-semibold'
												: 'hover:bg-gray-1-0 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
										}`}
									>
										<item.icon className={isExpanded || isMobileOpen ? 'size-5' : 'w-full'} />
										{(isExpanded || isMobileOpen) && (
											<span className="font-medium">{item.label}</span>
										)}
										<ChevronDown className={`${isOpen ? 'rotate-180' : ''} mr-0 ml-auto size-4`} />
									</button>
									{(isExpanded || isMobileOpen) && isOpen ? (
										<ul className="mt-1 space-y-1 pl-4">
											{(group.children ?? []).map((r: MenuItem) => (
												<li key={r.path as string}>
													<Link to={r.path as string}>
														<button
															className={`flex w-full items-center space-x-3 rounded-lg px-4 py-2 text-sm transition-colors duration-200 ${
																window.location.pathname.startsWith(r.path as string)
																	? 'text-brand-500 font-semibold'
																	: 'text-gray-600 hover:text-gray-400 dark:text-gray-300 hover:dark:text-gray-100'
															}`}
														>
															<r.icon className="size-4" />
															<span>{r.label}</span>
														</button>
													</Link>
												</li>
											))}
										</ul>
									) : null}
								</li>
							);
						}
						return (
							<li key={`${item.path ?? item.label}${index}`}>
								<Link to={item.path as string}>
									<button
										className={`flex w-full items-center space-x-3 rounded-lg px-4 py-3 transition-colors duration-200 ${
											active
												? 'bg-brand-300/30 text-brand-500 dark:bg-brand-900/70 dark:text-brand-400 font-semibold'
												: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
										}`}
									>
										<item.icon className={isExpanded || isMobileOpen ? 'size-5' : 'w-full'} />
										{(isExpanded || isMobileOpen) && (
											<span className="font-medium">{item.label}</span>
										)}
									</button>
								</Link>
							</li>
						);
					})}
				</ul>
			</nav>

			<div className="border-t border-gray-200 py-2 dark:border-gray-600">
				<div className="mb-4 flex items-center justify-center space-x-2 border-b border-gray-200 pb-2 dark:border-gray-600">
					<div className="rounded-full border border-gray-200 dark:border-gray-600">
						<UserAvatar
							user={{
								name:
									user?.first_name && user?.last_name
										? `${user.first_name} ${user.last_name}`
										: user?.email || 'User',
								avatar: user?.avatar
							}}
							size="sm"
						/>
					</div>
					{(isExpanded || isMobileOpen) && (
						<div>
							<p className="text-xs font-medium text-black dark:text-white">
								{user?.first_name} {user?.last_name}
							</p>
							<p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
						</div>
					)}
				</div>

				<button
					onClick={signOut}
					className="text-brand-500 bg-brand-100/50 dark:text-brand-400 dark:bg-brand-900/30 mx-auto mb-4 flex w-5/6 items-center justify-center space-x-3 rounded-lg px-4 py-3 transition-colors duration-200"
				>
					<LogOut className={isExpanded || isMobileOpen ? 'size-4' : 'w-full'} />
					{(isExpanded || isMobileOpen) && <span className="text-sm font-medium">Sign Out</span>}
				</button>
			</div>
		</aside>
	);
};

export default Sidebar;
