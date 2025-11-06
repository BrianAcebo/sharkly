import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useNotifications } from '../../hooks/useNotifications';
import { usePaymentStatus } from '../../hooks/usePaymentStatus';
import { Search, Bell, Moon, Sun, ChevronDown, User, Settings, LogOut } from 'lucide-react';
import CommandPalette from './CommandPalette';
import NotificationPanel from './NotificationPanel';
import { useSidebar } from '../../hooks/useSidebar';
import { useBreadcrumbs } from '../../hooks/useBreadcrumbs';
import { Link } from 'react-router';
import UserAvatar from '../common/UserAvatar';
import PaymentStatusBanner from '../billing/PaymentStatusBanner';
import TrialBanner from '../billing/TrialBanner';

const Header: React.FC = () => {
	const { user, signOut } = useAuth();
	const { theme, toggleTheme } = useTheme();
	const {
		unreadCount: notificationsUnreadCount,
		fetchUnreadCount: fetchNotificationsUnreadCount,
		isConnectionHealthy,
		serviceAvailable
	} = useNotifications(user?.id || undefined);
	const { paymentStatus } = usePaymentStatus();
	const [showCommandPalette, setShowCommandPalette] = useState(false);
	const [showNotifications, setShowNotifications] = useState(false);
	const [showUserMenu, setShowUserMenu] = useState(false);

	const headerRef = useRef<HTMLHeadingElement>(null);
	const commandPaletteRef = useRef<HTMLDivElement>(null);
	const searchRef = useRef<HTMLDivElement>(null);
	const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();
	const { breadcrumbs, title, returnTo, setReturnTo } = useBreadcrumbs();

	// Keyboard shortcuts + header height CSS var
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
				e.preventDefault();
				setShowCommandPalette(true);
			}
			if (e.key === 'Escape') {
				setShowCommandPalette(false);

				setShowUserMenu(false);
			}
		};

		const el = headerRef.current;
		if (!el) {
			document.addEventListener('keydown', handleKeyDown);
			return () => document.removeEventListener('keydown', handleKeyDown);
		}

		const updateHeight = () => {
			const height = el.offsetHeight;
			document.documentElement.style.setProperty('--header-height', `${height}px`);
		};
		updateHeight();

		const observer = new ResizeObserver(updateHeight);
		observer.observe(el);

		document.addEventListener('keydown', handleKeyDown);
		window.addEventListener('load', updateHeight);

		return () => {
			document.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('load', updateHeight);
			observer.disconnect();
		};
	}, []);

	// Close command palette on outside click *without* preventing default.
	// We attach this listener only while the palette is open.
	useEffect(() => {
		if (!showCommandPalette) return;

		const onPointerDownCapture = (e: PointerEvent) => {
			const target = e.target as HTMLElement | null;
			if (!target) return;

			const clickedInsideSearch = !!searchRef.current?.contains(target);
			const clickedInsidePalette = !!commandPaletteRef.current?.contains(target);

			// If click is outside both search trigger and the palette, close it.
			if (!clickedInsideSearch && !clickedInsidePalette) {
				setShowCommandPalette(false);
			}

			// NOTE: No preventDefault() here — keeps native behaviors (like form submit) intact.
		};

		document.addEventListener('pointerdown', onPointerDownCapture, true);
		return () => {
			document.removeEventListener('pointerdown', onPointerDownCapture, true);
		};
	}, [showCommandPalette]);

	const handleSearchClick = () => {
		setShowCommandPalette(true);
	};

	const handleToggleSidebar = () => {
		if (window.innerWidth >= 1024) {
			toggleSidebar();
		} else {
			toggleMobileSidebar();
		}
	};

	return (
		<>
			<header ref={headerRef} className="sticky top-0 z-50">
				<TrialBanner />
				<PaymentStatusBanner
					organization={paymentStatus?.organization}
					onUpdatePayment={() => {
						window.location.href = '/billing';
					}}
				/>

				<div className="top-0 border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-600 dark:bg-gray-900">
					<div className="flex items-center justify-between gap-4">
						<div className="flex items-center space-x-4">
							<button
								className="z-99999 h-10 w-10 items-center justify-center rounded-lg border-gray-200 text-gray-500 lg:flex lg:h-11 lg:w-11 lg:border dark:border-gray-800 dark:text-gray-400"
								onClick={handleToggleSidebar}
								aria-label="Toggle Sidebar"
							>
								{isMobileOpen ? (
									<svg
										width="24"
										height="24"
										viewBox="0 0 24 24"
										fill="none"
										xmlns="http://www.w3.org/2000/svg"
									>
										<path
											fillRule="evenodd"
											clipRule="evenodd"
											d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
											fill="currentColor"
										/>
									</svg>
								) : (
									<svg
										width="16"
										height="12"
										viewBox="0 0 16 12"
										fill="none"
										xmlns="http://www.w3.org/2000/svg"
									>
										<path
											fillRule="evenodd"
											clipRule="evenodd"
											d="M0.583252 1C0.583252 0.585788 0.919038 0.25 1.33325 0.25H14.6666C15.0808 0.25 15.4166 0.585786 15.4166 1C15.4166 1.41421 15.0808 1.75 14.6666 1.75L1.33325 1.75C0.919038 1.75 0.583252 1.41422 0.583252 1ZM0.583252 11C0.583252 10.5858 0.919038 10.25 1.33325 10.25L14.6666 10.25C15.0808 10.25 15.4166 10.5858 15.4166 11C15.4166 11.4142 15.0808 11.75 14.6666 11.75L1.33325 11.75C0.919038 11.75 0.583252 11.4142 0.583252 11ZM1.33325 5.25C0.919038 5.25 0.583252 5.58579 0.583252 6C0.583252 6.41421 0.919038 6.75 1.33325 6.75L7.99992 6.75C8.41413 6.75 8.74992 6.41421 8.74992 6C8.74992 5.58579 8.41413 5.25 7.99992 5.25L1.33325 5.25Z"
											fill="currentColor"
										/>
									</svg>
								)}
								{/* Cross Icon */}
							</button>

							<div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
								{returnTo ? (
									<Link to={returnTo.path} onClick={() => setReturnTo(null)}>
										<span>{returnTo.label}</span>
									</Link>
								) : (
									<span>Home</span>
								)}
								{breadcrumbs.map((crumb, index) => (
									<React.Fragment key={index}>
										<span>›</span>
										<span>{crumb}</span>
									</React.Fragment>
								))}
								<span>›</span>
								<span className="font-medium text-black dark:text-white">{title}</span>
							</div>
						</div>

						<div ref={searchRef} className="relative w-full max-w-[400px] 2xl:max-w-[600px]">
							<button
								type="button"
								onClick={handleSearchClick}
								className="hover:bg-brand-50 dark:hover:bg-brand-900/20 flex w-full items-center justify-start space-x-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-900 transition-colors duration-200 dark:border-gray-600 dark:text-gray-100"
							>
								<Search className="h-4 w-4 text-gray-400" />
								<span className="text-gray-500 dark:text-gray-400">Search or type command...</span>
								<div className="ml-auto flex items-center space-x-1">
									<kbd className="rounded bg-gray-200 px-1.5 py-0.5 text-xs dark:bg-gray-700">
										⌘
									</kbd>
									<kbd className="rounded bg-gray-200 px-1.5 py-0.5 text-xs dark:bg-gray-700">
										K
									</kbd>
								</div>
							</button>
						</div>

						<div className="flex items-center space-x-4">
							<button
								type="button"
								onClick={() => toggleTheme()}
								className="hover:text-brand-500 dark:hover:text-brand-400 p-2 text-gray-500 transition-colors duration-200 dark:text-gray-400"
							>
								{theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
							</button>

							<div className="relative">
								<button
									title={
										!serviceAvailable ? 'Notifications - Service Unavailable' : 'Notifications'
									}
									type="button"
									onClick={() => setShowNotifications((s) => !s)}
									className={`relative p-2 transition-colors duration-200 ${
										!serviceAvailable
											? 'text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300'
											: 'hover:text-brand-500 dark:hover:text-brand-400 text-gray-500 dark:text-gray-400'
									}`}
								>
									<Bell className="h-5 w-5" />

									{/* Connection status indicator - show when notifications are down */}
									{(!isConnectionHealthy || !serviceAvailable) && (
										<div className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500">
											<span className="text-xs font-bold text-white">!</span>
										</div>
									)}

									{/* Unread count indicator */}
									{notificationsUnreadCount > 0 && (
										<span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
											{notificationsUnreadCount > 99 ? '99+' : notificationsUnreadCount}
										</span>
									)}
								</button>

								{showNotifications && (
									<NotificationPanel
										onClose={() => setShowNotifications(false)}
										fetchUnreadCount={fetchNotificationsUnreadCount}
									/>
								)}
							</div>

							<div className="relative">
								<button
									type="button"
									onClick={() => setShowUserMenu((s) => !s)}
									className="hover:bg-brand-50 dark:hover:bg-brand-900/20 flex items-center space-x-2 rounded-lg p-2 transition-colors duration-200"
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
									<span className="text-sm font-medium text-black dark:text-white">
										{user?.email}
									</span>
									<ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
								</button>

								{showUserMenu && (
									<div className="absolute right-0 z-50 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-900 dark:bg-gray-900">
										<div className="border-b border-gray-200 px-4 py-2 dark:border-gray-900">
											<p className="text-sm font-medium text-black dark:text-white">
												{user?.first_name} {user?.last_name}
											</p>
											<p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
										</div>
										<Link
											to={`/investigators/${user?.id}`}
											className="hover:bg-brand-50 dark:hover:bg-brand-900/20 flex w-full items-center space-x-2 px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300"
											onClick={() => setShowUserMenu(false)}
										>
											<User className="h-4 w-4" />
											<span>Profile</span>
										</Link>

										<Link
											to="/settings"
											className="hover:bg-brand-50 dark:hover:bg-brand-900/20 flex w-full items-center space-x-2 px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300"
											onClick={() => setShowUserMenu(false)}
										>
											<Settings className="h-4 w-4" />
											<span>Settings</span>
										</Link>

										<Link
											to="/notifications"
											className="hover:bg-brand-50 dark:hover:bg-brand-900/20 flex w-full items-center space-x-2 px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300"
											onClick={() => setShowUserMenu(false)}
										>
											<Bell className="h-4 w-4" />
											<span>Notifications</span>
										</Link>
										<button
											type="button"
											onClick={signOut}
											className="text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 flex w-full items-center space-x-2 px-4 py-2 text-left text-sm"
										>
											<LogOut className="h-4 w-4" />
											<span>Sign out</span>
										</button>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</header>

			{showCommandPalette && (
				<CommandPalette ref={commandPaletteRef} onClose={() => setShowCommandPalette(false)} />
			)}
		</>
	);
};

export default Header;
