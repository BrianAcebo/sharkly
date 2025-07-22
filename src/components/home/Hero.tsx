import React from 'react';
import { MessageSquare, Users, Zap, ArrowRight } from 'lucide-react';

interface HeroProps {
	isLoading?: boolean;
}

const Hero: React.FC<HeroProps> = ({ isLoading = false }) => {
	if (isLoading) {
		return (
			<section className="relative overflow-hidden pt-24 pb-16">
				{/* Background Elements - Keep the same gradient */}
				<div className="from-brand-50 via-blue-light-25 dark:to-brand-950/20 absolute inset-0 bg-gradient-to-br to-gray-50 dark:from-gray-900 dark:via-gray-900"></div>
				<div className="bg-brand-200/20 dark:bg-brand-500/10 absolute top-1/4 left-1/4 h-72 w-72 rounded-full blur-3xl"></div>
				<div className="bg-blue-light-200/20 dark:bg-blue-light-500/10 absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full blur-3xl"></div>

				<div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
					<div className="text-center">
						{/* Badge Skeleton */}
						<div className="mb-8 inline-flex items-center rounded-full px-4 py-2">
							<div className="h-4 w-4 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700"></div>
							<div className="ml-2 h-4 w-32 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700"></div>
						</div>

						{/* Main Headline Skeleton */}
						<div className="mb-6 flex flex-col items-center space-y-4">
							<div className="h-12 w-3/4 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div>
							<div className="h-12 w-1/2 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div>
							<div className="h-12 w-2/3 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div>
						</div>

						{/* Subtitle Skeleton */}
						<div className="mx-auto mb-8 max-w-3xl space-y-2">
							<div className="h-6 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div>
							<div className="mx-auto h-6 w-5/6 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div>
						</div>

						{/* CTA Buttons Skeleton */}
						<div className="mb-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
							<div className="h-14 w-48 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div>
							<div className="h-14 w-48 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div>
						</div>

						{/* Feature Icons Skeleton */}
						<div className="mx-auto grid max-w-2xl grid-cols-1 gap-8 sm:grid-cols-3">
							{[...Array(3)].map((_, index) => (
								<div key={index} className="flex flex-col items-center">
									<div className="mb-4 h-16 w-16 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-700"></div>
									<div className="mb-2 h-5 w-24 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div>
									<div className="h-4 w-32 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div>
								</div>
							))}
						</div>
					</div>
				</div>
			</section>
		);
	}

	return (
		<section className="relative overflow-hidden pt-24 pb-16">
			{/* Background Elements */}
			<div className="via-brand-50/50 dark:via-brand-950/50 absolute inset-0 bg-gradient-to-r from-transparent to-gray-50 dark:from-transparent dark:to-gray-900"></div>
			<div className="bg-brand-200/20 dark:bg-brand-500/10 absolute top-1/4 left-1/4 h-72 w-72 rounded-full blur-3xl"></div>
			<div className="bg-blue-light-200/20 dark:bg-blue-light-500/10 absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full blur-3xl"></div>

			<div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				<div className="text-center">
					{/* Badge */}
					<div className="bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 mb-8 inline-flex items-center rounded-full px-4 py-2 text-sm font-medium">
						<Zap className="mr-2 h-4 w-4" />
						AI-Powered Sales Assistant
					</div>

					{/* Main Headline */}
					<h1 className="mb-6 text-4xl leading-tight font-bold text-gray-900 md:text-6xl lg:text-7xl dark:text-white">
						Automate Outreach &
						<br />
						<span className="from-brand-500 to-blue-light-500 mx-4 bg-gradient-to-r bg-clip-text text-transparent">
							Pre-Qualify Leads
						</span>
						With AI
					</h1>

					{/* Subtitle */}
					<p className="mx-auto mb-8 max-w-3xl text-xl leading-relaxed text-gray-600 md:text-2xl dark:text-gray-300">
						Paperboat CRM is an AI sales assistant that automates outreach, chats with leads, and pre-qualifies prospects to help your teams close more deals faster.
					</p>

					{/* CTA Buttons */}
					<div className="mb-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
						<button className="bg-brand-500 hover:bg-brand-600 shadow-theme-lg hover:shadow-theme-xl inline-flex items-center rounded-lg px-8 py-4 text-lg font-semibold text-white transition-all duration-200 hover:scale-105">
							Start Free Trial
							<ArrowRight className="ml-2 h-5 w-5" />
						</button>
						<button className="hover:border-brand-500 dark:hover:border-brand-400 hover:text-brand-500 dark:hover:text-brand-400 inline-flex items-center rounded-lg border-2 border-gray-300 px-8 py-4 text-lg font-semibold text-gray-700 transition-all duration-200 dark:border-gray-600 dark:text-gray-300">
							Watch Demo
						</button>
					</div>

					{/* Feature Icons */}
					<div className="mx-auto grid max-w-2xl grid-cols-1 gap-8 sm:grid-cols-3">
						<div className="flex flex-col items-center">
							<div className="bg-brand-100 dark:bg-brand-500/20 mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
								<MessageSquare className="text-brand-500 dark:text-brand-400 h-8 w-8" />
							</div>
							<h3 className="mb-2 font-semibold text-gray-900 dark:text-white">AI Chat</h3>
							<p className="text-center text-sm text-gray-600 dark:text-gray-400">
								Intelligent conversations with leads via text, email, and phone
							</p>
						</div>

						<div className="flex flex-col items-center">
							<div className="bg-blue-light-100 dark:bg-blue-light-500/20 mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
								<Users className="text-blue-light-500 dark:text-blue-light-400 h-8 w-8" />
							</div>
							<h3 className="mb-2 font-semibold text-gray-900 dark:text-white">Lead Management</h3>
							<p className="text-center text-sm text-gray-600 dark:text-gray-400">
								Complete CRM with pipeline tracking and lead qualification
							</p>
						</div>

						<div className="flex flex-col items-center">
							<div className="bg-success-100 dark:bg-success-500/20 mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
								<Zap className="text-success-500 dark:text-success-400 h-8 w-8" />
							</div>
							<h3 className="mb-2 font-semibold text-gray-900 dark:text-white">Automated Sequences</h3>
							<p className="text-center text-sm text-gray-600 dark:text-gray-400">
								Set up follow-up sequences and knowledge base responses
							</p>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
};

export default Hero;
