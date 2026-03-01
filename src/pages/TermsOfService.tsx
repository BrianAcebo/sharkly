import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, Scale, AlertTriangle, CheckCircle, Shield } from 'lucide-react';

const TermsOfService: React.FC = () => {
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
						<FileText className="mr-3 h-8 w-8 text-blue-600" />
						<h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
					</div>
					<p className="text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>
				</div>

				{/* Content */}
				<div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
					<div className="prose prose-lg max-w-none">
						<p className="mb-6 text-gray-700">
							These Terms of Service ("Terms") govern your use of Sharkly ("Service") operated by
							Sharkly ("we," "our," or "us"). By accessing or using our Service, you agree to be
							bound by these Terms.
						</p>

						<h2 className="mt-8 mb-4 flex items-center text-2xl font-semibold text-gray-900">
							<CheckCircle className="mr-2 h-6 w-6 text-blue-600" />
							Acceptance of Terms
						</h2>
						<p className="mb-4 text-gray-700">
							By using our Service, you confirm that you have read, understood, and agree to be
							bound by these Terms. If you do not agree to these Terms, you must not use our
							Service.
						</p>

						<h2 className="mt-8 mb-4 flex items-center text-2xl font-semibold text-gray-900">
							<Scale className="mr-2 h-6 w-6 text-blue-600" />
							Description of Service
						</h2>
						<p className="mb-4 text-gray-700">
							Sharkly is a customer relationship management platform that provides:
						</p>
						<ul className="mb-4 list-disc space-y-2 pl-6 text-gray-700">
							<li>Lead and customer management tools</li>
							<li>Task and project tracking</li>
							<li>Communication and notification systems</li>
							<li>Data analytics and reporting</li>
							<li>Team collaboration features</li>
							<li>Integration capabilities with third-party services</li>
						</ul>

						<h2 className="mt-8 mb-4 flex items-center text-2xl font-semibold text-gray-900">
							<Shield className="mr-2 h-6 w-6 text-blue-600" />
							User Accounts and Registration
						</h2>
						<p className="mb-4 text-gray-700">
							To access certain features of our Service, you must create an account. You agree to:
						</p>
						<ul className="mb-4 list-disc space-y-2 pl-6 text-gray-700">
							<li>Provide accurate, current, and complete information</li>
							<li>Maintain and update your account information</li>
							<li>Keep your account credentials secure and confidential</li>
							<li>Accept responsibility for all activities under your account</li>
							<li>Notify us immediately of any unauthorized use</li>
						</ul>

						<h2 className="mt-8 mb-4 flex items-center text-2xl font-semibold text-gray-900">
							<AlertTriangle className="mr-2 h-6 w-6 text-blue-600" />
							Acceptable Use
						</h2>
						<p className="mb-4 text-gray-700">
							You agree to use our Service only for lawful purposes and in accordance with these
							Terms. You must not:
						</p>
						<ul className="mb-4 list-disc space-y-2 pl-6 text-gray-700">
							<li>Use the Service for any illegal or unauthorized purpose</li>
							<li>Violate any applicable laws or regulations</li>
							<li>Infringe on intellectual property rights</li>
							<li>Attempt to gain unauthorized access to our systems</li>
							<li>Interfere with or disrupt the Service</li>
							<li>Upload malicious code or content</li>
							<li>Use the Service to send spam or unsolicited communications</li>
						</ul>

						<h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-900">Data and Privacy</h2>
						<p className="mb-4 text-gray-700">
							Your privacy is important to us. Our collection and use of personal information is
							governed by our Privacy Policy, which is incorporated into these Terms by reference.
						</p>

						<h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-900">
							Intellectual Property
						</h2>
						<p className="mb-4 text-gray-700">
							The Service and its original content, features, and functionality are owned by Sharkly
							and are protected by international copyright, trademark, patent, trade secret, and
							other intellectual property laws.
						</p>

						<h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-900">User Content</h2>
						<p className="mb-4 text-gray-700">
							You retain ownership of any content you submit to our Service. By submitting content,
							you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce,
							modify, and distribute your content solely for the purpose of providing our Service.
						</p>

						<h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-900">Service Availability</h2>
						<p className="mb-4 text-gray-700">
							We strive to maintain high availability of our Service, but we do not guarantee
							uninterrupted access. We may temporarily suspend or restrict access to the Service for
							maintenance, updates, or other operational reasons.
						</p>

						<h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-900">
							Limitation of Liability
						</h2>
						<p className="mb-4 text-gray-700">
							To the maximum extent permitted by law, Sharkly shall not be liable for any indirect,
							incidental, special, consequential, or punitive damages, including but not limited to
							loss of profits, data, or use, arising out of or relating to your use of the Service.
						</p>

						<h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-900">
							Disclaimer of Warranties
						</h2>
						<p className="mb-4 text-gray-700">
							The Service is provided "as is" and "as available" without any warranties of any kind,
							either express or implied. We disclaim all warranties, including but not limited to
							implied warranties of merchantability, fitness for a particular purpose, and
							non-infringement.
						</p>

						<h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-900">Indemnification</h2>
						<p className="mb-4 text-gray-700">
							You agree to indemnify and hold harmless Sharkly from any claims, damages, losses, or
							expenses arising out of or relating to your use of the Service or violation of these
							Terms.
						</p>

						<h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-900">Termination</h2>
						<p className="mb-4 text-gray-700">
							We may terminate or suspend your account and access to the Service at any time, with
							or without cause, with or without notice. Upon termination, your right to use the
							Service will cease immediately.
						</p>

						<h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-900">Governing Law</h2>
						<p className="mb-4 text-gray-700">
							These Terms shall be governed by and construed in accordance with the laws of [Your
							Jurisdiction], without regard to its conflict of law provisions.
						</p>

						<h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-900">Changes to Terms</h2>
						<p className="mb-4 text-gray-700">
							We reserve the right to modify these Terms at any time. We will notify users of any
							material changes by posting the new Terms on this page. Your continued use of the
							Service after such modifications constitutes acceptance of the updated Terms.
						</p>

						<h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-900">Contact Information</h2>
						<p className="mb-4 text-gray-700">
							If you have any questions about these Terms of Service, please contact us:
						</p>
						<div className="rounded-lg bg-gray-50 p-4">
							<p className="text-gray-700">
								<strong>Email:</strong> legal@paperboatcrm.com
								<br />
								<strong>Address:</strong> [Your Company Address]
								<br />
								<strong>Phone:</strong> [Your Phone Number]
							</p>
						</div>

						<div className="mt-8 border-t border-gray-200 pt-6">
							<p className="text-sm text-gray-500">
								These Terms of Service are effective as of the date listed above and will remain in
								effect except with respect to any changes in their provisions in the future, which
								will be in effect immediately after being posted on this page.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default TermsOfService;
