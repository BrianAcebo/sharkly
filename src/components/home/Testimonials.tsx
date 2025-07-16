import React from 'react';
import { Star, Shield, Building, Users } from 'lucide-react';

const Testimonials: React.FC = () => {
	const testimonials = [
		{
			name: 'Sarah Chen',
			role: 'Senior Threat Intelligence Analyst',
			company: 'CyberShield Security',
			avatar:
				'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
			content:
				'True Sight Intelligence has revolutionized our investigation process. What used to take days now takes hours. The AI correlation capabilities are simply outstanding.',
			rating: 5,
			industry: 'Cybersecurity'
		},
		{
			name: 'Michael Rodriguez',
			role: 'Digital Forensics Investigator',
			company: 'Federal Bureau of Investigation',
			avatar:
				'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
			content:
				'The depth and accuracy of intelligence gathering is remarkable. The platform has become an indispensable tool in our digital investigation toolkit.',
			rating: 5,
			industry: 'Law Enforcement'
		},
		{
			name: 'Dr. Emily Watson',
			role: 'Research Director',
			company: 'University Security Lab',
			avatar:
				'https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
			content:
				'The visualization capabilities and network mapping features provide insights that were previously impossible to achieve. A game-changer for OSINT research.',
			rating: 5,
			industry: 'Academic Research'
		}
	];

	const certifications = [
		{ name: 'SOC 2 Type II', icon: Shield },
		{ name: 'ISO 27001', icon: Building },
		{ name: 'GDPR Compliant', icon: Users },
		{ name: 'Enterprise Ready', icon: Shield }
	];

	return (
		<section id="testimonials" className="bg-white py-20 dark:bg-gray-900">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				{/* Section Header */}
				<div className="mb-16 text-center">
					<div className="bg-success-100 dark:bg-success-500/20 text-success-600 dark:text-success-400 mb-6 inline-flex items-center rounded-full px-4 py-2 text-sm font-medium">
						<Users className="mr-2 h-4 w-4" />
						Trusted by Professionals
					</div>
					<h2 className="mb-6 text-4xl font-bold text-gray-900 md:text-5xl dark:text-white">
						Intelligence Teams
						<span className="from-brand-500 to-blue-light-500 block bg-gradient-to-r bg-clip-text text-transparent">
							Trust Our Platform
						</span>
					</h2>
					<p className="mx-auto max-w-3xl text-xl text-gray-600 dark:text-gray-300">
						Join hundreds of security professionals, investigators, and researchers who rely on True
						Sight Intelligence for their most critical investigations.
					</p>
				</div>

				{/* Testimonials Grid */}
				<div className="mb-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
					{testimonials.map((testimonial, index) => (
						<div
							key={index}
							className="hover:shadow-theme-lg rounded-2xl bg-gray-50 p-8 transition-all duration-300 hover:-translate-y-1 dark:bg-gray-800"
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
						<h3 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
							Enterprise Security & Compliance
						</h3>
						<p className="text-gray-600 dark:text-gray-300">
							Built with security-first principles and certified for enterprise use
						</p>
					</div>

					<div className="grid grid-cols-2 gap-8 md:grid-cols-4">
						{certifications.map((cert, index) => {
							const IconComponent = cert.icon;
							return (
								<div key={index} className="text-center">
									<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
										<IconComponent className="h-8 w-8 text-gray-600 dark:text-gray-400" />
									</div>
									<div className="font-semibold text-gray-900 dark:text-white">{cert.name}</div>
								</div>
							);
						})}
					</div>
				</div>
			</div>
		</section>
	);
};

export default Testimonials;
