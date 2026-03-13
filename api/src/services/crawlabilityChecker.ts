/**
 * Crawlability Checker
 * Pre-crawl validation to ensure site is crawlable
 * Returns helpful messaging if site has issues
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';
import robotsParser from 'robots-parser';

export interface CrawlabilityIssue {
	type: 'critical' | 'warning';
	title: string;
	message: string;
	solution: string;
}

export interface CrawlabilityResult {
	isCrawlable: boolean;
	issues: CrawlabilityIssue[];
	warnings: string[];
	siteReachable: boolean;
	dnsResolvable: boolean;
	sslValid: boolean;
	statusCode: number;
	robotsTxtExists: boolean;
	botAllowed: boolean;
	responseTime: number;
}

export class CrawlabilityChecker {
	/**
	 * Check if a site is crawlable before attempting a full crawl
	 */
	async checkCrawlability(siteUrl: string): Promise<CrawlabilityResult> {
		const result: CrawlabilityResult = {
			isCrawlable: true,
			issues: [],
			warnings: [],
			siteReachable: false,
			dnsResolvable: false,
			sslValid: false,
			statusCode: 0,
			robotsTxtExists: false,
			botAllowed: false,
			responseTime: 0
		};

		try {
			// Parse URL
			const url = new URL(siteUrl);

			// 1. Check DNS Resolution
			try {
				const dns = await import('dns').then((m) => m.promises);
				await dns.resolve(url.hostname);
				result.dnsResolvable = true;
			} catch (e) {
				result.issues.push({
					type: 'critical',
					title: 'DNS Not Resolving',
					message: `Cannot resolve domain: ${url.hostname}`,
					solution: 'Verify the domain name is correct and the DNS is properly configured'
				});
				result.isCrawlable = false;
				return result;
			}

			// 2. Check Site Reachability
			const startTime = Date.now();
			try {
				const response = await axios.get(siteUrl, {
					timeout: 30000, // Increased from 10s to 30s for slow sites
					maxRedirects: 5,
					headers: {
						'User-Agent': 'Mozilla/5.0 (compatible; SharklyBot/1.0; +https://sharkly.co)'
					},
					validateStatus: () => true
				});

				result.responseTime = Date.now() - startTime;
				result.statusCode = response.status;
				result.siteReachable = response.status < 400;
				result.sslValid = url.protocol === 'https'; // If we got here and it's HTTPS, cert is valid

				// Check status codes
				if (response.status === 401 || response.status === 403) {
					result.issues.push({
						type: 'critical',
						title: 'Site Requires Authentication',
						message: `Site returned ${response.status} (${response.status === 401 ? 'Unauthorized' : 'Forbidden'})`,
						solution:
							'Make sure the site is publicly accessible without login. Remove authentication requirements or create a public staging version'
					});
					result.isCrawlable = false;
				}

				if (response.status >= 500) {
					result.issues.push({
						type: 'critical',
						title: 'Server Error',
						message: `Site returned ${response.status} Server Error`,
						solution: 'The site is experiencing server issues. Wait for the server to be fixed and try again'
					});
					result.isCrawlable = false;
					return result;
				}

				if (response.status >= 400) {
					result.issues.push({
						type: 'critical',
						title: 'Site Not Found',
						message: `Site URL returned ${response.status}`,
						solution: 'Verify the URL is correct. The page may have been moved or deleted'
					});
					result.isCrawlable = false;
					return result;
				}

				// Check response time
				if (result.responseTime > 30000) {
					result.warnings.push(
						`Site is very slow (${result.responseTime}ms response time). Crawl may take longer than expected`
					);
				}

				// 3. Check robots.txt
				await this.checkRobotsTxt(url, result);

				// 4. Check for cloudflare/firewall blocking
				if (this.hasWAFIndicators(response.data)) {
					result.warnings.push(
						'Site appears to be protected by a Web Application Firewall (WAF). Crawling may be blocked or rate-limited'
					);
				}

				// 5. Check for common "not crawlable" meta tags
				if (this.hasNoCrawlMetaTags(response.data)) {
					result.issues.push({
						type: 'warning',
						title: 'Site Has Anti-Crawl Meta Tags',
						message: 'Page contains meta tags that request search engines not to crawl or index',
						solution:
							'Remove noindex/nofollow meta tags from the robots meta tag. Allow search engines to crawl your site'
					});
				}

				// 6. Check for redirect loops
				if (response.request.path !== url.pathname) {
					result.warnings.push(
						'Site may have redirects. Make sure there are no redirect loops preventing proper crawling'
					);
				}
			} catch (error) {
				const axiosError = error as any;

				// Categorize different error types
				if (axiosError.code === 'ENOTFOUND' || axiosError.code === 'ECONNREFUSED') {
					result.issues.push({
						type: 'critical',
						title: 'Cannot Connect to Site',
						message: `Connection refused: ${axiosError.message}`,
						solution:
							'Verify the site URL is correct and the site is online. Check if the domain is registered and the server is running'
					});
			} else if (axiosError.code === 'ECONNABORTED' || axiosError.message.includes('timeout')) {
				result.issues.push({
					type: 'critical',
					title: 'Connection Timeout',
					message: `Site took too long to respond (30+ seconds). This indicates the server is either offline, experiencing heavy load, or has network connectivity issues.`,
					solution:
						'Wait a few minutes for the server to recover, then try the audit again. If the problem persists, contact your hosting provider to investigate the server performance'
				});
				} else if (axiosError.code === 'ERR_TLS_CERT_ALTNAME_INVALID') {
					result.issues.push({
						type: 'critical',
						title: 'SSL Certificate Error',
						message: 'SSL certificate mismatch for domain',
						solution: 'Fix the SSL certificate configuration for your domain'
					});
					result.sslValid = false;
				} else {
					result.issues.push({
						type: 'critical',
						title: 'Cannot Reach Site',
						message: axiosError.message,
						solution: 'Verify the site is online and accessible from the internet'
					});
				}

				result.isCrawlable = false;
				return result;
			}
		} catch (error) {
			result.issues.push({
				type: 'critical',
				title: 'Invalid URL',
				message: `Invalid site URL: ${siteUrl}`,
				solution: 'Provide a valid URL starting with http:// or https://'
			});
			result.isCrawlable = false;
			return result;
		}

		return result;
	}

	/**
	 * Check robots.txt for Googlebot/crawlability permissions
	 */
	private async checkRobotsTxt(url: URL, result: CrawlabilityResult): Promise<void> {
		try {
			const robotsUrl = `${url.protocol}//${url.host}/robots.txt`;
			const response = await axios.get(robotsUrl, {
				timeout: 10000, // Increased from 5s to 10s
				validateStatus: () => true
			});

			if (response.status === 200) {
				result.robotsTxtExists = true;
				const robotsContent = typeof response.data === 'string'
					? response.data
					: response.data?.toString?.() ?? '';
				const parser = (robotsParser as unknown as (url: string, txt: string) => { isAllowed: (url: string, ua?: string) => boolean | undefined })(robotsUrl, robotsContent);

				// Check Googlebot first, then fall back to wildcard (*).
				// isAllowed() returns true, false, or null (null = no rule matched = allowed).
				// Only treat explicit false as blocked.
				const isGooglebotAllowed = parser.isAllowed('/', 'Googlebot');
				const isWildcardAllowed = parser.isAllowed('/', '*');
				const isAllowed = isGooglebotAllowed !== false && isWildcardAllowed !== false;

				result.botAllowed = isAllowed;

				if (!isAllowed) {
					result.issues.push({
						type: 'warning',
						title: 'Blocked by robots.txt',
						message: 'robots.txt is blocking search engine crawlers from accessing the site',
						solution: 'Update robots.txt to allow search engines. Add "User-agent: *" with "Allow: /" or remove blocking Disallow rules'
					});
				}
			} else if (response.status === 404) {
				// No robots.txt — means all bots are allowed
				result.botAllowed = true;
			}
		} catch (error) {
			// robots.txt check failed, but this is not critical
			// Assume bot is allowed if we can't check
			result.botAllowed = true;
		}
	}

	/**
	 * Detect WAF/firewall that blocks crawlers
	 */
	private hasWAFIndicators(html: string): boolean {
		const wafIndicators = [
			'cloudflare',
			'checking your browser',
			'challenge',
			'please wait while we',
			'cdn-cgi',
			'sucuri',
			'wordfence'
		];
		const lowerHtml = html.toLowerCase();
		return wafIndicators.some((indicator) => lowerHtml.includes(indicator));
	}

	/**
	 * Check for meta tags that prevent crawling
	 */
	private hasNoCrawlMetaTags(html: string): boolean {
		const $ = cheerio.load(html);
		const robotsMeta = $('meta[name="robots"]').attr('content') || '';
		const googlebot = $('meta[name="googlebot"]').attr('content') || '';

		return (
			robotsMeta.includes('noindex') ||
			robotsMeta.includes('nofollow') ||
			robotsMeta.includes('noarchive') ||
			googlebot.includes('noindex')
		);
	}
}

export const crawlabilityChecker = new CrawlabilityChecker();
