import React from 'react';
import { Search, Network, Eye, Database, Shield, TrendingUp, FileSearch } from 'lucide-react';

const Features: React.FC = () => {
	const features = [
		{
			icon: Search,
			title: 'AI-Powered Search',
			description:
				'Advanced machine learning algorithms automatically correlate data across multiple sources for comprehensive intelligence gathering.',
			color: 'brand'
		},
		{
			icon: Network,
			title: 'Identity Mapping',
			description:
				'Visualize complex relationships and connections between individuals, organizations, and digital assets in interactive graphs.',
			color: 'blue-light'
		},
		{
			icon: Eye,
			title: 'Real-time Monitoring',
			description:
				'Continuous surveillance of target entities with instant alerts when new information becomes available across the web.',
			color: 'success'
		},
		{
			icon: Database,
			title: 'Breach Data Analysis',
			description:
				'Access and analyze data from major security breaches to identify compromised credentials and exposed information.',
			color: 'warning'
		},
		{
			icon: FileSearch,
			title: 'Deep Web Crawling',
			description:
				'Sophisticated crawlers search beyond surface web content to uncover hidden information and obscure digital footprints.',
			color: 'theme-purple'
		},
		{
			icon: TrendingUp,
			title: 'Threat Intelligence',
			description:
				'Track emerging threats, monitor suspicious activities, and assess risk levels with comprehensive threat intelligence feeds.',
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
						Advanced Capabilities
					</div>
					<h2 className="mb-6 text-4xl font-bold text-gray-900 md:text-5xl dark:text-white">
						Comprehensive OSINT
						<span className="from-brand-500 to-blue-light-500 block bg-gradient-to-r bg-clip-text text-transparent">
							Intelligence Platform
						</span>
					</h2>
					<p className="mx-auto max-w-3xl text-xl text-gray-600 dark:text-gray-300">
						Leverage cutting-edge AI technology to gather, analyze, and visualize intelligence from
						across the digital landscape with unprecedented speed and accuracy.
					</p>
				</div>

				{/* Features Grid */}
				<div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
					{features.map((feature, index) => {
						const IconComponent = feature.icon;
						return (
							<div
								key={index}
								className="group hover:shadow-theme-lg rounded-2xl border border-transparent bg-gray-50 p-8 transition-all duration-300 hover:-translate-y-1 hover:border-gray-200 hover:bg-white dark:bg-gray-800 dark:hover:border-gray-600 dark:hover:bg-gray-700"
							>
								<div
									className={`mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl ${getColorClasses(feature.color)}`}
								>
									<IconComponent className="h-8 w-8" />
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
						<div className="text-blue-light-500 dark:text-blue-light-400 mb-2 text-4xl font-bold">
							50K+
						</div>
						<div className="text-gray-600 dark:text-gray-400">Investigations Completed</div>
					</div>
					<div className="text-center">
						<div className="text-success-500 dark:text-success-400 mb-2 text-4xl font-bold">
							99.9%
						</div>
						<div className="text-gray-600 dark:text-gray-400">Uptime Guarantee</div>
					</div>
					<div className="text-center">
						<div className="text-warning-500 dark:text-warning-400 mb-2 text-4xl font-bold">
							24/7
						</div>
						<div className="text-gray-600 dark:text-gray-400">Real-time Monitoring</div>
					</div>
				</div>
			</div>
		</section>
	);
};

export default Features;
