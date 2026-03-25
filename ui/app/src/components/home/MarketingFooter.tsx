import React from 'react';
import { Link } from 'react-router';

const APP_URL = import.meta.env.VITE_APP_URL ?? 'https://app.sharkly.co';
const MARKETING_URL = import.meta.env.VITE_MARKETING_URL ?? 'https://sharkly.co';

const Footer: React.FC = () => {
	return (
		<footer className="bg-black dark:bg-black text-white py-16 md:py-20 border-t border-gray-800">
			<div className="mx-auto max-w-[1200px] px-4 sm:px-6">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
					<div>
						<div className="font-bold text-xl mb-4">Sharkly</div>
						<p className="text-white/70 dark:text-gray-400 text-sm leading-relaxed max-w-[240px]">
							SEO made simple for small businesses. Topic strategy, content clusters, and keyword research
							— all automated.
						</p>
					</div>
					<div>
						<div className="text-sm font-semibold mb-4 text-white/90 dark:text-gray-200">Product</div>
						<div className="flex flex-col gap-2">
							<Link to="/" className="text-white/80 dark:text-gray-400 text-sm hover:text-white dark:hover:text-gray-200">
								Overview
							</Link>
							<a href={`${APP_URL}/strategy`} className="text-white/80 dark:text-gray-400 text-sm hover:text-white dark:hover:text-gray-200">
								Strategy
							</a>
							<a href={`${APP_URL}/clusters`} className="text-white/80 dark:text-gray-400 text-sm hover:text-white dark:hover:text-gray-200">
								Clusters
							</a>
							<a href={`${APP_URL}/rankings`} className="text-white/80 dark:text-gray-400 text-sm hover:text-white dark:hover:text-gray-200">
								Rankings
							</a>
							<a href={`${MARKETING_URL}/blog`} className="text-white/80 dark:text-gray-400 text-sm hover:text-white dark:hover:text-gray-200">
								Blog
							</a>
						</div>
					</div>
					<div>
						<div className="text-sm font-semibold mb-4 text-white/90 dark:text-gray-200">Company</div>
						<div className="flex flex-col gap-2">
							<a href={`${MARKETING_URL}/privacy`} className="text-white/80 dark:text-gray-400 text-sm hover:text-white dark:hover:text-gray-200">
								Privacy
							</a>
							<a href={`${MARKETING_URL}/cookies`} className="text-white/80 dark:text-gray-400 text-sm hover:text-white dark:hover:text-gray-200">
								Cookies
							</a>
							<a href={`${MARKETING_URL}/terms`} className="text-white/80 dark:text-gray-400 text-sm hover:text-white dark:hover:text-gray-200">
								Terms
							</a>
							<a href={`${MARKETING_URL}/blog/rss.xml`} className="text-white/80 dark:text-gray-400 text-sm hover:text-white dark:hover:text-gray-200">
								RSS
							</a>
							<Link to="/signup" className="text-white/80 dark:text-gray-400 text-sm hover:text-white dark:hover:text-gray-200">
								Sign up
							</Link>
						</div>
					</div>
				</div>
				<div className="border-t border-white/20 dark:border-gray-800 pt-8 text-center text-white/50 dark:text-gray-500 text-sm">
					© {new Date().getFullYear()} Sharkly. SEO made simple for small businesses.
				</div>
			</div>
		</footer>
	);
};

export default Footer;
