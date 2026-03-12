import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, Scale, AlertTriangle, CheckCircle, Shield } from 'lucide-react';

const LAST_UPDATED = 'March 11, 2026';

const TermsOfService: React.FC = () => {
	return (
		<div className="min-h-screen bg-gray-50 py-8 dark:bg-gray-900">
			<div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
				<div className="mb-8">
					<Link to="/" className="mb-4 inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Back to Home
					</Link>
					<div className="mb-4 flex items-center">
						<FileText className="mr-3 h-8 w-8 text-blue-600 dark:text-blue-400" />
						<h1 className="text-3xl font-bold text-gray-900 dark:text-white">Terms of Service</h1>
					</div>
					<p className="text-gray-600 dark:text-gray-400">Last updated: {LAST_UPDATED}</p>
				</div>

				<div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
					<div className="prose prose-lg max-w-none dark:prose-invert">
						<p className="mb-6 text-gray-700 dark:text-gray-300">
							These Terms of Service (&quot;Terms&quot;) govern your use of Sharkly (&quot;Service&quot;) operated by Sharkly
							(&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). By accessing or using our Service at app.sharkly.co or sharkly.co, you agree to be bound by these Terms.
						</p>

						<h2 className="mt-8 mb-4 flex items-center text-2xl font-semibold text-gray-900 dark:text-white">
							<CheckCircle className="mr-2 h-6 w-6 text-blue-600 dark:text-blue-400" />
							Acceptance of Terms
						</h2>
						<p className="mb-4 text-gray-700 dark:text-gray-300">
							By using our Service, you confirm that you have read, understood, and agree to these Terms and our Privacy Policy. If you do not agree, you must not use our Service.
						</p>

						<h2 className="mt-8 mb-4 flex items-center text-2xl font-semibold text-gray-900 dark:text-white">
							<Scale className="mr-2 h-6 w-6 text-blue-600 dark:text-blue-400" />
							Description of Service
						</h2>
						<p className="mb-4 text-gray-700 dark:text-gray-300">
							Sharkly is an AI-powered SEO assistant that helps you build and execute SEO strategy and content. The Service includes, without limitation:
						</p>
						<ul className="mb-4 list-disc space-y-2 pl-6 text-gray-700 dark:text-gray-300">
							<li>SEO strategy tools: targets, topic plans, keyword research, and cluster mapping</li>
							<li>Content generation: articles, meta titles and descriptions, product and collection copy (e.g., for ecommerce)</li>
							<li>Technical audits, crawl analysis, and on-page SEO checks</li>
							<li>Rankings and performance views (including via connected Google Search Console)</li>
							<li>Publishing integrations (e.g., Shopify) to update product/collection/blog content</li>
							<li>Credit-based usage for AI and certain features; subscription plans and overage as described in the app</li>
						</ul>
						<p className="mb-4 text-gray-700 dark:text-gray-300">
							SEO results (rankings, traffic, conversions) depend on many factors outside our control. We do not guarantee any specific SEO or business outcome from using the Service.
						</p>

						<h2 className="mt-8 mb-4 flex items-center text-2xl font-semibold text-gray-900 dark:text-white">
							<Shield className="mr-2 h-6 w-6 text-blue-600 dark:text-blue-400" />
							Accounts and Registration
						</h2>
						<p className="mb-4 text-gray-700 dark:text-gray-300">
							To use the Service you must create an account. You agree to provide accurate information, keep your credentials secure, and accept responsibility for all activity under your account. You must notify us promptly of any unauthorized use.
						</p>

						<h2 className="mt-8 mb-4 flex items-center text-2xl font-semibold text-gray-900 dark:text-white">
							<Scale className="mr-2 h-6 w-6 text-blue-600 dark:text-blue-400" />
							Billing and Subscription
						</h2>
						<p className="mb-4 text-gray-700 dark:text-gray-300">
							Paid plans and overage are billed through Stripe. By subscribing or adding a payment method, you agree to the applicable fees and billing cycle. Fees are generally non-refundable except as required by law or as we may agree in writing. We may change pricing with notice; continued use after changes constitutes acceptance. Credits (e.g., for AI or feature usage) are consumed per our then-current credit rules and do not carry over unless stated in the plan.
						</p>

						<h2 className="mt-8 mb-4 flex items-center text-2xl font-semibold text-gray-900 dark:text-white">
							<AlertTriangle className="mr-2 h-6 w-6 text-blue-600 dark:text-blue-400" />
							Acceptable Use
						</h2>
						<p className="mb-4 text-gray-700 dark:text-gray-300">
							You agree to use the Service only for lawful purposes. You must not:
						</p>
						<ul className="mb-4 list-disc space-y-2 pl-6 text-gray-700 dark:text-gray-300">
							<li>Use the Service for any illegal or unauthorized purpose or in violation of applicable laws</li>
							<li>Infringe intellectual property or other rights of others</li>
							<li>Attempt to gain unauthorized access to our or any third-party systems or data</li>
							<li>Interfere with or disrupt the Service or abuse APIs or integrations</li>
							<li>Upload malicious code, spam, or content that violates others&apos; rights</li>
							<li>Use the Service to send unsolicited communications or to scrape or abuse third-party services</li>
						</ul>

						<h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-900 dark:text-white">Data and Privacy</h2>
						<p className="mb-4 text-gray-700 dark:text-gray-300">
							Our collection and use of personal information is governed by our <Link to="/privacy" className="text-blue-600 underline dark:text-blue-400">Privacy Policy</Link>, which is incorporated into these Terms by reference.
						</p>

						<h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-900 dark:text-white">Third-Party Integrations</h2>
						<p className="mb-4 text-gray-700 dark:text-gray-300">
							The Service may integrate with third-party products (e.g., Google Search Console, Shopify). Your use of those integrations is subject to the third party&apos;s terms and policies. We are not responsible for third-party services or their data practices.
						</p>

						<h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-900 dark:text-white">Intellectual Property</h2>
						<p className="mb-4 text-gray-700 dark:text-gray-300">
							The Service and its original content, features, and functionality are owned by Sharkly and are protected by applicable intellectual property laws. You do not acquire any ownership by using the Service.
						</p>

						<h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-900 dark:text-white">User Content</h2>
						<p className="mb-4 text-gray-700 dark:text-gray-300">
							You retain ownership of content you submit. By submitting content, you grant us a worldwide, non-exclusive, royalty-free license to use, store, process, and display it solely to provide and improve the Service (including via AI providers as described in our Privacy Policy).
						</p>

						<h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-900 dark:text-white">Service Availability</h2>
						<p className="mb-4 text-gray-700 dark:text-gray-300">
							We strive for high availability but do not guarantee uninterrupted access. We may suspend or restrict access for maintenance, updates, or operational or security reasons.
						</p>

						<h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-900 dark:text-white">Limitation of Liability</h2>
						<p className="mb-4 text-gray-700 dark:text-gray-300">
							To the maximum extent permitted by law, Sharkly shall not be liable for any indirect, incidental, special, consequential, or punitive damages (including loss of profits, data, or use) arising out of or relating to your use of the Service. Our total liability shall not exceed the amount you paid us in the twelve (12) months preceding the claim.
						</p>

						<h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-900 dark:text-white">Disclaimer of Warranties</h2>
						<p className="mb-4 text-gray-700 dark:text-gray-300">
							The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, express or implied. We disclaim all warranties, including merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the Service will achieve any particular SEO or business result.
						</p>

						<h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-900 dark:text-white">Indemnification</h2>
						<p className="mb-4 text-gray-700 dark:text-gray-300">
							You agree to indemnify and hold harmless Sharkly and its affiliates from any claims, damages, losses, or expenses (including reasonable attorneys&apos; fees) arising out of your use of the Service or violation of these Terms.
						</p>

						<h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-900 dark:text-white">Termination</h2>
						<p className="mb-4 text-gray-700 dark:text-gray-300">
							We may terminate or suspend your account and access at any time, with or without cause or notice. Upon termination, your right to use the Service ceases. Provisions that by their nature should survive (e.g., intellectual property, limitation of liability, indemnification) will survive.
						</p>

						<h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-900 dark:text-white">Governing Law</h2>
						<p className="mb-4 text-gray-700 dark:text-gray-300">
							These Terms are governed by the laws of the United States and the State of Delaware, without regard to conflict of law principles. Any dispute shall be resolved in the courts of the State of Delaware (or as we may agree in writing).
						</p>

						<h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-900 dark:text-white">Changes to Terms</h2>
						<p className="mb-4 text-gray-700 dark:text-gray-300">
							We may modify these Terms at any time. We will post the updated Terms on this page and may notify you of material changes. Your continued use after changes constitutes acceptance. If you do not agree, you must stop using the Service.
						</p>

						<h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-900 dark:text-white">Contact</h2>
						<p className="mb-4 text-gray-700 dark:text-gray-300">
							Questions about these Terms:
						</p>
						<div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
							<p className="text-gray-700 dark:text-gray-300">
								<strong>Email:</strong> hello@sharkly.co
								<br />
								<strong>Website:</strong> https://sharkly.co
							</p>
						</div>

						<div className="mt-8 border-t border-gray-200 pt-6 dark:border-gray-600">
							<p className="text-sm text-gray-500 dark:text-gray-400">
								These Terms are effective as of {LAST_UPDATED}. The current version is always on this page.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default TermsOfService;
