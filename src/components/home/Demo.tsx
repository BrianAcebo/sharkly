import React, { useState } from 'react';
import { Play, Users, Database, ArrowRight, FileText, Search, Dot } from 'lucide-react';
import { Link } from 'react-router';

const Demo: React.FC = () => {
	const [activeStep, setActiveStep] = useState(0);

	const steps = [
		{
			icon: Search,
			title: 'Input Target',
			description: 'Name, handle, email, phone, or domain',
			detail:
				'Start an investigation with any identifier. The assistant resolves entities and prepares a clean subject profile.'
		},
		{
			icon: Database,
			title: 'Data Aggregation',
			description: 'Collect across web, social, and breaches',
			detail:
				'The system pulls structured evidence from multiple sources with citations and an audit trail.'
		},
		{
			icon: Users,
			title: 'Identity Mapping',
			description: 'Link aliases, accounts, and assets',
			detail: 'Visualize connections between people, accounts, devices, emails, and organizations.'
		},
		{
			icon: FileText,
			title: 'AI Report Drafting',
			description: 'Summaries, timelines, and citations',
			detail:
				'Generate professional drafts you can edit and export. All claims include source links.'
		}
	];

	return (
		<section id="demo" className="bg-gray-50 py-20 dark:bg-gray-900">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				{/* Section Header */}
				<div className="mb-16 text-center">
					<div className="bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 mb-6 inline-flex items-center rounded-full px-4 py-2 text-sm font-medium">
						<Play className="mr-2 h-4 w-4" />
						SEO Workflow Demo
					</div>
					<h2 className="mb-6 text-4xl font-bold text-gray-900 md:text-5xl dark:text-white">
						AI SEO Assistant
						<span className="from-brand-500 to-blue-light-500 block bg-gradient-to-r bg-clip-text text-transparent">
							Workflow Demo
						</span>
					</h2>
					<p className="mx-auto max-w-3xl text-xl text-gray-600 dark:text-gray-300">
						See how Sharkly converts raw data into actionable intelligence through a simple, guided
						flow.
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
											? 'shadow-theme-lg border-2 border-blue-300 bg-white dark:border-blue-500/30 dark:bg-gray-700'
											: 'hover:shadow-theme-md bg-white/50 hover:bg-white dark:bg-gray-700/50 dark:hover:bg-gray-700'
									}`}
									onClick={() => setActiveStep(index)}
								>
									<div className="flex items-start space-x-4">
										<div
											className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${isActive ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-500 dark:bg-blue-500/20 dark:text-blue-400'}`}
										>
											<IconComponent className="h-6 w-6" />
										</div>
										<div className="flex-1">
											<div className="mb-2 flex items-center space-x-3">
												<h3 className="text-lg font-bold text-gray-900 dark:text-white">
													{step.title}
												</h3>
												<span
													className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors ${isActive ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-400'}`}
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
									Investigation Dashboard
								</h4>
								<div className="flex items-center space-x-2">
									<div className="bg-success-500 h-3 w-3 rounded-full"></div>
									<span className="text-sm text-gray-500 dark:text-gray-400">Syncing</span>
								</div>
							</div>

							{/* Mock Interface */}
							<div className="space-y-4">
								<div className="flex items-center space-x-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
									<Users className="h-5 w-5 text-gray-400" />
									<span className="text-gray-600 dark:text-gray-300">Subject: Jane Collins</span>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-500/10">
										<div className="text-2xl font-bold text-blue-600 dark:text-blue-400">42</div>
										<div className="text-sm text-gray-600 dark:text-gray-400">
											Subjects Investigated
										</div>
									</div>
									<div className="bg-success-50 dark:bg-success-500/10 rounded-lg p-4">
										<div className="text-success-500 dark:text-success-400 text-2xl font-bold">
											18
										</div>
										<div className="text-sm text-gray-600 dark:text-gray-400">
											Leads Flagged Today
										</div>
									</div>
								</div>

								<div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
									<div className="mb-3 flex items-center justify-between">
										<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
											Investigation Progress
										</span>
										<span className="text-sm text-blue-500 dark:text-blue-400">Briefing</span>
									</div>
									<div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
										<div
											className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500"
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

								<div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
									<div className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
										Next Actions
									</div>
									<ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
										<li className="flex items-center">
											<Dot className="h-4 w-4 text-gray-400" /> Verify newly surfaced LLC address
											against county filings
										</li>
										<li className="flex items-center">
											<Dot className="h-4 w-4 text-gray-400" /> Schedule outreach to confirmed
											associate at 9:00 AM
										</li>
										<li className="flex items-center">
											<Dot className="h-4 w-4 text-gray-400" /> Attach breach report excerpt to
											evidence log
										</li>
									</ul>
								</div>
							</div>

							<div className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700">
								<Link to="/signup" className="w-full">
									<button className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700">
										Start 7-Day Trial
										<ArrowRight className="ml-2 h-4 w-4" />
									</button>
								</Link>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
};

export default Demo;
