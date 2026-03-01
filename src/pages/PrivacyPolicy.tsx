import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Eye, Database, Users, Globe } from 'lucide-react';

const PrivacyPolicy: React.FC = () => {
	return (
		<div className="min-h-screen bg-gray-50 py-8">
			<div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
				{/* Header */}
				<div className="mb-8">
					<Link to="/" className="mb-4 inline-flex items-center text-blue-600 hover:text-blue-800">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Back to Home
					</Link>
					<div className="mb-4 flex items-center">
						<Shield className="mr-3 h-8 w-8 text-blue-600" />
						<h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
					</div>
					<p className="text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>
				</div>

				{/* Content */}
				<div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
					<div className="prose prose-lg max-w-none">
						<p className="mb-6 text-gray-700">
							Sharkly ("we," "our," or "us") is committed to protecting your privacy. This Privacy
							Policy explains how we collect, use, disclose, and safeguard your information when you
							use our SEO assistant.
						</p>

						<h2 className="mt-8 mb-4 flex items-center text-2xl font-semibold text-gray-900">
							<Lock className="mr-2 h-6 w-6 text-blue-600" />
							Information We Collect
						</h2>

						<h3 className="mt-6 mb-3 text-xl font-medium text-gray-800">Personal Information</h3>
						<p className="mb-4 text-gray-700">
							We collect information you provide directly to us, such as when you create an account,
							use our services, or contact us for support:
						</p>
						<ul className="mb-4 list-disc space-y-2 pl-6 text-gray-700">
							<li>Name, email address, and contact information</li>
							<li>Company and organization details</li>
							<li>Account credentials and profile information</li>
							<li>Communication preferences and settings</li>
						</ul>

						<h3 className="mt-6 mb-3 text-xl font-medium text-gray-800">Business Data</h3>
						<p className="mb-4 text-gray-700">
							As a SEO assistant, we process business-related information you store in our system:
						</p>
						<ul className="mb-4 list-disc space-y-2 pl-6 text-gray-700">
							<li>SEO strategy and content</li>
							<li>Ranking and performance</li>
							<li>Competitor analysis</li>
							<li>Keyword research</li>
						</ul>

						<h3 className="mt-6 mb-3 text-xl font-medium text-gray-800">Usage Information</h3>
						<p className="mb-4 text-gray-700">
							We automatically collect certain information about your use of our services:
						</p>
						<ul className="mb-4 list-disc space-y-2 pl-6 text-gray-700">
							<li>Log data and device information</li>
							<li>Usage patterns and feature interactions</li>
							<li>Performance and error data</li>
							<li>IP address and browser information</li>
						</ul>

						<h2 className="mt-8 mb-4 flex items-center text-2xl font-semibold text-gray-900">
							<Eye className="mr-2 h-6 w-6 text-blue-600" />
							How We Use Your Information
						</h2>
						<p className="mb-4 text-gray-700">We use the information we collect to:</p>
						<ul className="mb-4 list-disc space-y-2 pl-6 text-gray-700">
							<li>Provide, maintain, and improve our CRM services</li>
							<li>Process transactions and manage your account</li>
							<li>Send notifications and important updates</li>
							<li>Respond to your requests and provide support</li>
							<li>Analyze usage patterns to enhance user experience</li>
							<li>Ensure security and prevent fraud</li>
							<li>Comply with legal obligations</li>
						</ul>

						<h2 className="mt-8 mb-4 flex items-center text-2xl font-semibold text-gray-900">
							<Database className="mr-2 h-6 w-6 text-blue-600" />
							Data Storage and Security
						</h2>
						<p className="mb-4 text-gray-700">
							We implement appropriate technical and organizational measures to protect your data:
						</p>
						<ul className="mb-4 list-disc space-y-2 pl-6 text-gray-700">
							<li>Data encryption in transit and at rest</li>
							<li>Regular security assessments and updates</li>
							<li>Access controls and authentication measures</li>
							<li>Secure data centers and infrastructure</li>
							<li>Regular backups and disaster recovery procedures</li>
						</ul>

						<h2 className="mt-8 mb-4 flex items-center text-2xl font-semibold text-gray-900">
							<Users className="mr-2 h-6 w-6 text-blue-600" />
							Data Sharing and Disclosure
						</h2>
						<p className="mb-4 text-gray-700">
							We do not sell, trade, or rent your personal information to third parties. We may
							share your information only in the following circumstances:
						</p>
						<ul className="mb-4 list-disc space-y-2 pl-6 text-gray-700">
							<li>With your explicit consent</li>
							<li>To comply with legal requirements</li>
							<li>To protect our rights and safety</li>
							<li>With trusted service providers who assist in operating our service</li>
							<li>In connection with a business transfer or merger</li>
						</ul>

						<h2 className="mt-8 mb-4 flex items-center text-2xl font-semibold text-gray-900">
							<Globe className="mr-2 h-6 w-6 text-blue-600" />
							Data Retention and Your Rights
						</h2>
						<p className="mb-4 text-gray-700">
							We retain your information for as long as necessary to provide our services and comply
							with legal obligations. You have the right to:
						</p>
						<ul className="mb-4 list-disc space-y-2 pl-6 text-gray-700">
							<li>Access and review your personal information</li>
							<li>Correct inaccurate or incomplete data</li>
							<li>Request deletion of your personal information</li>
							<li>Export your data in a portable format</li>
							<li>Opt-out of certain communications</li>
							<li>Lodge a complaint with supervisory authorities</li>
						</ul>

						<h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-900">Contact Us</h2>
						<p className="mb-4 text-gray-700">
							If you have any questions about this Privacy Policy or our data practices, please
							contact us:
						</p>
						<div className="rounded-lg bg-gray-50 p-4">
							<p className="text-gray-700">
								<strong>Email:</strong> privacy@paperboatcrm.com
								<br />
								<strong>Address:</strong> [Your Company Address]
								<br />
								<strong>Phone:</strong> [Your Phone Number]
							</p>
						</div>

						<div className="mt-8 border-t border-gray-200 pt-6">
							<p className="text-sm text-gray-500">
								This Privacy Policy is effective as of the date listed above and will remain in
								effect except with respect to any changes in its provisions in the future, which
								will be in effect immediately after being posted on this page.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default PrivacyPolicy;
