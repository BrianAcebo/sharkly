/**
 * Domain Intelligence Controller
 * Handles DNS lookup and WHOIS/RDAP queries
 */

import type { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';
import { spendCreditsForAction } from '../utils/credits.js';
import * as dnsLookup from '../services/dnsLookup.js';
import * as whoisLookup from '../services/whoisLookup.js';

const DNS_CREDIT_COST = 1;
const WHOIS_CREDIT_COST = 1;

/**
 * DNS Lookup handler
 */
export async function dnsLookupHandler(req: Request, res: Response) {
  console.log('[Domain Intel] DNS lookup handler called');
  console.log('[Domain Intel] Request body:', JSON.stringify(req.body));
  
  try {
    const { domain, domainId } = req.body;
    const organizationId = req.organizationId;
    const userId = req.userId;

    console.log('[Domain Intel] Parsed params:', { domain, domainId, organizationId, userId });

    if (!domain) {
      console.log('[Domain Intel] Error: Domain is required');
      return res.status(400).json({ error: 'Domain is required' });
    }

    if (!organizationId) {
      console.log('[Domain Intel] Error: Organization not found');
      return res.status(401).json({ error: 'Organization not found' });
    }

    console.log(`[Domain Intel] DNS lookup request: ${domain}`);

    // Spend credits
    const spendResult = await spendCreditsForAction({
      orgId: organizationId,
      creditCost: DNS_CREDIT_COST,
      category: 'dns_lookup',
      description: `DNS lookup: ${domain}`,
    });

    if (!spendResult.success) {
      console.log('[Domain Intel] Insufficient credits');
      return res.status(402).json({ 
        error: 'Insufficient credits',
        creditsRequired: DNS_CREDIT_COST,
      });
    }

    console.log('[Domain Intel] Credits spent, performing DNS lookup...');

    // Perform lookup
    const result = await dnsLookup.lookupDns(domain);

    console.log('[Domain Intel] DNS lookup result:', result.error ? `Error: ${result.error}` : 'Success');

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    // Save to action_results
    try {
      await supabase.from('action_results').insert({
        organization_id: organizationId,
        action_type: 'dns_lookup',
        entity_type: 'domain',
        entity_id: domainId || null,
        entity_value: domain,
        results: result.data,
        summary: {
          a_records: result.data?.records.a.length || 0,
          mx_records: result.data?.records.mx.length || 0,
          ns_records: result.data?.records.ns.length || 0,
          has_mail: result.data?.summary.hasMailServer || false,
          mail_providers: result.data?.summary.mailProviders || [],
        },
        credits_spent: DNS_CREDIT_COST,
        created_by: userId,
      });
      console.log('[Domain Intel] Saved DNS lookup result');
    } catch (err) {
      console.error('[Domain Intel] Failed to save result:', err);
    }

    // Update domain record if domainId provided
    if (domainId && result.data) {
      try {
        const updateData: Record<string, unknown> = {};
        if (result.data.records.a.length > 0) {
          updateData.ip_addresses = result.data.records.a;
        }
        if (result.data.records.mx.length > 0) {
          updateData.mx_records = result.data.records.mx;
        }
        if (result.data.records.ns.length > 0) {
          updateData.nameservers = result.data.records.ns;
        }

        if (Object.keys(updateData).length > 0) {
          await supabase.from('domains').update(updateData).eq('id', domainId);
          console.log('[Domain Intel] Updated domain record');
        }
      } catch (err) {
        console.error('[Domain Intel] Failed to update domain:', err);
      }
    }

    console.log('[Domain Intel] Returning DNS lookup result');
    return res.json({
      ...result.data,
      creditsSpent: DNS_CREDIT_COST,
    });
  } catch (err) {
    console.error('[Domain Intel] DNS lookup error:', err);
    return res.status(500).json({ 
      error: 'DNS lookup failed', 
      details: err instanceof Error ? err.message : String(err) 
    });
  }
}

/**
 * WHOIS Lookup handler
 */
export async function whoisLookupHandler(req: Request, res: Response) {
  console.log('[Domain Intel] WHOIS lookup handler called');
  console.log('[Domain Intel] Request body:', JSON.stringify(req.body));
  
  try {
    const { domain, domainId } = req.body;
    const organizationId = req.organizationId;
    const userId = req.userId;

    console.log('[Domain Intel] Parsed params:', { domain, domainId, organizationId, userId });

    if (!domain) {
      console.log('[Domain Intel] Error: Domain is required');
      return res.status(400).json({ error: 'Domain is required' });
    }

    if (!organizationId) {
      console.log('[Domain Intel] Error: Organization not found');
      return res.status(401).json({ error: 'Organization not found' });
    }

    console.log(`[Domain Intel] WHOIS lookup request: ${domain}`);

    // Spend credits
    const spendResult = await spendCreditsForAction({
      orgId: organizationId,
      creditCost: WHOIS_CREDIT_COST,
      category: 'whois_lookup',
      description: `WHOIS lookup: ${domain}`,
    });

    if (!spendResult.success) {
      console.log('[Domain Intel] Insufficient credits');
      return res.status(402).json({ 
        error: 'Insufficient credits',
        creditsRequired: WHOIS_CREDIT_COST,
      });
    }

    console.log('[Domain Intel] Credits spent, performing WHOIS lookup...');

    // Perform lookup
    const result = await whoisLookup.lookupWhois(domain);

    console.log('[Domain Intel] WHOIS lookup result:', result.error ? `Error: ${result.error}` : 'Success');

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    // Save to action_results
    try {
      await supabase.from('action_results').insert({
        organization_id: organizationId,
        action_type: 'whois_lookup',
        entity_type: 'domain',
        entity_id: domainId || null,
        entity_value: domain,
        results: result.data,
        summary: {
          available: result.data?.available || false,
          registrar: result.data?.registrar,
          created_date: result.data?.createdDate,
          expires_date: result.data?.expiresDate,
          age: result.data?.summary.age,
          expires_in: result.data?.summary.expiresIn,
          is_expiring_soon: result.data?.summary.isExpiringSoon,
          is_new_domain: result.data?.summary.isNewDomain,
          privacy_protected: result.data?.summary.privacyProtected,
        },
        credits_spent: WHOIS_CREDIT_COST,
        created_by: userId,
      });
      console.log('[Domain Intel] Saved WHOIS lookup result');
    } catch (err) {
      console.error('[Domain Intel] Failed to save result:', err);
    }

    // Update domain record if domainId provided
    if (domainId && result.data && !result.data.available) {
      try {
        const updateData: Record<string, unknown> = {};
        if (result.data.registrar) updateData.registrar = result.data.registrar;
        if (result.data.createdDate) updateData.created_date = result.data.createdDate;
        if (result.data.expiresDate) updateData.expires_date = result.data.expiresDate;
        if (result.data.nameservers.length > 0) updateData.nameservers = result.data.nameservers;

        if (Object.keys(updateData).length > 0) {
          await supabase.from('domains').update(updateData).eq('id', domainId);
          console.log('[Domain Intel] Updated domain record');
        }
      } catch (err) {
        console.error('[Domain Intel] Failed to update domain:', err);
      }
    }

    console.log('[Domain Intel] Returning WHOIS lookup result');
    return res.json({
      ...result.data,
      creditsSpent: WHOIS_CREDIT_COST,
    });
  } catch (err) {
    console.error('[Domain Intel] WHOIS lookup error:', err);
    return res.status(500).json({ 
      error: 'WHOIS lookup failed', 
      details: err instanceof Error ? err.message : String(err) 
    });
  }
}

/**
 * Status check handler
 */
export async function statusHandler(req: Request, res: Response) {
  try {
    const dnsAvailable = dnsLookup.isServiceAvailable();
    const whoisAvailable = await whoisLookup.isServiceAvailable();

    return res.json({
      dns: { available: dnsAvailable },
      whois: { available: whoisAvailable },
    });
  } catch (err) {
    console.error('[Domain Intel] Status check error:', err);
    return res.status(500).json({ error: 'Status check failed' });
  }
}
