import React from 'react';
import { Link } from 'react-router';

const Comparison: React.FC = () => {
	return (
		<section className="bg-[#f5f3ed] dark:bg-gray-950 py-16 md:py-24 border-t border-black/5 dark:border-gray-800">
			<div className="mx-auto max-w-[1200px] px-4 sm:px-6">
				<h2 className="text-2xl md:text-3xl font-bold text-black dark:text-white mb-4 leading-tight">
					Sharkly is light years faster than manual SEO.
				</h2>
				<p className="text-lg text-gray-600 dark:text-gray-400 mb-12">
					Manual keyword research and strategy take 2–4 weeks per site. Sharkly delivers a full strategy in
					minutes.
				</p>
				<div className="flex flex-wrap gap-8">
					<div className="flex-1 min-w-[200px]">
						<p className="text-sm text-gray-700 dark:text-gray-300 mb-1">2–4 weeks</p>
						<p className="text-sm text-gray-500 dark:text-gray-500">Traditional SEO agencies</p>
					</div>
					<div className="flex-1 min-w-[200px]">
						<p className="text-sm text-gray-700 dark:text-gray-300 mb-1">1–3 days</p>
						<p className="text-sm text-gray-500 dark:text-gray-500">DIY with spreadsheets</p>
					</div>
					<div className="flex-1 min-w-[200px]">
						<p className="text-sm font-semibold text-black dark:text-white mb-1">~10 minutes</p>
						<p className="text-sm text-gray-700 dark:text-gray-300">Sharkly</p>
					</div>
				</div>
				<div className="mt-8">
					<Link
						to="/signup"
						className="inline-flex items-center gap-3 bg-black dark:bg-white text-white dark:text-black px-6 py-3.5 rounded-xl font-medium text-base hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
					>
						<span>Get started</span>
						<span>→</span>
					</Link>
				</div>
			</div>
		</section>
	);
};

export default Comparison;
