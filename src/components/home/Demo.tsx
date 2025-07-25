import React, { useState } from 'react';
import { Play, MessageSquare, Users, Zap, Database, ArrowRight } from 'lucide-react';

const Demo: React.FC = () => {
	const [activeStep, setActiveStep] = useState(0);

	const steps = [
		{
			icon: Users,
			title: 'Add Lead',
			description: 'Enter lead information and contact details',
			detail:
				'Our CRM accepts multiple lead sources and automatically creates comprehensive profiles with contact information, company details, and interaction history.'
		},
		{
			icon: MessageSquare,
			title: 'AI Outreach',
			description: 'AI assistant engages leads via text, email, and phone',
			detail:
				'Intelligent AI automatically reaches out to leads through their preferred channels, using personalized messaging based on lead profile and behavior.'
		},
		{
			icon: Zap,
			title: 'Lead Qualification',
			description: 'AI scores and qualifies prospects automatically',
			detail:
				'Advanced algorithms analyze engagement patterns, responses, and behavior to score leads and identify high-value prospects ready for sales team follow-up.'
		},
		{
			icon: Database,
			title: 'Pipeline Management',
			description: 'Track leads through sales pipeline stages',
			detail:
				'Comprehensive pipeline visualization shows lead progression, conversion rates, and automated follow-up sequences to ensure no opportunity is missed.'
		}
	];

	return (
		<section id="demo" className="bg-gray-50 py-20 dark:bg-gray-900">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				{/* Section Header */}
				<div className="mb-16 text-center">
					<div className="bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 mb-6 inline-flex items-center rounded-full px-4 py-2 text-sm font-medium">
						<Play className="mr-2 h-4 w-4" />
						See It In Action
					</div>
					<h2 className="mb-6 text-4xl font-bold text-gray-900 md:text-5xl dark:text-white">
						AI Sales Assistant
						<span className="from-brand-500 to-blue-light-500 block bg-gradient-to-r bg-clip-text text-transparent">
							Workflow Demo
						</span>
					</h2>
					<p className="mx-auto max-w-3xl text-xl text-gray-600 dark:text-gray-300">
						Experience how Paperboat CRM transforms lead management with AI-powered automation
						through our streamlined four-step sales process.
					</p>
				</div>

				<div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
					{/* Process Steps */}
					<div className="space-y-6">
						{steps.map((step, index) => {
							const IconComponent = step.icon;
							const isActive = activeStep === index;

							return (
								<div
									key={index}
									className={`cursor-pointer rounded-2xl p-6 transition-all duration-300 ${
										isActive
											? 'shadow-theme-lg border-brand-200 dark:border-brand-500/30 border-2 bg-white dark:bg-gray-700'
											: 'hover:shadow-theme-md bg-white/50 hover:bg-white dark:bg-gray-700/50 dark:hover:bg-gray-700'
									}`}
									onClick={() => setActiveStep(index)}
								>
									<div className="flex items-start space-x-4">
										<div
											className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${
												isActive
													? 'bg-brand-500 text-white'
													: 'bg-brand-100 dark:bg-brand-500/20 text-brand-500 dark:text-brand-400'
											}`}
										>
											<IconComponent className="h-6 w-6" />
										</div>
										<div className="flex-1">
											<div className="mb-2 flex items-center space-x-3">
												<h3 className="text-lg font-bold text-gray-900 dark:text-white">
													{step.title}
												</h3>
												<span
													className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors ${
														isActive
															? 'bg-brand-500 text-white'
															: 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-400'
													}`}
												>
													{index + 1}
												</span>
											</div>
											<p className="mb-3 text-gray-600 dark:text-gray-300">{step.description}</p>
											{isActive && (
												<p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
													{step.detail}
												</p>
											)}
										</div>
									</div>
								</div>
							);
						})}
					</div>

					{/* Demo Visualization */}
					<div className="relative">
						<div className="shadow-theme-xl rounded-2xl border border-gray-200 bg-white p-8 dark:border-gray-700 dark:bg-gray-900">
							<div className="mb-6 flex items-center justify-between">
								<h4 className="text-lg font-semibold text-gray-900 dark:text-white">
									Sales Dashboard
								</h4>
								<div className="flex items-center space-x-2">
									<div className="bg-success-500 h-3 w-3 rounded-full"></div>
									<span className="text-sm text-gray-500 dark:text-gray-400">Live</span>
								</div>
							</div>

							{/* Mock Interface */}
							<div className="space-y-4">
								<div className="flex items-center space-x-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
									<Users className="h-5 w-5 text-gray-400" />
									<span className="text-gray-600 dark:text-gray-300">john.doe@techcompany.com</span>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div className="bg-brand-50 dark:bg-brand-500/10 rounded-lg p-4">
										<div className="text-brand-500 dark:text-brand-400 text-2xl font-bold">127</div>
										<div className="text-sm text-gray-600 dark:text-gray-400">Active Leads</div>
									</div>
									<div className="bg-success-50 dark:bg-success-500/10 rounded-lg p-4">
										<div className="text-success-500 dark:text-success-400 text-2xl font-bold">
											89
										</div>
										<div className="text-sm text-gray-600 dark:text-gray-400">Qualified Prospects</div>
									</div>
								</div>

								<div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
									<div className="mb-3 flex items-center justify-between">
										<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
											Pipeline Progress
										</span>
										<span className="text-brand-500 dark:text-brand-400 text-sm">
											{activeStep === 0
												? '25%'
												: activeStep === 1
													? '50%'
													: activeStep === 2
														? '75%'
														: '100%'}
										</span>
									</div>
									<div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
										<div
											className="from-brand-500 to-blue-light-500 h-2 rounded-full bg-gradient-to-r transition-all duration-500"
											style={{
												width:
													activeStep === 0
														? '25%'
														: activeStep === 1
															? '50%'
															: activeStep === 2
																? '75%'
																: '100%'
											}}
										></div>
									</div>
								</div>
							</div>

							<div className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700">
								<button className="bg-brand-500 hover:bg-brand-600 inline-flex w-full items-center justify-center rounded-lg px-6 py-3 font-medium text-white transition-colors">
									Start Live Demo
									<ArrowRight className="ml-2 h-4 w-4" />
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
};

export default Demo;
