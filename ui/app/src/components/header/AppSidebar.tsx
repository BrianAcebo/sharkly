import React, { useCallback, useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../hooks/useAuth';
import {
	LayoutDashboard,
	BarChart2,
	Settings,
	LogOut,
	Bot,
	BookOpen,
	Code2,
	GitFork,
	Globe,
	MapIcon,
	Wrench,
	TrendingUp,
	ShoppingBag
} from 'lucide-react';
import { Link } from 'react-router';
import UserAvatar from '../common/UserAvatar';
import { useSidebar } from '../../hooks/useSidebar';
import { Logo } from '../common/Logo';
import { canAccessPerformance, canAccessTechnical } from '../../utils/featureGating';
import type { OrganizationRow } from '../../types/billing';
import { Tooltip } from '../ui/tooltip';
import { cn } from '../../utils/common';

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
	const flyoutTriggerRef = useRef<HTMLButtonElement | null>(null);
	const [flyoutPosition, setFlyoutPosition] = useState<{ top: number; left: number } | null>(null);
	const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const clearCloseTimeout = useCallback(() => {
		if (closeTimeoutRef.current) {
			clearTimeout(closeTimeoutRef.current);
			closeTimeoutRef.current = null;
		}
	}, []);

	const scheduleClose = useCallback(
		(label: string) => {
			clearCloseTimeout();
			closeTimeoutRef.current = setTimeout(() => {
				setOpenGroups((m) => ({ ...m, [label]: false }));
				closeTimeoutRef.current = null;
			}, 150);
		},
		[clearCloseTimeout]
	);

	const handleFlyoutEnter = useCallback(
		(label: string) => {
			clearCloseTimeout();
			setOpenGroups((m) => ({ ...m, [label]: true }));
		},
		[clearCloseTimeout]
	);

	const handleFlyoutLeave = useCallback(
		(label: string) => {
			scheduleClose(label);
		},
		[scheduleClose]
	);

	useEffect(() => () => clearCloseTimeout(), [clearCloseTimeout]);

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
					{ icon: ShoppingBag, label: 'Ecommerce', path: '/ecommerce' }
					// { icon: CalendarDays, label: 'Calendar', path: '/calendar' },
					// { icon: Key, label: 'Keywords', path: '/keywords' }
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
		const technicalChildren: MenuItem[] = [
			{ icon: Code2, label: 'Schema Generator', path: '/schema-generator' }
		];
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
			{ icon: Bot, label: 'AI Assistant', path: '/assistant' },
			// { icon: Building2, label: 'Organization', path: '/organization' },
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

	useEffect(() => () => clearCloseTimeout(), [clearCloseTimeout]);

	const isCollapsed = !(isExpanded || isMobileOpen);
	const openFlyoutItem = menuItems.find(
		(item) => item.children && (openGroups[item.label] ?? false) && isCollapsed
	);

	useLayoutEffect(() => {
		if (!openFlyoutItem || !flyoutTriggerRef.current) {
			setFlyoutPosition(null);
			return;
		}
		const rect = flyoutTriggerRef.current.getBoundingClientRect();
		setFlyoutPosition({ top: rect.top, left: rect.right + 8 });
	}, [openFlyoutItem, openGroups]);

	return (
		<aside
			className={`fixed top-0 left-0 z-50 mt-16 flex h-screen flex-col overflow-x-visible border-r border-gray-200 bg-white text-gray-900 transition-all duration-300 ease-in-out lg:mt-0 dark:border-gray-600 dark:bg-gray-900 ${isExpanded || isMobileOpen ? 'w-55' : 'w-22'} ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
		>
			<div className="h-header-height flex items-center justify-center border-b border-gray-200 pt-4 pb-2 dark:border-gray-600">
				<Link to="/">
					<Logo isIcon={!(isExpanded || isMobileOpen)} width={115} height="auto" />
				</Link>
			</div>

			<nav
				className={cn(
					'scrollbar-branded mb-6 flex flex-1 overflow-y-auto py-8',
					isExpanded || isMobileOpen ? 'overflow-y-auto' : 'overflow-x-visible'
				)}
			>
				<ul className="w-full space-y-2 overflow-x-visible px-2">
					{menuItems.map((item: MenuItem, index) => {
						const isActive = (it: MenuItem): boolean => {
							if (it.path) return window.location.pathname.startsWith(it.path);
							if (it.children) return it.children.some((c) => isActive(c));
							return false;
						};
						const active = isActive(item);
						if (item.children) {
							const group = item;
							const isOpen = openGroups[item.label] ?? false;
							const isCollapsed = !(isExpanded || isMobileOpen);
							return (
								<li key={item.label + index} className="relative">
									{isCollapsed ? (
										isOpen ? (
											<button
												ref={flyoutTriggerRef}
												onMouseEnter={() => handleFlyoutEnter(item.label)}
												onMouseLeave={() => handleFlyoutLeave(item.label)}
												className={`flex w-full items-center space-x-3 rounded-lg px-4 py-3 transition-colors duration-200 ${
													active
														? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 border-brand-600 border-l-4'
														: 'hover:bg-brand-50 dark:hover:bg-brand-700/20 text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white'
												}`}
											>
												<item.icon className="w-full" />
											</button>
										) : (
											<Tooltip content={item.label} tooltipPosition="right" usePortal>
												<button
													onMouseEnter={() => handleFlyoutEnter(item.label)}
													onMouseLeave={() => handleFlyoutLeave(item.label)}
													className={`flex w-full items-center space-x-3 rounded-lg px-4 py-3 transition-colors duration-200 ${
														active
															? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 border-brand-600 border-l-4'
															: 'hover:bg-brand-50 dark:hover:bg-brand-700/20 text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white'
													}`}
												>
													<item.icon className="w-full" />
												</button>
											</Tooltip>
										)
									) : (
										<button
											onClick={() => setOpenGroups((m) => ({ ...m, [item.label]: !isOpen }))}
											className={`flex w-full items-center space-x-3 rounded-lg px-4 py-3 transition-colors duration-200 ${
												active
													? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 border-brand-600 border-l-4'
													: 'hover:bg-brand-50 dark:hover:bg-brand-700/20 text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white'
											}`}
										>
											<item.icon className={isExpanded || isMobileOpen ? 'size-4' : 'w-full'} />
											{(isExpanded || isMobileOpen) && (
												<span className="font-medium">{item.label}</span>
											)}
										</button>
									)}
									{/* Expanded sidebar: inline submenu */}
									{(isExpanded || isMobileOpen) && isOpen ? (
										<ul className="mt-1 space-y-1 pl-4">
											{(group.children ?? []).map((r: MenuItem) => (
												<li key={r.path as string}>
													<Link to={r.path as string}>
														<button
															className={`flex w-full items-center space-x-3 rounded-lg px-4 py-2 text-sm transition-colors duration-200 ${
																window.location.pathname.startsWith(r.path as string)
																	? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 border-brand-600 border-l-4'
																	: 'hover:bg-brand-50 dark:hover:bg-brand-700/20 text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white'
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
								{!(isExpanded || isMobileOpen) ? (
									<Tooltip content={item.label} tooltipPosition="right" usePortal>
										<Link to={item.path as string}>
											<button
												className={`flex w-full items-center space-x-3 rounded-lg px-4 py-3 transition-colors duration-200 ${
													active
														? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 border-brand-600 border-l-4'
														: 'hover:bg-brand-50 dark:hover:bg-brand-700/20 text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white'
												}`}
											>
												<item.icon className={isExpanded || isMobileOpen ? 'size-5' : 'w-full'} />
												{(isExpanded || isMobileOpen) && (
													<span className="font-medium">{item.label}</span>
												)}
											</button>
										</Link>
									</Tooltip>
								) : (
									<Link to={item.path as string}>
										<button
											className={`flex w-full items-center space-x-3 rounded-lg px-4 py-3 transition-colors duration-200 ${
												active
													? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 border-brand-600 border-l-4'
													: 'hover:bg-brand-50 dark:hover:bg-brand-700/20 text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white'
											}`}
										>
											<item.icon className={isExpanded || isMobileOpen ? 'size-5' : 'w-full'} />
											{(isExpanded || isMobileOpen) && (
												<span className="font-medium">{item.label}</span>
											)}
										</button>
									</Link>
								)}
							</li>
						);
					})}
				</ul>
			</nav>

			{/* Collapsed sidebar: flyout submenu via portal (avoids overflow clip) */}
			{openFlyoutItem &&
				flyoutPosition &&
				typeof document !== 'undefined' &&
				createPortal(
					<>
						<div
							className="fixed z-[100] w-56 space-y-2 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-900"
							style={{ top: flyoutPosition.top, left: flyoutPosition.left }}
							onMouseEnter={() => handleFlyoutEnter(openFlyoutItem.label)}
							onMouseLeave={() => handleFlyoutLeave(openFlyoutItem.label)}
						>
							<p className="pl-2 text-sm font-semibold">{openFlyoutItem.label}</p>
							<ul className="space-y-1 border-t">
								{(openFlyoutItem.children ?? []).map((r: MenuItem) => (
									<li key={r.path as string}>
										<Link
											to={r.path as string}
											onClick={() =>
												setOpenGroups((m) => ({ ...m, [openFlyoutItem.label]: false }))
											}
										>
											<button
												className={`flex w-full items-center space-x-3 rounded-md px-3 py-2 text-sm transition-colors duration-200 ${
													window.location.pathname.startsWith(r.path as string)
														? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'
														: 'hover:bg-brand-50 dark:hover:bg-brand-700/20 text-gray-700 dark:text-gray-300'
												}`}
											>
												<r.icon className="size-4" />
												<span>{r.label}</span>
											</button>
										</Link>
									</li>
								))}
							</ul>
						</div>
					</>,
					document.body
				)}

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
