import React from 'react';
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
    Factory
} from 'lucide-react';
import { Link } from 'react-router';
import UserAvatar from '../common/UserAvatar';
import { useSidebar } from '../../hooks/useSidebar';

const Sidebar: React.FC = () => {
	const { user, signOut } = useAuth();
	const { isExpanded, isMobileOpen } = useSidebar();

	const menuItems = [
		{ 
			icon: LayoutDashboard, 
			label: 'Cases', 
			path: '/cases'
		},
		{
			icon: Users,
			label: 'People',
			path: '/people'
		},
		{
			icon: Factory,
			label: 'Businesses',
			path: '/businesses'
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

			<nav className="mb-6 flex flex-1 py-10">
				<ul className="w-full space-y-2 px-4">
					{menuItems.map((item, index) => (
						<li key={item.path + index}>
							<Link to={item.path}>
								<button
									className={`flex w-full items-center space-x-3 rounded-lg px-4 py-3 transition-colors duration-200 ${
										window.location.pathname.startsWith(item.path)
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
						</li>
					))}
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
