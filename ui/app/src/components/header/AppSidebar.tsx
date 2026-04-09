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
	ShoppingBag,
	Target,
	Lock,
	BadgeDollarSign,
	ChevronDown,
	GitCompare,
	Video
} from 'lucide-react';
import { Link } from 'react-router';
import UserAvatar from '../common/UserAvatar';
import { useSidebar } from '../../hooks/useSidebar';
import { Logo } from '../common/Logo';
import {
	canAccessPerformance,
	canAccessTechnical,
	canAccessCROStudio
} from '../../utils/featureGating';
import { useCROStudioUpgrade } from '../../contexts/CROStudioUpgradeContext';
import { useTierUpgrade } from '../../contexts/TierUpgradeContext';
import type { OrganizationRow } from '../../types/billing';
import { Tooltip } from '../ui/tooltip';
import { cn } from '../../utils/common';
import { useChat } from '../../contexts/ChatContext';

/** Collapsed / portal tooltips: drop default `min-w-[220px]` so labels fit tightly. */
const SIDEBAR_TOOLTIP_BUBBLE = 'min-w-0 w-max';

type MenuItem = {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	path?: string;
	children?: MenuItem[];
	/** When true, item is shown but disabled (greyed) — user can see it to want to upgrade */
	locked?: boolean;
	lockTooltip?: string;
	/** Tier required for plan upgrade modal */
	requiredTier?: 'growth' | 'scale';
};

interface AppSidebarProps {
	organization?: OrganizationRow | null;
	organizationLoading?: boolean;
}

const Sidebar: React.FC<AppSidebarProps> = ({ organization, organizationLoading }) => {
	const { user, signOut } = useAuth();
	const { clearChat } = useChat();
	const { isExpanded, isMobileOpen } = useSidebar();
	const { openCROStudioUpgradeModal } = useCROStudioUpgrade();
	const { openTierUpgradeModal } = useTierUpgrade();
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
	// AI Assistant: Growth tier (roadmap). Use canAccessPerformance — not hasFinAccess — so Builder never passes.
	const canAccessFin = canAccessPerformancePage;
	// Don't show CRO as locked while org is loading — avoids sidebar twitch when addon status loads
	const croStudioLocked = !organizationLoading && !canAccessCROStudio(organization ?? null);

	const menuItems: MenuItem[] = useMemo(() => {
		const items: MenuItem[] = [
			{ icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
			{
				icon: BookOpen,
				label: 'Content',
				children: [
					{ icon: MapIcon, label: 'Strategy', path: '/strategy' },
					{ icon: GitFork, label: 'Clusters', path: '/clusters' },
					{ icon: Video, label: 'Videos', path: '/videos' },
					{ icon: ShoppingBag, label: 'Ecommerce', path: '/ecommerce' }
					// { icon: CalendarDays, label: 'Calendar', path: '/calendar' },
					// { icon: Key, label: 'Keywords', path: '/keywords' }
				]
			}
		];

		// Performance & Rankings: always show, disabled when locked (Growth tier)
		// Don't show locked while org loading — avoids sidebar twitch when subscription loads
		const perfLocked = !organizationLoading && !canAccessPerformancePage;
		const techLocked = !organizationLoading && !canAccessTechnicalPage;
		items.push({
			icon: BarChart2,
			label: 'Performance',
			path: '/performance',
			locked: perfLocked,
			lockTooltip: 'Upgrade to Growth plan to unlock',
			requiredTier: 'growth'
		});
		items.push({
			icon: TrendingUp,
			label: 'Rankings',
			path: '/rankings',
			locked: perfLocked,
			lockTooltip: 'Upgrade to Growth plan to unlock',
			requiredTier: 'growth'
		});

		// Technical: Schema Generator (Builder+), Site Audit (Scale+) — always show Site Audit, disabled when locked
		const technicalChildren: MenuItem[] = [
			{
				icon: GitCompare,
				label: 'Site Audit',
				path: '/technical',
				locked: techLocked,
				lockTooltip: 'Upgrade to Scale plan to unlock',
				requiredTier: 'scale'
			},
			{ icon: Code2, label: 'Schema Generator', path: '/schema-generator' }
		];
		items.push({
			icon: Wrench,
			label: 'Technical',
			path: '/technical',
			children: technicalChildren
		});

		items.push({ icon: BadgeDollarSign, label: 'CRO Studio', path: '/cro-studio' });

		// AI Assistant: Growth+ (roadmap). Gate by plan tier — Builder never passes.
		const finLocked = !organizationLoading && !canAccessFin;
		items.push({
			icon: Bot,
			label: 'AI Assistant',
			path: '/assistant',
			locked: finLocked,
			lockTooltip: 'Upgrade to Growth plan to unlock',
			requiredTier: 'growth'
		});

		items.push(
			{ icon: Globe, label: 'Sites', path: '/sites' },
			// { icon: Building2, label: 'Organization', path: '/organization' },
			{ icon: Settings, label: 'Settings', path: '/settings' }
		);

		return items;
	}, [canAccessPerformancePage, canAccessTechnicalPage, canAccessFin, organizationLoading]);

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

	const wide = isExpanded || isMobileOpen;
	const isCollapsed = !wide;
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
			className={`fixed top-0 left-0 isolate z-50 mt-16 flex h-screen flex-col overflow-x-hidden border-r border-gray-200 bg-white text-gray-900 transition-[width,transform] duration-220 ease-in-out motion-reduce:transition-none lg:mt-0 dark:border-gray-600 dark:bg-gray-900 ${wide ? 'w-55' : 'w-22'} ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
		>
			<div className="h-header-height flex min-h-10 shrink-0 items-center justify-center overflow-hidden border-b border-gray-200 px-1 pt-4 pb-2 dark:border-gray-600">
				<Link to="/" className="flex max-h-10 w-full max-w-full items-center justify-center">
					<Logo isIcon={!wide} width={115} height="auto" className="max-h-8" />
				</Link>
			</div>

			<nav className="mb-6 flex min-h-0 flex-1 flex-col overflow-hidden">
				<div className="scrollbar-branded min-h-0 flex-1 overflow-x-hidden overflow-y-auto py-4 contain-[layout]">
					<ul className="w-full min-w-0 space-y-2 px-2">
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
								return (
									<li key={item.label + index} className="relative">
										{isCollapsed ? (
											isOpen ? (
												<button
													ref={flyoutTriggerRef}
													onMouseEnter={() => handleFlyoutEnter(item.label)}
													onMouseLeave={() => handleFlyoutLeave(item.label)}
													className={cn(
														'mx-auto flex w-fit items-center space-x-3 rounded-lg px-4 py-3 transition-colors duration-200',
														active
															? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 border-brand-600 border-l-4'
															: 'hover:bg-brand-50 dark:hover:bg-brand-700/20 text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white',
														!wide ? 'justify-center' : 'justify-start'
													)}
												>
													<item.icon className="size-5 shrink-0" />
												</button>
											) : (
												<Tooltip
													className={SIDEBAR_TOOLTIP_BUBBLE}
													content={item.label}
													tooltipPosition="right"
													usePortal
												>
													<button
														onMouseEnter={() => handleFlyoutEnter(item.label)}
														onMouseLeave={() => handleFlyoutLeave(item.label)}
														className={cn(
															'mx-auto flex w-fit items-center space-x-3 rounded-lg px-4 py-3 transition-colors duration-200',
															active
																? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 border-brand-600 border-l-4'
																: 'hover:bg-brand-50 dark:hover:bg-brand-700/20 text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white',
															!wide ? 'justify-center' : 'justify-start'
														)}
													>
														<item.icon className="size-5 shrink-0" />
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
												<item.icon className="size-5 shrink-0" />
												{wide && (
													<span className="flex min-w-0 flex-1 items-center justify-between gap-2 font-medium">
														{item.label}
														<ChevronDown
															className={cn(
																'size-4 shrink-0 text-gray-500 transition-transform duration-200',
																isOpen ? 'rotate-180' : ''
															)}
														/>
													</span>
												)}
											</button>
										)}
										{/* Expanded sidebar: inline submenu */}
										{wide && isOpen ? (
											<ul className="mt-1 space-y-1 pl-4">
												{(group.children ?? []).map((r: MenuItem) =>
													r.locked ? (
														<li key={r.path as string}>
															<Tooltip
																className={SIDEBAR_TOOLTIP_BUBBLE}
																content={r.lockTooltip ?? 'Upgrade to unlock'}
																tooltipPosition="right"
																usePortal
															>
																<button
																	type="button"
																	onClick={() =>
																		r.requiredTier && openTierUpgradeModal(r.requiredTier, r.label)
																	}
																	className="flex w-full items-center space-x-3 rounded-lg px-4 py-2 text-sm text-gray-400 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-500 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-400"
																>
																	<r.icon className="size-4 shrink-0" />
																	<span>{r.label}</span>
																	<Lock className="size-3 shrink-0 opacity-70" />
																</button>
															</Tooltip>
														</li>
													) : (
														<li key={r.path as string}>
															<Link to={r.path as string}>
																<button
																	className={`flex w-full items-center space-x-3 rounded-lg px-4 py-2 text-sm transition-colors duration-200 ${
																		window.location.pathname.startsWith(r.path as string)
																			? 'bg-brand-50/50 dark:bg-brand-600/10 text-brand-700 dark:text-brand-300'
																			: 'hover:bg-brand-50 dark:hover:bg-brand-700/20 text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white'
																	}`}
																>
																	<r.icon className="size-4 shrink-0" />
																	<span>{r.label}</span>
																</button>
															</Link>
														</li>
													)
												)}
											</ul>
										) : null}
									</li>
								);
							}
							// Tier-locked: show but disabled (greyed + lock), click → upgrade modal (like CRO addon)
							if (item.locked && item.lockTooltip && item.requiredTier) {
								const lockedClass =
									'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-500 dark:hover:text-gray-400 cursor-pointer';
								return (
									<li key={`${item.path ?? item.label}${index}`}>
										{!wide ? (
											<Tooltip
												className={SIDEBAR_TOOLTIP_BUBBLE}
												content={item.lockTooltip}
												tooltipPosition="right"
												usePortal
											>
												<button
													type="button"
													onClick={() => openTierUpgradeModal(item.requiredTier!, item.label)}
													className={`flex w-full items-center space-x-3 rounded-lg px-4 py-3 transition-colors duration-200 ${lockedClass}`}
												>
													<item.icon className="size-5 shrink-0" />
													{wide && <span className="font-medium">{item.label}</span>}
													<Lock className="size-3.5 shrink-0 opacity-70" />
												</button>
											</Tooltip>
										) : (
											<Tooltip
												className={SIDEBAR_TOOLTIP_BUBBLE}
												content={item.lockTooltip}
												tooltipPosition="right"
												usePortal
											>
												<button
													type="button"
													onClick={() => openTierUpgradeModal(item.requiredTier!, item.label)}
													className={`flex w-full items-center space-x-3 rounded-lg px-4 py-3 transition-colors duration-200 ${lockedClass}`}
												>
													<item.icon className="size-5 shrink-0" />
													<span className="font-medium">{item.label}</span>
													<Lock className="size-3.5 shrink-0 opacity-70" />
												</button>
											</Tooltip>
										)}
									</li>
								);
							}

							// CRO Studio locked: show button that opens upgrade modal (greyed + lock icon)
							const isCROStudioLocked = item.path === '/cro-studio' && croStudioLocked;

							if (isCROStudioLocked) {
								const lockedClass =
									'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-500 dark:hover:text-gray-400 cursor-pointer';
								return (
									<li key={`${item.path ?? item.label}${index}`}>
										{!wide ? (
											<Tooltip
												className={SIDEBAR_TOOLTIP_BUBBLE}
												content="Add CRO Studio ($29/mo) to unlock"
												tooltipPosition="right"
												usePortal
											>
												<button
													type="button"
													onClick={openCROStudioUpgradeModal}
													className={cn(
														'flex w-full items-center justify-center space-x-3 rounded-lg px-4 py-3 transition-colors duration-200',
														lockedClass,
														!wide ? 'justify-center' : 'justify-start'
													)}
												>
													<Target className="size-5 shrink-0" />
													{wide && (
														<>
															<span className="font-medium">{item.label}</span>
															<Lock className="size-3.5 shrink-0 opacity-70" />
														</>
													)}
												</button>
											</Tooltip>
										) : (
											<button
												type="button"
												onClick={openCROStudioUpgradeModal}
												className={`flex w-full items-center space-x-3 rounded-lg px-4 py-3 transition-colors duration-200 ${lockedClass}`}
											>
												<Target className="size-5 shrink-0" />
												<span className="font-medium">{item.label}</span>
												<Lock className="size-3.5 shrink-0 opacity-70" />
											</button>
										)}
									</li>
								);
							}

							const linkClassName = cn(
								'mx-auto flex mx-auto items-center space-x-3 rounded-lg px-4 py-3 transition-colors duration-200',
								active
									? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 border-brand-600 border-l-4'
									: 'hover:bg-brand-50 dark:hover:bg-brand-700/20 text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white',
								wide ? 'w-full' : 'w-fit'
							);

							const assistantHomeClick = item.path === '/assistant' ? () => clearChat() : undefined;

							return (
								<li key={`${item.path ?? item.label}${index}`}>
									{!wide ? (
										<Tooltip
											className={SIDEBAR_TOOLTIP_BUBBLE}
											content={item.label}
											tooltipPosition="right"
											usePortal
										>
											<Link to={item.path as string} onClick={assistantHomeClick}>
												<button
													className={cn(linkClassName, !wide ? 'justify-center' : 'justify-start')}
												>
													<item.icon className="size-5 shrink-0" />
													{wide && <span className="font-medium">{item.label}</span>}
												</button>
											</Link>
										</Tooltip>
									) : (
										<Link to={item.path as string} onClick={assistantHomeClick}>
											<button
												className={cn(linkClassName, !wide ? 'justify-center' : 'justify-start')}
											>
												<item.icon className="size-5 shrink-0" />
												{wide && <span className="font-medium">{item.label}</span>}
											</button>
										</Link>
									)}
								</li>
							);
						})}
					</ul>
				</div>
			</nav>

			{/* Collapsed sidebar: flyout submenu via portal (avoids overflow clip) */}
			{openFlyoutItem &&
				flyoutPosition &&
				typeof document !== 'undefined' &&
				createPortal(
					<>
						<div
							className="fixed z-100 w-56 space-y-2 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-900"
							style={{ top: flyoutPosition.top, left: flyoutPosition.left }}
							onMouseEnter={() => handleFlyoutEnter(openFlyoutItem.label)}
							onMouseLeave={() => handleFlyoutLeave(openFlyoutItem.label)}
						>
							<p className="pl-2 text-sm font-semibold">{openFlyoutItem.label}</p>
							<ul className="space-y-1 border-t pt-2">
								{(openFlyoutItem.children ?? []).map((r: MenuItem) =>
									r.locked ? (
										<li key={r.path as string}>
											<Tooltip
												className={SIDEBAR_TOOLTIP_BUBBLE}
												content={r.lockTooltip ?? 'Upgrade to unlock'}
												tooltipPosition="right"
												usePortal
											>
												<button
													type="button"
													onClick={() => {
														if (r.requiredTier) openTierUpgradeModal(r.requiredTier, r.label);
														setOpenGroups((m) => ({ ...m, [openFlyoutItem.label]: false }));
													}}
													className="flex w-full items-center space-x-3 rounded-md px-3 py-2 text-sm text-gray-400 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-500 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-400"
												>
													<r.icon className="size-5 shrink-0" />
													<span>{r.label}</span>
													<Lock className="size-3 shrink-0 opacity-70" />
												</button>
											</Tooltip>
										</li>
									) : (
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
													<r.icon className="size-5 shrink-0" />
													<span>{r.label}</span>
												</button>
											</Link>
										</li>
									)
								)}
							</ul>
						</div>
					</>,
					document.body
				)}

			<div className="border-t border-gray-200 py-2 dark:border-gray-600">
				<div
					className={cn(
						'mb-4 flex items-center space-x-2 border-b border-gray-200 px-4 pb-2 dark:border-gray-600',
						wide ? 'justify-start' : 'justify-center'
					)}
				>
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
					{wide && (
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
					className={cn(
						'text-brand-500 bg-brand-100/50 dark:text-brand-400 dark:bg-brand-900/30 mx-auto mb-4 flex items-center justify-center space-x-3 rounded-lg px-4 py-3 transition-colors duration-200',
						wide ? 'w-5/6' : 'w-fit'
					)}
				>
					<LogOut className="size-4" />
					{wide && <span className="text-sm font-medium">Sign Out</span>}
				</button>
			</div>
		</aside>
	);
};

export default Sidebar;
