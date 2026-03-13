import React, { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router';
import { ThemeToggleButton } from '../common/ThemeToggleButton';

const MARKETING_URL = import.meta.env.VITE_MARKETING_URL ?? 'https://sharkly.co';
const APP_URL = import.meta.env.VITE_APP_URL ?? 'https://app.sharkly.co';

const Header: React.FC = () => {
	const location = useLocation();
	const headerRef = useRef<HTMLElement>(null);

	useEffect(() => {
		const el = headerRef.current;
		if (el) {
			const height = el.offsetHeight;
			document.documentElement.style.setProperty('--header-height', `${height}px`);
			return () => {
				document.documentElement.style.setProperty('--header-height', '0px');
			};
		}
	}, []);

	const isHome = location.pathname === '/';

	return (
		<header ref={headerRef} className="fixed top-0 right-0 left-0 z-50 bg-[#f5f3ed] dark:bg-gray-950 min-h-[80px] flex items-center justify-center border-b border-transparent dark:border-gray-800">
			<div className="mx-auto max-w-[1200px] w-full px-4 sm:px-6 flex items-center justify-between flex-wrap gap-4">
				<Link to="/" className="font-bold text-xl text-black dark:text-white">
					Sharkly
				</Link>
				<nav className="flex gap-2 items-center flex-wrap">
					<Link
						to="/"
						className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
							isHome
								? 'bg-black/5 text-black dark:bg-white/10 dark:text-white'
								: 'bg-[#f5f3ed] text-black border border-black/[0.08] hover:bg-black/5 dark:bg-gray-950 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-white/10'
						}`}
					>
						Home
					</Link>
					<a href={`${APP_URL}/strategy`} className="px-4 py-2 rounded-xl text-sm font-medium bg-[#f5f3ed] text-black border border-black/[0.08] hover:bg-black/5 dark:bg-gray-950 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-white/10 transition-colors">
						Strategy
					</a>
					<a href={`${APP_URL}/clusters`} className="px-4 py-2 rounded-xl text-sm font-medium bg-[#f5f3ed] text-black border border-black/[0.08] hover:bg-black/5 dark:bg-gray-950 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-white/10 transition-colors">
						Clusters
					</a>
					<a href={`${APP_URL}/rankings`} className="px-4 py-2 rounded-xl text-sm font-medium bg-[#f5f3ed] text-black border border-black/[0.08] hover:bg-black/5 dark:bg-gray-950 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-white/10 transition-colors">
						Rankings
					</a>
					<a href={`${MARKETING_URL}/blog`} className="px-4 py-2 rounded-xl text-sm font-medium bg-[#f5f3ed] text-black border border-black/[0.08] hover:bg-black/5 dark:bg-gray-950 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-white/10 transition-colors">
						Blog
					</a>
					<ThemeToggleButton />
					<Link
						to="/signup"
						className="px-4 py-2 rounded-xl text-sm font-medium bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 transition-colors"
					>
						Sign up
					</Link>
				</nav>
			</div>
		</header>
	);
};


export default Header;
