import React from 'react';
import { MessageSquare, Users, Zap, Shield, Brain, Target, BarChart3 } from 'lucide-react';

const Features: React.FC = () => {
	const features = [
		{
			icon: MessageSquare,
			title: 'AI Sales Assistant',
			description:
				'Intelligent AI that can engage with leads through text, email, and phone calls, automatically qualifying prospects and scheduling meetings.',
			color: 'brand'
		},
		{
			icon: Users,
			title: 'Lead Management',
			description:
				'Complete CRM system to track leads, manage pipeline stages, and organize prospect information with detailed profiles and interaction history.',
			color: 'blue-light'
		},
		{
			icon: Zap,
			title: 'Automated Sequences',
			description:
				'Set up intelligent follow-up sequences that automatically engage leads at the right time with personalized messages and next steps.',
			color: 'success'
		},
		{
			icon: Brain,
			title: 'Knowledge Base',
			description:
				'Create and manage responses to common questions, objections, and scenarios to ensure consistent, high-quality interactions.',
			color: 'warning'
		},
		{
			icon: Target,
			title: 'Lead Qualification',
			description:
				'AI-powered scoring and qualification system that identifies high-value prospects and prioritizes follow-up based on engagement signals.',
			color: 'theme-purple'
		},
		{
			icon: BarChart3,
			title: 'Sales Analytics',
			description:
				'Comprehensive reporting and analytics to track conversion rates, pipeline performance, and AI assistant effectiveness.',
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
						Powerful Sales Automation
					</div>
					<h2 className="mb-6 text-4xl font-bold text-gray-900 md:text-5xl dark:text-white">
						Complete AI-Powered
						<span className="from-brand-500 to-blue-light-500 block bg-gradient-to-r bg-clip-text text-transparent">
							Sales Platform
						</span>
					</h2>
					<p className="mx-auto max-w-3xl text-xl text-gray-600 dark:text-gray-300">
						Transform your sales process with intelligent automation, AI-powered lead qualification, and comprehensive CRM capabilities designed to close more deals faster.
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
						<div className="text-brand-500 dark:text-brand-400 mb-2 text-4xl font-bold">10K+</div>
						<div className="text-gray-600 dark:text-gray-400">Leads Qualified</div>
					</div>
					<div className="text-center">
						<div className="text-blue-light-500 dark:text-blue-light-400 mb-2 text-4xl font-bold">
							500+
						</div>
						<div className="text-gray-600 dark:text-gray-400">Sales Teams</div>
					</div>
					<div className="text-center">
						<div className="text-success-500 dark:text-success-400 mb-2 text-4xl font-bold">
							3x
						</div>
						<div className="text-gray-600 dark:text-gray-400">Faster Response</div>
					</div>
					<div className="text-center">
						<div className="text-warning-500 dark:text-warning-400 mb-2 text-4xl font-bold">
							24/7
						</div>
						<div className="text-gray-600 dark:text-gray-400">AI Availability</div>
					</div>
				</div>
			</div>
		</section>
	);
};

export default Features;
