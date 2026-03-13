import React from 'react';

const APP_URL = import.meta.env.VITE_APP_URL ?? 'https://app.sharkly.co';

const Features: React.FC = () => {
	return (
		<section id="features" className="bg-[#f5f3ed] dark:bg-gray-950 py-16 md:py-24">
			{/* Two-column intro */}
			<div className="mx-auto max-w-[1200px] px-4 sm:px-6">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 items-start">
					<div>
						<h4 className="text-2xl font-semibold text-black dark:text-white leading-snug mb-4">
							Your own, personal SEO expert.<br />Completely automated.
						</h4>
						<p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
							Sharkly manages your entire SEO workflow. Discover topics, research keywords, build
							clusters, and generate content automatically — so you focus on publishing, not learning SEO.
						</p>
					</div>
					<div className="hidden md:block w-px min-h-[120px] bg-black/15 dark:bg-white/20 self-stretch" />
					<div>
						<h4 className="text-2xl font-semibold text-black dark:text-white leading-snug mb-4">
							Win back time.<br />Improve your results.
						</h4>
						<p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
							Save weeks on keyword research. Post your site and niche, and let Sharkly do the heavy
							lifting. You take over only when the strategy is ready — no more sifting through endless
							spreadsheets.
						</p>
					</div>
				</div>
			</div>

			{/* Strategy section */}
			<div className="mx-auto max-w-[1200px] px-4 sm:px-6 mt-24">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
					<div>
						<p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Strategy</p>
						<h2 className="text-3xl font-bold text-black dark:text-white mb-4 leading-tight">
							Find topics others miss, automatically.
						</h2>
						<p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
							Sharkly runs real keyword research using DataForSEO — not estimates. It finds topics matched
							to your domain authority and traffic tier, so you target what you can actually rank for.
						</p>
						<p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
							Save weeks on research. Get a prioritised list of topics in minutes.
						</p>
						<a
							href={`${APP_URL}/strategy`}
							className="inline-flex items-center justify-between gap-4 bg-black dark:bg-white text-white dark:text-black px-6 py-4 rounded-[32px] font-medium max-w-[320px] w-full hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
						>
							<span>Learn about Strategy</span>
							<span>→</span>
						</a>
					</div>
					<div className="aspect-[4/3] rounded-2xl overflow-hidden bg-gray-200 dark:bg-gray-800">
						<img
							src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200"
							alt="Keyword strategy"
							className="w-full h-full object-cover"
							loading="lazy"
						/>
					</div>
				</div>
			</div>

			{/* Clusters section (reversed on desktop) */}
			<div className="mx-auto max-w-[1200px] px-4 sm:px-6 mt-24">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
					<div className="md:order-2">
						<p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Clusters</p>
						<h2 className="text-3xl font-bold text-black dark:text-white mb-4 leading-tight">
							Build content that covers topics completely.
						</h2>
						<p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
							Sharkly organises topics into clusters with a focus page and supporting articles. Internal
							linking is built in — no more orphan pages or guesswork about site structure.
						</p>
						<p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
							Each cluster comes with a brief, competitor analysis, and AI-powered content drafts when you're
							ready.
						</p>
						<a
							href={`${APP_URL}/clusters`}
							className="inline-flex items-center justify-between gap-4 bg-black dark:bg-white text-white dark:text-black px-6 py-4 rounded-[32px] font-medium max-w-[320px] w-full hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
						>
							<span>Learn about Clusters</span>
							<span>→</span>
						</a>
					</div>
					<div className="md:order-1 aspect-[4/3] rounded-2xl overflow-hidden bg-gray-200 dark:bg-gray-800">
						<img
							src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200"
							alt="Content clusters"
							className="w-full h-full object-cover"
							loading="lazy"
						/>
					</div>
				</div>
			</div>

			{/* Rankings section */}
			<div className="mx-auto max-w-[1200px] px-4 sm:px-6 mt-24">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
					<div>
						<p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Rankings</p>
						<h2 className="text-3xl font-bold text-black dark:text-white mb-4 leading-tight">
							Track performance with real data from Google.
						</h2>
						<p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
							Connect Google Search Console and see your rankings, impressions, and clicks. Sharkly
							correlates performance with your strategy so you know what's working.
						</p>
						<p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
							No more exporting CSV files. Your SEO performance, always up to date.
						</p>
						<a
							href={`${APP_URL}/rankings`}
							className="inline-flex items-center justify-between gap-4 bg-black dark:bg-white text-white dark:text-black px-6 py-4 rounded-[32px] font-medium max-w-[320px] w-full hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
						>
							<span>Learn about Rankings</span>
							<span>→</span>
						</a>
					</div>
					<div className="aspect-[4/3] rounded-2xl overflow-hidden bg-gray-200 dark:bg-gray-800">
						<img
							src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200"
							alt="Rankings dashboard"
							className="w-full h-full object-cover"
							loading="lazy"
						/>
					</div>
				</div>
			</div>
		</section>
	);
};

export default Features;
