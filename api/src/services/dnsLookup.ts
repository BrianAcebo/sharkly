/**
 * DNS Lookup Service
 * Resolves A, MX, NS records for domain intelligence
 */

import * as dns from 'node:dns';
import { promisify } from 'node:util';

const resolve4 = promisify(dns.resolve4);
const resolveMx = promisify(dns.resolveMx);
const resolveNs = promisify(dns.resolveNs);

export interface DnsLookupResult {
	records: {
		a: string[];
		mx: Array<{ exchange: string; priority: number }>;
		ns: string[];
	};
	summary: {
		hasMailServer: boolean;
		mailProviders: string[];
	};
}

export interface DnsLookupResponse {
	data?: DnsLookupResult;
	error?: string;
}

export async function lookupDns(domain: string): Promise<DnsLookupResponse> {
	try {
		const [aRecords, mxRecords, nsRecords] = await Promise.all([
			resolve4(domain).catch(() => [] as string[]),
			resolveMx(domain).catch(() => [] as dns.MxRecord[]),
			resolveNs(domain).catch(() => [] as string[])
		]);

		const mx = Array.isArray(mxRecords)
			? (mxRecords as dns.MxRecord[]).map((r) => ({ exchange: r.exchange, priority: r.priority }))
			: [];
		const ns = Array.isArray(nsRecords) ? (nsRecords as string[]) : [];
		const a = Array.isArray(aRecords) ? (aRecords as string[]) : [];

		const mailProviders = [...new Set(mx.map((m) => m.exchange.replace(/\.$/, '').split('.').slice(-2).join('.')))];

		return {
			data: {
				records: { a, mx, ns },
				summary: {
					hasMailServer: mx.length > 0,
					mailProviders
				}
			}
		};
	} catch (err) {
		return {
			error: err instanceof Error ? err.message : 'DNS lookup failed'
		};
	}
}

export function isServiceAvailable(): boolean {
	return true;
}
