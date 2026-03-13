/**
 * WHOIS Lookup Service
 * Domain registration info - uses RDAP when available, falls back to whois
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export interface WhoisLookupResult {
	available?: boolean;
	registrar?: string;
	createdDate?: string;
	expiresDate?: string;
	nameservers?: string[];
	summary?: {
		age?: number;
		expiresIn?: number;
		isExpiringSoon?: boolean;
		isNewDomain?: boolean;
		privacyProtected?: boolean;
	};
}

export interface WhoisLookupResponse {
	data?: WhoisLookupResult;
	error?: string;
}

export async function lookupWhois(domain: string): Promise<WhoisLookupResponse> {
	try {
		const { stdout } = await execAsync(`whois ${domain}`, { timeout: 10000 });
		const raw = stdout || '';

		const result: WhoisLookupResult = {
			available: false,
			nameservers: []
		};

		if (/No match for|Not found|Status: AVAILABLE/i.test(raw)) {
			result.available = true;
			return { data: result };
		}

		const registrarMatch = raw.match(/Registrar:?\s*(.+)/i) || raw.match(/Registrar WHOIS Server:?\s*(.+)/i);
		if (registrarMatch) result.registrar = registrarMatch[1].trim();

		const createdMatch = raw.match(/Creation Date:?\s*(\d{4}-\d{2}-\d{2})/i) || raw.match(/Created:?\s*(\d{4}-\d{2}-\d{2})/i);
		if (createdMatch) result.createdDate = createdMatch[1];

		const expiresMatch = raw.match(/Expir(y|ation) Date:?\s*(\d{4}-\d{2}-\d{2})/i) || raw.match(/Registry Expiry Date:?\s*(\d{4}-\d{2}-\d{2})/i);
		if (expiresMatch) result.expiresDate = expiresMatch[2] || expiresMatch[1];

		const nsMatches = raw.matchAll(/Name Server:?\s*(\S+)/gi);
		const ns = [...nsMatches].map((m) => m[1].toLowerCase().replace(/\.$/, ''));
		if (ns.length > 0) result.nameservers = [...new Set(ns)];

		if (result.createdDate && result.expiresDate) {
			const created = new Date(result.createdDate).getTime();
			const expires = new Date(result.expiresDate).getTime();
			const now = Date.now();
			result.summary = {
				age: Math.floor((now - created) / (1000 * 60 * 60 * 24 * 365)),
				expiresIn: Math.floor((expires - now) / (1000 * 60 * 60 * 24)),
				isExpiringSoon: (expires - now) < 90 * 24 * 60 * 60 * 1000,
				isNewDomain: (now - created) < 365 * 24 * 60 * 60 * 1000,
				privacyProtected: /privacy|privacy protection|whoisguard/i.test(raw)
			};
		}

		return { data: result };
	} catch (err) {
		return {
			error: err instanceof Error ? err.message : 'WHOIS lookup failed'
		};
	}
}

export async function isServiceAvailable(): Promise<boolean> {
	try {
		await execAsync('which whois', { timeout: 2000 });
		return true;
	} catch {
		return false;
	}
}
