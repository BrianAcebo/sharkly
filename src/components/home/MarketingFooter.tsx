import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Mail, MapPin, Twitter, Linkedin, Github } from 'lucide-react';

const Footer: React.FC = () => {
	return (
		<footer id="contact" className="bg-gray-900 text-white dark:bg-gray-900">
			<div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
				<div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
					{/* Company Info */}
					<div className="lg:col-span-2">
						<div className="mb-6 flex items-center space-x-3">
							<div className="bg-brand-500 flex h-10 w-10 items-center justify-center rounded-lg">
								<Shield className="h-6 w-6 text-white" />
							</div>
							<div>
								<h3 className="text-xl font-bold">Sharkly</h3>
								<p className="text-sm text-gray-400">AI‑Powered SEO Platform</p>
							</div>
						</div>
						<p className="mb-6 max-w-md text-gray-300">
							Build your SEO strategy, generate optimized content, and track your rankings without
							becoming an SEO expert.
						</p>
						<div className="flex items-center space-x-4">
							<a
								href="#"
								className="rounded-lg bg-gray-900 p-2 transition-colors hover:bg-gray-700"
							>
								<Twitter className="h-5 w-5" />
							</a>
							<a
								href="#"
								className="rounded-lg bg-gray-900 p-2 transition-colors hover:bg-gray-700"
							>
								<Linkedin className="h-5 w-5" />
							</a>
							<a
								href="#"
								className="rounded-lg bg-gray-900 p-2 transition-colors hover:bg-gray-700"
							>
								<Github className="h-5 w-5" />
							</a>
						</div>
					</div>

					{/* Quick Links */}
					<div>
						<h4 className="mb-6 text-lg font-semibold">Platform</h4>
						<ul className="flex flex-col gap-2">
							<div className="space-y-3">
								<li>
									<a href="#features" className="text-gray-300 transition-colors hover:text-white">
										Features
									</a>
								</li>
								<li>
									<a href="#pricing" className="text-gray-300 transition-colors hover:text-white">
										Pricing
									</a>
								</li>
								<li>
									<a href="#demo" className="text-gray-300 transition-colors hover:text-white">
										Demo
									</a>
								</li>
							</div>
							<div className="space-y-3">
								<li>
									<a
										href="#testimonials"
										className="text-gray-300 transition-colors hover:text-white"
									>
										Testimonials
									</a>
								</li>
								<li>
									<a href="#contact" className="text-gray-300 transition-colors hover:text-white">
										Contact
									</a>
								</li>
							</div>
						</ul>
					</div>

					{/* Contact */}
					<div>
						<h4 className="mb-6 text-lg font-semibold">Contact</h4>
						<div className="space-y-4">
							<div className="flex items-center space-x-3">
								<Mail className="h-5 w-5 text-gray-400" />
								<span className="text-gray-300">hello@sharkly.co</span>
							</div>
							{/* <div className="flex items-center space-x-3">
								<Phone className="h-5 w-5 text-gray-400" />
								<span className="text-gray-300">+1 (555) 123-4567</span>
							</div> */}
							<div className="flex items-center space-x-3">
								<MapPin className="h-5 w-5 text-gray-400" />
								<span className="text-gray-300">San Francisco, CA</span>
							</div>
						</div>
					</div>
				</div>

				{/* Bottom Section */}
				<div className="mt-12 border-t border-gray-900 pt-8">
					<div className="flex flex-col items-center justify-between md:flex-row">
						<div className="mb-4 text-sm text-gray-400 md:mb-0">
							© 2025 Sharkly. All rights reserved.
						</div>
						<div className="flex items-center space-x-6 text-sm">
							<Link to="/privacy" className="text-gray-400 transition-colors hover:text-white">
								Privacy Policy
							</Link>
							<Link to="/terms" className="text-gray-400 transition-colors hover:text-white">
								Terms of Service
							</Link>
						</div>
					</div>
				</div>
			</div>
		</footer>
	);
};

export default Footer;
