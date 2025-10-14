import React from 'react';
import { ArrowRight, Shield, Zap, Users } from 'lucide-react';

const CTA: React.FC = () => {
	return (
		<section className="from-brand-600 via-brand-500 to-blue-light-500 relative overflow-hidden bg-gradient-to-br py-20">
			{/* Background Elements */}
			<div className="absolute inset-0 bg-gray-900/10"></div>
			<div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-white/5 blur-3xl"></div>
			<div className="absolute right-1/4 bottom-0 h-72 w-72 rounded-full bg-white/5 blur-3xl"></div>

			<div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="text-center">
					{/* Main Content */}
					<div className="mb-12">
						<h2 className="mb-6 text-4xl font-bold text-white md:text-5xl lg:text-6xl">
							Ready to Transform
							<span className="block">Your Sales Process?</span>
						</h2>
						<p className="text-blue-light-100 mx-auto mb-8 max-w-3xl text-xl md:text-2xl">
							Join hundreds of sales teams using Paperboat CRM to automate outreach, qualify leads faster, and close more deals with AI-powered assistance.
						</p>
					</div>

					{/* Feature Highlights */}
					<div className="mx-auto mb-12 grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-3">
						<div className="flex flex-col items-center">
							<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
								<Zap className="h-8 w-8 text-white" />
							</div>
							<h3 className="mb-2 text-lg font-semibold text-white">Instant Setup</h3>
							<p className="text-blue-light-100 text-center">
								Start automating sales in under 5 minutes
							</p>
						</div>

						<div className="flex flex-col items-center">
							<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
								<Shield className="h-8 w-8 text-white" />
							</div>
							<h3 className="mb-2 text-lg font-semibold text-white">Enterprise Security</h3>
							<p className="text-blue-light-100 text-center">
								SOC 2 certified with full compliance
							</p>
						</div>

						<div className="flex flex-col items-center">
							<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
								<Users className="h-8 w-8 text-white" />
							</div>
							<h3 className="mb-2 text-lg font-semibold text-white">Expert Support</h3>
							<p className="text-blue-light-100 text-center">24/7 support from sales automation specialists</p>
						</div>
					</div>

					{/* CTA Buttons */}
					<div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
						<button className="text-brand-600 shadow-theme-xl inline-flex items-center rounded-lg bg-white px-8 py-4 text-lg font-semibold transition-all duration-200 hover:scale-105 hover:bg-gray-100">
                            Start 7‑Day Trial
							<ArrowRight className="ml-2 h-5 w-5" />
						</button>
						<button className="inline-flex items-center rounded-lg border-2 border-white/30 px-8 py-4 text-lg font-semibold text-white transition-all duration-200 hover:border-white/50 hover:bg-white/10">
							Schedule Demo
						</button>
					</div>

					{/* Trust Indicators */}
					<div className="mt-12 border-t border-white/20 pt-8">
						<p className="text-blue-light-100 mb-4 text-sm">
							Trusted by leading sales teams worldwide
						</p>
						<div className="flex items-center justify-center space-x-8 text-white/60">
							<span className="text-sm font-medium">10,000+ Leads Qualified</span>
							<span className="text-sm">•</span>
							<span className="text-sm font-medium">500+ Sales Teams</span>
							<span className="text-sm">•</span>
							<span className="text-sm font-medium">SOC 2 Certified</span>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
};

export default CTA;
