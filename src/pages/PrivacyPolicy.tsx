import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Eye, Database, Users, Globe } from 'lucide-react';

const LAST_UPDATED = 'March 11, 2026';

const PrivacyPolicy: React.FC = () => {
	return (
		<div className="min-h-screen bg-gray-50 py-8 dark:bg-gray-900">
			<div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
				<div className="mb-8">
					<Link to="/" className="mb-4 inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Back to Home
					</Link>
					<div className="mb-4 flex items-center">
						<Shield className="mr-3 h-8 w-8 text-blue-600 dark:text-blue-400" />
						<h1 className="text-3xl font-bold text-gray-900 dark:text-white">Privacy Policy</h1>
					</div>
					<p className="text-gray-600 dark:text-gray-400">Last updated: {LAST_UPDATED}</p>
				</div>

				<div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
					<div className="prose prose-lg max-w-none dark:prose-invert">
						<p className="mb-6 text-gray-700 dark:text-gray-300">
							Sharkly (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy
							Policy explains how we collect, use, disclose, and safeguard your information when you
							use our AI-powered SEO assistant and related services at app.sharkly.co and sharkly.co.
						</p>

						<h2 className="mt-8 mb-4 flex items-center text-2xl font-semibold text-gray-900 dark:text-white">
							<Lock className="mr-2 h-6 w-6 text-blue-600 dark:text-blue-400" />
							Information We Collect
						</h2>

						<h3 className="mt-6 mb-3 text-xl font-medium text-gray-800 dark:text-gray-200">Account and profile</h3>
						<p className="mb-4 text-gray-700 dark:text-gray-300">
							When you create an account or use our services, we collect:
						</p>
						<ul className="mb-4 list-disc space-y-2 pl-6 text-gray-700 dark:text-gray-300">
							<li>Name, email address, and contact information</li>
							<li>Organization and site details (e.g., website URLs you add)</li>
							<li>Account credentials and profile/settings (e.g., brand voice, notifications)</li>
						</ul>

						<h3 className="mt-6 mb-3 text-xl font-medium text-gray-800 dark:text-gray-200">SEO and content data</h3>
						<p className="mb-4 text-gray-700 dark:text-gray-300">
							To provide our SEO assistant, we process data you store or generate in Sharkly:
						</p>
						<ul className="mb-4 list-disc space-y-2 pl-6 text-gray-700 dark:text-gray-300">
							<li>SEO strategy, targets, topics, and keyword research</li>
							<li>Generated or edited content (articles, meta titles/descriptions, product/collection copy)</li>
							<li>Ranking and performance data (including from connected Google Search Console)</li>
							<li>Crawl and audit results for your sites</li>
						</ul>

						<h3 className="mt-6 mb-3 text-xl font-medium text-gray-800 dark:text-gray-200">Usage and technical data</h3>
						<p className="mb-4 text-gray-700 dark:text-gray-300">
							We automatically collect information necessary to operate and improve the service:
						</p>
						<ul className="mb-4 list-disc space-y-2 pl-6 text-gray-700 dark:text-gray-300">
							<li>Log data, device and browser information, IP address</li>
							<li>Usage patterns and feature interactions</li>
							<li>Performance and error data</li>
						</ul>

						<h2 className="mt-8 mb-4 flex items-center text-2xl font-semibold text-gray-900 dark:text-white">
							<Eye className="mr-2 h-6 w-6 text-blue-600 dark:text-blue-400" />
							How We Use Your Information
						</h2>
						<p className="mb-4 text-gray-700 dark:text-gray-300">We use the information we collect to:</p>
						<ul className="mb-4 list-disc space-y-2 pl-6 text-gray-700 dark:text-gray-300">
							<li>Provide, maintain, and improve our SEO and content services</li>
							<li>Process payments and manage your subscription and credits</li>
							<li>Sync and display data from integrations (e.g., Google Search Console, Shopify) when you connect them</li>
							<li>Send service-related notifications and support</li>
							<li>Analyze usage to improve the product and security</li>
							<li>Comply with legal obligations</li>
						</ul>

						<h2 className="mt-8 mb-4 flex items-center text-2xl font-semibold text-gray-900 dark:text-white">
							<Database className="mr-2 h-6 w-6 text-blue-600 dark:text-blue-400" />
							Third-Party Services and Data
						</h2>
						<p className="mb-4 text-gray-700 dark:text-gray-300">
							We use trusted service providers to run Sharkly. Data may be processed or stored by:
						</p>
						<ul className="mb-4 list-disc space-y-2 pl-6 text-gray-700 dark:text-gray-300">
							<li><strong>Supabase</strong> — Authentication, database, and storage (see Supabase privacy policy)</li>
							<li><strong>Stripe</strong> — Payment and subscription billing (we do not store full card numbers; see Stripe privacy policy)</li>
							<li><strong>Google</strong> — When you connect Google Search Console, we use OAuth to access GSC data on your behalf; we do not sell or use it for advertising</li>
							<li><strong>Shopify</strong> — When you connect a store, we store only the connection (domain and access token) to publish content; we do not access or store your store&apos;s customer PII</li>
							<li><strong>AI/LLM providers</strong> — Content generation may involve sending prompts and your content to third-party AI services under our data processing agreements</li>
						</ul>
						<p className="mb-4 text-gray-700 dark:text-gray-300">
							If you use the Sharkly app from the Shopify App Store, Shopify may collect data as described in their policies; our use of Shopify data is limited to providing the SEO and publishing features you request.
						</p>

						<h2 className="mt-8 mb-4 flex items-center text-2xl font-semibold text-gray-900 dark:text-white">
							<Database className="mr-2 h-6 w-6 text-blue-600 dark:text-blue-400" />
							Data Storage and Security
						</h2>
						<p className="mb-4 text-gray-700 dark:text-gray-300">
							We implement appropriate technical and organizational measures to protect your data, including encryption in transit and at rest, access controls, and secure infrastructure. We do not sell your personal information.
						</p>

						<h2 className="mt-8 mb-4 flex items-center text-2xl font-semibold text-gray-900 dark:text-white">
							<Users className="mr-2 h-6 w-6 text-blue-600 dark:text-blue-400" />
							Data Sharing and Disclosure
						</h2>
						<p className="mb-4 text-gray-700 dark:text-gray-300">
							We do not sell or rent your personal information. We may share information only:
						</p>
						<ul className="mb-4 list-disc space-y-2 pl-6 text-gray-700 dark:text-gray-300">
							<li>With your consent (e.g., when you connect an integration)</li>
							<li>With service providers who assist in operating our service (under strict obligations)</li>
							<li>To comply with law or protect rights and safety</li>
							<li>In connection with a merger, sale, or transfer of assets</li>
						</ul>

						<h2 className="mt-8 mb-4 flex items-center text-2xl font-semibold text-gray-900 dark:text-white">
							<Globe className="mr-2 h-6 w-6 text-blue-600 dark:text-blue-400" />
							Your Rights and Retention
						</h2>
						<p className="mb-4 text-gray-700 dark:text-gray-300">
							We retain your information as long as needed to provide the service and comply with law. You have the right to:
						</p>
						<ul className="mb-4 list-disc space-y-2 pl-6 text-gray-700 dark:text-gray-300">
							<li>Access and correct your personal information</li>
							<li>Request deletion of your personal information</li>
							<li>Export your data in a portable format</li>
							<li>Opt out of marketing communications</li>
							<li>Lodge a complaint with a supervisory authority (e.g., in the EU/UK under GDPR)</li>
						</ul>
						<p className="mb-4 text-gray-700 dark:text-gray-300">
							If you are in the European Economic Area or UK, our legal basis for processing includes contract performance, consent where required, and legitimate interests. For California residents, we do not sell personal information; you may have additional rights under the CCPA.
						</p>

						<h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-900 dark:text-white">Cookies and similar technologies</h2>
						<p className="mb-4 text-gray-700 dark:text-gray-300">
							We use cookies and similar technologies for authentication, session management, and security. Our app (app.sharkly.co) requires these to function. We do not use third-party advertising cookies.
						</p>

						<h2 className="mt-8 mb-4 text-2xl font-semibold text-gray-900 dark:text-white">Contact</h2>
						<p className="mb-4 text-gray-700 dark:text-gray-300">
							For privacy-related requests or questions:
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
								This Privacy Policy is effective as of {LAST_UPDATED}. We may update it from time to time; the current version will always be on this page. Continued use of the service after changes constitutes acceptance.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default PrivacyPolicy;
