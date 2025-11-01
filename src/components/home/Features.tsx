import React from 'react';
import { Search, CircuitBoard, Share2, Eye, FileText, Webhook, Shield } from 'lucide-react';

const Features: React.FC = () => {
    const features = [
        {
            icon: Search,
            title: 'AI‑Powered Search',
            description:
                'Advanced machine learning algorithms automatically correlate data across multiple sources for comprehensive intelligence gathering.',
            color: 'brand'
        },
        {
            icon: CircuitBoard,
            title: 'AI Research Assistant',
            description:
                'Offload OSINT lookups, cross‑referencing, and data enrichment to an always‑on AI assistant.',
            color: 'blue-light'
        },
        {
            icon: Share2,
            title: 'Identity Mapping',
            description:
                'Visualize complex relationships and connections between individuals, organizations, and digital assets in interactive graphs.',
            color: 'success'
        },
        {
            icon: Eye,
            title: 'Real‑time Monitoring',
            description:
                'Continuous surveillance of target entities with instant alerts when new information becomes available across the web.',
            color: 'warning'
        },
        {
            icon: FileText,
            title: 'AI Report Drafting',
            description:
                'Auto‑draft case summaries, timelines, and client‑ready reports while preserving investigator notes and citations.',
            color: 'theme-purple'
        },
        {
            icon: Webhook,
            title: 'Deep Web Crawling',
            description:
                'Sophisticated crawlers uncover hidden information from forums and obscure digital footprints.',
            color: 'error'
        }
    ];

	const getColorClasses = (color: string) => {
		const colorMap = {
			brand: 'bg-brand-100 dark:bg-brand-500/20 text-brand-500 dark:text-brand-400',
			'blue-light':
				'bg-blue-light-100 dark:bg-blue-light-500/20 text-blue-light-500 dark:text-blue-light-400',
			success: 'bg-success-100 dark:bg-success-500/20 text-success-500 dark:text-success-400',
			warning: 'bg-warning-100 dark:bg-warning-500/20 text-warning-500 dark:text-warning-400',
			'theme-purple': 'bg-purple-100 dark:bg-purple-500/20 text-purple-500 dark:text-purple-400',
			error: 'bg-error-100 dark:bg-error-500/20 text-error-500 dark:text-error-400'
		};
		return colorMap[color as keyof typeof colorMap] || colorMap.brand;
	};

    return (
        <section id="features" className="bg-white py-20 dark:bg-gray-900">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				{/* Section Header */}
				<div className="mb-16 text-center">
                    <div className="bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 mb-6 inline-flex items-center rounded-full px-4 py-2 text-sm font-medium">
                        <Shield className="mr-2 h-4 w-4" />
                        Built for PIs & Risk Analysts
                    </div>
                    <h2 className="mb-6 text-4xl font-bold text-gray-900 md:text-5xl dark:text-white">
                        Comprehensive OSINT
                        <span className="from-brand-500 to-blue-light-500 block bg-gradient-to-r bg-clip-text text-transparent">
                            Intelligence Platform for PIs
                        </span>
                    </h2>
                    <p className="mx-auto max-w-3xl text-xl text-gray-600 dark:text-gray-300">
                        Give your agency an AI assistant that tracks the facts, researches sources, keeps details organized, and keeps your focus on judgment—not data hunting.
                    </p>
				</div>

				{/* Features Grid */}
				<div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
					{features.map((feature, index) => {
						const IconComponent = feature.icon;
						return (
							<div
								key={index}
								className="group hover:shadow-theme-lg rounded-2xl border border-transparent bg-gray-50 p-8 transition-all duration-300 hover:-translate-y-1 hover:border-gray-200 hover:bg-white dark:bg-gray-900 dark:hover:border-gray-600 dark:hover:bg-gray-700"
							>
                            <div
                                className={`mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl ring-1 ring-gray-200 dark:ring-gray-700 ${getColorClasses(feature.color)}`}
                            >
                                <IconComponent className="h-6 w-6" />
                            </div>
								<h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
									{feature.title}
								</h3>
								<p className="leading-relaxed text-gray-600 dark:text-gray-300">
									{feature.description}
								</p>
							</div>
						);
					})}
				</div>

                {/* Stats Section */}
                <div className="mt-20 grid grid-cols-2 gap-8 md:grid-cols-4">
                    <div className="text-center">
                        <div className="text-brand-500 dark:text-brand-400 mb-2 text-4xl font-bold">500M+</div>
                        <div className="text-gray-600 dark:text-gray-400">Data Points Analyzed</div>
                    </div>
                    <div className="text-center">
                        <div className="text-blue-light-500 dark:text-blue-light-400 mb-2 text-4xl font-bold">50k+</div>
                        <div className="text-gray-600 dark:text-gray-400">Investigations Completed</div>
                    </div>
                    <div className="text-center">
                        <div className="text-success-500 dark:text-success-400 mb-2 text-4xl font-bold">99.9%</div>
                        <div className="text-gray-600 dark:text-gray-400">Uptime Guarantee</div>
                    </div>
                    <div className="text-center">
                        <div className="text-warning-500 dark:text-warning-400 mb-2 text-4xl font-bold">24/7</div>
                        <div className="text-gray-600 dark:text-gray-400">Live Support</div>
                    </div>
                </div>
			</div>
		</section>
	);
};

export default Features;
