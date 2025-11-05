import React from 'react';
import { Star, Building, Users, FileCheck2, BadgeCheck, Lock } from 'lucide-react';

const Testimonials: React.FC = () => {
	const testimonials = [
		{
			name: 'Sarah Chen',
			role: 'Sales Director',
			company: 'TechFlow Solutions',
			avatar:
				'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
			content:
				'True Sight has revolutionized our sales process. The AI assistant handles initial outreach and qualification, allowing our team to focus on closing deals. Our conversion rates have increased by 40%.',
			rating: 5,
			industry: 'SaaS'
		},
		{
			name: 'Michael Rodriguez',
			role: 'VP of Sales',
			company: 'Growth Dynamics',
			avatar:
				'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
			content:
				'The automated sequences and knowledge base features ensure consistent messaging across our entire sales team. The AI qualification has helped us identify high-value prospects much faster.',
			rating: 5,
			industry: 'Consulting'
		},
		{
			name: 'Emily Watson',
			role: 'Sales Manager',
			company: 'InnovateCorp',
			avatar:
				'https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
			content:
				'Having an AI assistant that can investigate cases 24/7 has been a game-changer. Our response times went from hours to minutes, and the lead qualification accuracy is impressive.',
			rating: 5,
			industry: 'Technology'
		}
	];

	// const certifications = [
	// 	{ name: 'SOC 2 Type II', icon: Shield },
	// 	{ name: 'GDPR Compliant', icon: Building },
	// 	{ name: 'Enterprise Ready', icon: Users },
	// 	{ name: 'AI-Powered', icon: Shield }
	// ];

	return (
		<section id="testimonials" className="bg-white py-20 dark:bg-gray-900">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				{/* Section Header */}
                <div className="mb-16 text-center">
                    <div className="bg-success-100 dark:bg-success-500/20 text-success-600 dark:text-success-400 mb-6 inline-flex items-center rounded-full px-4 py-2 text-sm font-medium">
                        <Users className="mr-2 h-4 w-4" />
                        Trusted by Investigators
                    </div>
                    <h2 className="mb-6 text-4xl font-bold text-gray-900 md:text-5xl dark:text-white">
                        Investigators Who
                        <span className="from-brand-500 to-blue-light-500 block bg-gradient-to-r bg-clip-text text-transparent">
                            Work Smarter, Not Harder
                        </span>
                    </h2>
                    <p className="mx-auto max-w-3xl text-xl text-gray-600 dark:text-gray-300">
                        Hundreds of private investigators, legal support teams, and boutique agencies rely on True Sight to keep cases organized and deliver intelligence faster.
                    </p>
                </div>

				{/* Testimonials Grid */}
				<div className="mb-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
					{testimonials.map((testimonial, index) => (
						<div
							key={index}
							className="hover:shadow-theme-lg rounded-2xl bg-gray-50 p-8 transition-all duration-300 hover:-translate-y-1 dark:bg-gray-900"
						>
							{/* Rating */}
							<div className="mb-6 flex items-center space-x-1">
								{[...Array(testimonial.rating)].map((_, i) => (
									<Star key={i} className="fill-warning-400 text-warning-400 h-5 w-5" />
								))}
							</div>

							{/* Content */}
							<blockquote className="mb-6 leading-relaxed text-gray-700 dark:text-gray-300">
								"{testimonial.content}"
							</blockquote>

							{/* Author */}
							<div className="flex items-center space-x-4">
								<img
									src={testimonial.avatar}
									alt={testimonial.name}
									className="h-12 w-12 rounded-full object-cover"
								/>
								<div>
									<div className="font-semibold text-gray-900 dark:text-white">
										{testimonial.name}
									</div>
									<div className="text-sm text-gray-600 dark:text-gray-400">{testimonial.role}</div>
									<div className="text-brand-500 dark:text-brand-400 text-sm">
										{testimonial.company}
									</div>
								</div>
							</div>

							{/* Industry Badge */}
							<div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
								<span className="bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium">
									{testimonial.industry}
								</span>
							</div>
						</div>
					))}
				</div>

				{/* Certifications */}
                <div className="border-t border-gray-200 pt-16 dark:border-gray-700">
                    <div className="mb-12 text-center">
                        <h3 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">Enterprise Security & Compliance</h3>
                        <p className="text-gray-600 dark:text-gray-300">Built with security‑first principles and compliant evidence controls</p>
                    </div>

                    <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
                        <div className="text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-900">
                                <Lock className="h-8 w-8 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div className="font-semibold text-gray-900 dark:text-white">Secure Evidence Storage</div>
                        </div>
                        <div className="text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-900">
                                <FileCheck2 className="h-8 w-8 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div className="font-semibold text-gray-900 dark:text-white">Attorney‑Client Ready</div>
                        </div>
                        <div className="text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-900">
                                <Building className="h-8 w-8 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div className="font-semibold text-gray-900 dark:text-white">Trusted PI Partners</div>
                        </div>
                        <div className="text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-900">
                                <BadgeCheck className="h-8 w-8 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div className="font-semibold text-gray-900 dark:text-white">AI Systems Verified</div>
                        </div>
                    </div>
                </div>
			</div>
		</section>
	);
};

export default Testimonials;
