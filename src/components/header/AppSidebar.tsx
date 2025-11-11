import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
	LayoutDashboard,
	Bot,
	Building2,
	Settings,
	LogOut,
	UserRoundSearch,
	Glasses,
	FolderSearch,
    Users,
    Factory,
    Database
} from 'lucide-react';
import { Link } from 'react-router';
import UserAvatar from '../common/UserAvatar';
import { useSidebar } from '../../hooks/useSidebar';

type MenuItem = { icon: React.ComponentType<{ className?: string }>; label: string; path?: string; children?: MenuItem[] };

const Sidebar: React.FC = () => {
	const { user, signOut } = useAuth();
	const { isExpanded, isMobileOpen } = useSidebar();
	const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

	const menuItems: MenuItem[] = [
		{ 
			icon: LayoutDashboard, 
			label: 'Cases', 
			path: '/cases'
		},
		{
			icon: Database,
			label: 'Records',
			children: [
				{ icon: Users, label: 'People', path: '/people' },
				{ icon: Factory, label: 'Businesses', path: '/businesses' },
				{ icon: Users, label: 'Emails', path: '/emails' },
				{ icon: Users, label: 'Phones', path: '/phones' },
				{ icon: Users, label: 'Social Profiles', path: '/profiles' },
				{ icon: Users, label: 'Usernames', path: '/usernames' },
		{ icon: Users, label: 'Leaks', path: '/leaks' },
		{ icon: Users, label: 'Images', path: '/images' },
        { icon: Users, label: 'Documents', path: '/documents' },
        { icon: Users, label: 'IP Addresses', path: '/ips' },
				{ icon: Users, label: 'Properties', path: '/properties' },
				{ icon: Users, label: 'Domains', path: '/domains' }
			]
		},
		{
			icon: Bot,
			label: 'AI Assistant', 
			path: '/assistant'
		},
		{
			icon: FolderSearch,
			label: 'Web Search',
			path: '/web-search'
		},
		{
			icon: Glasses,
			label: 'Monitor',
			path: '/monitor'
		},
		{
			icon: UserRoundSearch,
			label: 'Social',
			path: '/social'
		},
		{ 
			icon: Building2, 
			label: 'Organization', 
			path: '/organization'
		},
		{ 
			icon: Settings, 
			label: 'Settings', 
			path: '/settings'
		}
	];

	return (
		<aside
			className={`fixed top-0 left-0 z-50 mt-16 flex h-screen flex-col border-r border-gray-200 bg-white text-gray-900 transition-all duration-300 ease-in-out lg:mt-0 dark:border-gray-600 dark:bg-gray-900 ${isExpanded || isMobileOpen ? 'w-[250px]' : 'w-[90px]'} ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
		>
			<div className="flex h-header-height items-center justify-center border-b border-gray-200 pt-4 pb-2 dark:border-gray-600">
				<Link to="/">
					{isExpanded || isMobileOpen ? (
						<>
							<img
								className="dark:hidden"
								src="/images/logos/logo.svg"
								alt="Logo"
								width={200}
								height={40}
							/>
							<img
								className="hidden dark:block"
								src="/images/logos/logo-dark.svg"
								alt="Logo"
								width={200}
								height={40}
							/>
						</>
					) : (
						<>
							<img
								className="dark:hidden"
								src="/images/logos/logo-icon.svg"
								alt="Logo"
								width={50}
								height={50}
							/>
							<img
								className="hidden dark:block"
								src="/images/logos/logo-icon-dark.svg"
								alt="Logo"
								width={50}
								height={50}
							/>
						</>
					)}
				</Link>
			</div>

			<nav className="mb-6 flex flex-1 py-10 overflow-y-auto">
				<ul className="w-full space-y-2 px-4">
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
								<li key={item.label + index}>
									<button
										onClick={() => setOpenGroups((m) => ({ ...m, [item.label]: !isOpen }))}
										className={`flex w-full items-center space-x-3 rounded-lg px-4 py-3 transition-colors duration-200 ${
											active
												? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 border-brand-600 border-l-4'
												: 'hover:bg-brand-50 dark:hover:bg-brand-700/20 text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white'
										}`}
									>
										<item.icon className={isExpanded || isMobileOpen ? 'size-5' : 'w-full'} />
										{(isExpanded || isMobileOpen) && <span className="font-medium">{item.label}</span>}
									</button>
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
								<Link to={item.path as string}>
									<button
										className={`flex w-full items-center space-x-3 rounded-lg px-4 py-3 transition-colors duration-200 ${
											active
												? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 border-brand-600 border-l-4'
												: 'hover:bg-brand-50 dark:hover:bg-brand-700/20 text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white'
										}`}
									>
										<item.icon className={isExpanded || isMobileOpen ? 'size-5' : 'w-full'} />
										{(isExpanded || isMobileOpen) && <span className="font-medium">{item.label}</span>}
									</button>
								</Link>
							</li>
						);
					})}
				</ul>
			</nav>

			<div className="border-t border-gray-200 p-4 dark:border-gray-600">
				<div className="mb-4 flex items-center justify-center space-x-3">
					<div className="rounded-full border border-gray-200 dark:border-gray-600">
						<UserAvatar
							user={{
								name:
									user?.first_name && user?.last_name
										? `${user.first_name} ${user.last_name}`
										: user?.email || 'User',
								avatar: user?.avatar
							}}
							size="md"
						/>
					</div>
					{(isExpanded || isMobileOpen) && (
						<div>
							<p className="font-medium text-black dark:text-white">
								{user?.first_name} {user?.last_name}
							</p>
							<p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
						</div>
					)}
				</div>

				<button
					onClick={signOut}
					className="text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 flex w-full items-center space-x-3 rounded-lg px-4 py-3 transition-colors duration-200"
				>
					<LogOut className={isExpanded || isMobileOpen ? 'size-5' : 'w-full'} />
					{(isExpanded || isMobileOpen) && <span className="font-medium">Sign Out</span>}
				</button>
			</div>
		</aside>
	);
};

export default Sidebar;
