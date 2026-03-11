import React from 'react';
import { Link } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { CheckCircle } from 'lucide-react';

const Pricing: React.FC = () => {
	const plans = [
		{
			name: 'Starter',
			subtitle: 'Built for solo creators and small sites getting started with SEO.',
			price: 29,
			popular: false,
			features: ['1 site', 'Keyword research & strategy', 'AI content briefs', 'Basic performance tracking'],
		},
		{
			name: 'Growth',
			subtitle: 'Ideal for small businesses and marketing teams publishing regularly.',
			price: 79,
			popular: true,
			features: ['Up to 3 sites', 'Full topic clusters', 'AI content generation', 'Google Search Console integration'],
		},
		{
			name: 'Scale',
			subtitle: 'For agencies and brands managing multiple sites and teams.',
			price: 199,
			popular: false,
			features: ['Unlimited sites', 'Team seats', 'Priority support', 'Advanced analytics'],
		},
	];

	return (
		<section id="pricing" className="py-20 md:py-24 bg-[#f5f3ed] dark:bg-gray-950">
			<div className="mx-auto max-w-[1200px] px-4 sm:px-6">
				<div className="text-center mb-16">
					<h2 className="text-3xl md:text-4xl font-bold text-black dark:text-white mb-4">Simple, transparent pricing</h2>
					<p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
						Get everything you need to build and track your SEO strategy. Start with a free trial.
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
					{plans.map((plan, idx) => (
						<Card
							key={idx}
							className={`relative transition-all duration-200 hover:shadow-lg bg-white ${
								plan.popular ? 'ring-2 ring-black shadow-lg md:scale-105' : 'border-black/10'
							}`}
						>
							{plan.popular && (
								<div className="absolute -top-4 left-1/2 w-max -translate-x-1/2">
									<Badge className="bg-black px-4 py-1 text-white">Most Popular</Badge>
								</div>
							)}

							<CardHeader className="pb-4 text-center">
								<CardTitle className="text-2xl font-semibold text-black">{plan.name}</CardTitle>
								<p className="mt-2 text-sm text-gray-600">{plan.subtitle}</p>
								<div className="mt-4">
									<div className="text-4xl font-bold text-black">
										${plan.price}
										<span className="text-lg font-normal text-gray-500">/month</span>
									</div>
								</div>
							</CardHeader>

							<CardContent className="space-y-4 text-center">
								<div className="space-y-3">
									{plan.features.map((f) => (
										<div key={f} className="flex items-center justify-center text-left text-sm text-gray-600">
											<CheckCircle className="mr-3 h-4 w-4 text-black shrink-0" />
											{f}
										</div>
									))}
								</div>

								<Link to="/signup">
									<Button
										className={`w-full ${
											plan.popular ? 'bg-black text-white hover:bg-gray-800' : 'bg-black text-white hover:bg-gray-800'
										}`}
									>
										Start free trial
									</Button>
								</Link>
							</CardContent>
						</Card>
					))}
				</div>

				<div className="mt-12 text-center">
					<div className="inline-flex items-center gap-2 rounded-lg bg-black/5 dark:bg-white/10 px-6 py-3 text-black dark:text-white">
						<CheckCircle className="h-5 w-5" />
						<span className="font-medium">Free trial on all plans</span>
					</div>
				</div>
			</div>
		</section>
	);
};

export default Pricing;
