import express from 'express';
import { z } from 'zod';
import { supabase } from '../utils/supabaseClient';
import { getWalletStatus } from '../controllers/billingUsage';
router.get('/wallet/status', getWalletStatus);
import { getStripeClient } from '../utils/stripe';
import type Stripe from 'stripe';

const stripe = getStripeClient();

const router = express.Router();

// Schema for tracking SMS usage
const smsUsageSchema = z.object({
  organization_id: z.string().uuid(),
  agent_id: z.string().uuid(),
  sms_message_id: z.string().uuid().optional(),
  twilio_sid: z.string().optional(),
  phone_number: z.string(),
  to_number: z.string(),
  from_number: z.string(),
  direction: z.enum(['inbound', 'outbound']),
  country_code: z.string().default('US'),
  message_count: z.number().int().positive().default(1)
});

// Schema for tracking voice usage
const voiceUsageSchema = z.object({
  organization_id: z.string().uuid(),
  agent_id: z.string().uuid(),
  call_history_id: z.string().uuid().optional(),
  twilio_call_sid: z.string().optional(),
  phone_number: z.string(),
  to_number: z.string(),
  from_number: z.string(),
  direction: z.enum(['inbound', 'outbound']),
  country_code: z.string().default('US'),
  call_duration_seconds: z.number().int().min(0).default(0)
});

// Helper function to determine service type based on phone number
function determineServiceType(phoneNumber: string, messageType: string = 'sms'): string {
  // Remove any formatting
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  
  // Check if it's a toll-free number (800, 833, 844, 855, 866, 877, 888)
  if (cleanNumber.match(/^1?(8(00|33|44|55|66|77|88))\d{7}$/)) {
    return messageType === 'mms' ? 'mms_tollfree' : 'sms';
  }
  
  // Check if it's a short code (5-6 digits)
  if (cleanNumber.length <= 6) {
    return messageType === 'mms' ? 'mms' : 'sms';
  }
  
  // Default to regular SMS/MMS (long codes)
  return messageType === 'mms' ? 'mms' : 'sms';
}

// Helper function to determine voice service type based on phone number
function determineVoiceServiceType(phoneNumber: string): string {
  // Remove any formatting
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  
  // Check if it's a toll-free number
  if (cleanNumber.match(/^1?(8(00|33|44|55|66|77|88))\d{7}$/)) {
    return 'voice_tollfree';
  }
  
  // Check if it's a SIP number (you might need to enhance this based on your setup)
  // For now, default to local
  return 'voice_local';
}

// Track SMS usage and calculate costs
router.post('/sms-usage', async (req, res) => {
  try {
    const data = smsUsageSchema.parse(req.body);
    
    // Determine service type based on phone number
    const serviceType = determineServiceType(data.phone_number);
    
    // Calculate costs using the database function
    const { data: costData, error: costError } = await supabase
      .rpc('calculate_usage_cost', {
        p_service_type: serviceType,
        p_country_code: data.country_code,
        p_pricing_type: data.direction,
        p_units: data.message_count,
        p_organization_id: data.organization_id
      });

    if (costError) {
      console.error('Error calculating SMS costs:', costError);
      return res.status(500).json({ error: 'Failed to calculate costs' });
    }

    const costs = costData[0];

    // Insert SMS usage record
    const { data: usageRecord, error: insertError } = await supabase
      .from('sms_usage')
      .insert({
        ...data,
        twilio_cost: costs.twilio_cost,
        markup_amount: costs.markup_amount,
        total_cost: costs.total_cost
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting SMS usage:', insertError);
      return res.status(500).json({ error: 'Failed to track SMS usage' });
    }

    // Update monthly billing
    const currentMonth = new Date();
    currentMonth.setDate(1); // First day of current month
    await supabase.rpc('update_monthly_billing', {
      p_organization_id: data.organization_id,
      p_billing_month: currentMonth.toISOString().split('T')[0]
    });

    res.json({
      success: true,
      usage_record: usageRecord,
      costs: {
        twilio_cost: costs.twilio_cost,
        markup_amount: costs.markup_amount,
        total_cost: costs.total_cost,
        markup_percentage: costs.markup_percentage
      }
    });

  } catch (error) {
    console.error('SMS usage tracking error:', error);
    res.status(400).json({ error: 'Invalid request data' });
  }
});

// Track voice usage (no cost fields) and post Stripe meter event
router.post('/voice-usage', async (req, res) => {
  try {
    const data = voiceUsageSchema.parse(req.body);
    
    // Convert seconds to minutes (ceil to align with metering)
    const call_duration_minutes = Math.ceil(data.call_duration_seconds / 60);

    // Insert voice usage record
    const { data: usageRecord, error: insertError } = await supabase
      .from('voice_usage')
      .insert({
        organization_id: data.organization_id,
        agent_id: data.agent_id,
        call_history_id: data.call_history_id,
        twilio_call_sid: data.twilio_call_sid,
        phone_number: data.phone_number,
        to_number: data.to_number,
        from_number: data.from_number,
        direction: data.direction,
        country_code: data.country_code,
        call_duration_seconds: data.call_duration_seconds,
        call_duration_minutes: call_duration_minutes
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting voice usage:', insertError);
      return res.status(500).json({ error: 'Failed to track voice usage' });
    }

    // Do not post meter events here; rollup happens on invoice.upcoming webhook
    try {
      const { data: org } = await supabase
        .from('organizations')
        .select('stripe_customer_id')
        .eq('id', data.organization_id)
        .single();

      const stripeCustomerId = org?.stripe_customer_id as string | undefined;
      if (stripeCustomerId) {
        // No-op here; usage will be rolled up and posted during invoice.upcoming
      } else {
        console.warn('Missing stripe_customer_id for org; skipping meter event', data.organization_id);
      }
    } catch (meterErr) {
      console.error('Failed to post Stripe meter event:', meterErr);
    }

    // Update monthly billing (minutes only)
    const currentMonth = new Date();
    currentMonth.setDate(1); // First day of current month
    await supabase.rpc('update_monthly_billing', {
      p_organization_id: data.organization_id,
      p_billing_month: currentMonth.toISOString().split('T')[0]
    });

    res.json({
      success: true,
      usage_record: usageRecord
    });

  } catch (error) {
    console.error('Voice usage tracking error:', error);
    res.status(400).json({ error: 'Invalid request data' });
  }
});

// Return the active Stripe price for voice minutes overage (env-aware)
router.get('/voice-price', async (req, res) => {
  try {
    const isLive = process.env.NODE_ENV === 'production' || process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_');
    const overageCode = isLive ? 'voice_minutes_overage' : 'voice_minutes_overage_test';

    const { data: overage, error } = await supabase
      .from('usage_overage_catalog')
      .select('overage_code, name, stripe_price_id, rounding_mode, billing_increment_seconds, env, active')
      .eq('overage_code', overageCode)
      .eq('active', true)
      .single();

    if (error || !overage?.stripe_price_id) {
      return res.status(404).json({ error: 'Active voice overage price not found' });
    }

    const stripe = getStripeClient();
    const price = await stripe.prices.retrieve(overage.stripe_price_id, { expand: ['product'] });

    const recurring = price.recurring as Stripe.Price.Recurring | null;
    const aggregateUsage = recurring && (recurring as unknown as { aggregate_usage?: string }).aggregate_usage;

    res.json({
      success: true,
      overage,
      stripe_price: {
        id: price.id,
        currency: price.currency,
        unit_amount: price.unit_amount, // in cents if set
        unit_amount_decimal: (price.unit_amount_decimal as string | null) || null,
        billing_scheme: price.billing_scheme,
        usage_type: recurring?.usage_type ?? 'metered',
        aggregate_usage: aggregateUsage ?? 'sum',
        product: typeof price.product === 'string' ? price.product : price.product?.id
      }
    });
  } catch (e) {
    console.error('voice-price error', e);
    res.status(500).json({ error: 'Failed to load voice price' });
  }
});

// Per-agent voice analytics for an organization (current period or date range)
router.get('/voice-analytics/:organizationId', async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    // If the subscription is canceled, reset usage numbers in the response
    try {
      const { data: org } = await supabase
        .from('organizations')
        .select('stripe_status')
        .eq('id', organizationId)
        .single();
      if (org?.stripe_status === 'canceled') {
        return res.json({
          success: true,
          start: startDate || null,
          end: endDate || null,
          totals: { calls: 0, seconds: 0, minutes: 0, cost: 0 },
          rows: []
        });
      }
    } catch (orgErr) {
      console.warn('Failed to load org for analytics reset check:', orgErr);
    }

    const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const end = endDate || new Date().toISOString();

    // 1) Load billed minutes and calls from voice_usage (minutes are already per-call rounded up)
    const { data: usageRows, error: usageErr } = await supabase
      .from('voice_usage')
      .select('agent_id, call_duration_seconds, call_duration_minutes, usage_date')
      .eq('organization_id', organizationId)
      .gte('usage_date', start)
      .lte('usage_date', end);

    if (usageErr) {
      console.error('Error fetching voice_usage for analytics:', usageErr);
      return res.status(500).json({ error: 'Failed to fetch voice usage' });
    }

    // 2) Build per-agent usage, including seconds directly from voice_usage for consistency
    const perAgentUsage: Record<string, { calls: number; billedMinutes: number; seconds: number }> = {};
    for (const u of usageRows || []) {
      if (!u.agent_id) continue;
      if (!perAgentUsage[u.agent_id]) perAgentUsage[u.agent_id] = { calls: 0, billedMinutes: 0, seconds: 0 };
      perAgentUsage[u.agent_id].calls += 1;
      perAgentUsage[u.agent_id].billedMinutes += Number(u.call_duration_minutes || 0);
      perAgentUsage[u.agent_id].seconds += Number(u.call_duration_seconds || 0);
    }

    // 3) Load Stripe overage price to compute cost
    let unitPrice = 0; // in dollars per minute
    try {
      const isLive = process.env.NODE_ENV === 'production' || process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_');
      const overageCode = isLive ? 'voice_minutes_overage' : 'voice_minutes_overage_test';
      const { data: overage } = await supabase
        .from('usage_overage_catalog')
        .select('stripe_price_id')
        .eq('overage_code', overageCode)
        .eq('active', true)
        .single();
      if (overage?.stripe_price_id) {
        const stripe = getStripeClient();
        const price = await stripe.prices.retrieve(overage.stripe_price_id);
        if (price.unit_amount !== null && price.unit_amount !== undefined) {
          unitPrice = price.unit_amount / 100; // cents to dollars
        } else if (price.unit_amount_decimal) {
          unitPrice = parseFloat(price.unit_amount_decimal) / 100;
        }
      }
    } catch (e) {
      console.warn('Failed to retrieve overage price for analytics; costs will be 0:', e);
    }

    const agentIds = Array.from(new Set([...(usageRows || []).map(u => u.agent_id).filter(Boolean)] as string[]));

    const rows = agentIds.map((agentId) => {
      const usage = perAgentUsage[agentId] || { calls: 0, billedMinutes: 0, seconds: 0 };
      const cost = unitPrice * usage.billedMinutes;
      return {
        agent_id: agentId,
        calls: usage.calls,
        seconds: usage.seconds,
        minutes: usage.billedMinutes,
        cost
      };
    });

    const totals = rows.reduce(
      (acc, r) => ({
        calls: acc.calls + r.calls,
        seconds: acc.seconds + r.seconds,
        minutes: acc.minutes + r.minutes,
        cost: acc.cost + r.cost
      }),
      { calls: 0, seconds: 0, minutes: 0, cost: 0 }
    );

    res.json({ success: true, start, end, totals, rows });
  } catch (error) {
    console.error('Voice analytics API error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});
// Get usage summary for an organization
router.get('/usage-summary/:organizationId', async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { startDate, endDate } = req.query;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    // Build date filter (unused; kept for clarity of intent)

    // Get SMS usage summary
    const { data: smsUsage, error: smsError } = await supabase
      .from('sms_usage')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('usage_date', startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
      .lte('usage_date', endDate || new Date().toISOString())
      .order('usage_date', { ascending: false });

    if (smsError) {
      console.error('Error fetching SMS usage:', smsError);
      return res.status(500).json({ error: 'Failed to fetch SMS usage' });
    }

    // Get voice usage summary
    const { data: voiceUsage, error: voiceError } = await supabase
      .from('voice_usage')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('usage_date', startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
      .lte('usage_date', endDate || new Date().toISOString())
      .order('usage_date', { ascending: false });

    if (voiceError) {
      console.error('Error fetching voice usage:', voiceError);
      return res.status(500).json({ error: 'Failed to fetch voice usage' });
    }

    // Calculate totals
    // No on-DB costs: only minutes; cost is now derived by Stripe invoice
    const smsTotal = 0;
    const voiceTotal = 0;
    const totalCost = 0;

    const smsCount = smsUsage?.reduce((sum, usage) => sum + usage.message_count, 0) || 0;
    const voiceMinutes = voiceUsage?.reduce((sum, usage) => sum + parseFloat(usage.call_duration_minutes), 0) || 0;

    res.json({
      success: true,
      summary: {
        sms: {
          count: smsCount,
          cost: smsTotal,
          records: smsUsage || []
        },
        voice: {
          minutes: voiceMinutes,
          cost: voiceTotal,
          records: voiceUsage || []
        },
        total: {
          cost: totalCost,
          sms_cost: smsTotal,
          voice_cost: voiceTotal
        }
      }
    });

  } catch (error) {
    console.error('Usage summary error:', error);
    res.status(500).json({ error: 'Failed to fetch usage summary' });
  }
});

// Get monthly billing history
router.get('/monthly-billing/:organizationId', async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { limit = 12 } = req.query;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    const { data: billingHistory, error } = await supabase
      .from('monthly_billing')
      .select('*')
      .eq('organization_id', organizationId)
      .order('billing_month', { ascending: false })
      .limit(parseInt(limit as string));

    if (error) {
      console.error('Error fetching billing history:', error);
      return res.status(500).json({ error: 'Failed to fetch billing history' });
    }

    res.json({
      success: true,
      billing_history: billingHistory || []
    });

  } catch (error) {
    console.error('Billing history error:', error);
    res.status(500).json({ error: 'Failed to fetch billing history' });
  }
});

// Get billing settings for an organization
router.get('/settings/:organizationId', async (req, res) => {
  try {
    const { organizationId } = req.params;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    const { data: settings, error } = await supabase
      .from('billing_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching billing settings:', error);
      return res.status(500).json({ error: 'Failed to fetch billing settings' });
    }

    // Return default settings if none exist
    const defaultSettings = {
      default_markup_percentage: 20.00,
      billing_cycle: 'monthly',
      auto_billing: true,
      billing_email: null,
      payment_method: null
    };

    res.json({
      success: true,
      settings: settings || defaultSettings
    });

  } catch (error) {
    console.error('Billing settings error:', error);
    res.status(500).json({ error: 'Failed to fetch billing settings' });
  }
});

// Update billing settings
router.put('/settings/:organizationId', async (req, res) => {
  try {
    const { organizationId } = req.params;
    const settingsData = req.body;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    const { data: settings, error } = await supabase
      .from('billing_settings')
      .upsert({
        organization_id: organizationId,
        ...settingsData,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating billing settings:', error);
      return res.status(500).json({ error: 'Failed to update billing settings' });
    }

    res.json({
      success: true,
      settings
    });

  } catch (error) {
    console.error('Billing settings update error:', error);
    res.status(500).json({ error: 'Failed to update billing settings' });
  }
});

// Get current Twilio pricing
router.get('/pricing', async (req, res) => {
  try {
    const { data: pricing, error } = await supabase
      .from('twilio_pricing')
      .select('*')
      .order('effective_date', { ascending: false });

    if (error) {
      console.error('Error fetching pricing:', error);
      return res.status(500).json({ error: 'Failed to fetch pricing' });
    }

    // Organize pricing by service type for easier consumption
    const organizedPricing = {
      sms: pricing?.filter(p => p.service_type === 'sms') || [],
      mms: pricing?.filter(p => p.service_type.startsWith('mms')) || [],
      voice: pricing?.filter(p => p.service_type.startsWith('voice')) || []
    };

    res.json({
      success: true,
      pricing: pricing || [],
      organized: organizedPricing
    });

  } catch (error) {
    console.error('Pricing fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch pricing' });
  }
});

// Get pricing breakdown for a specific phone number
router.post('/pricing/calculate', async (req, res) => {
  try {
    const { phoneNumber, serviceType, direction, units, organizationId } = req.body;
    
    if (!phoneNumber || !serviceType || !direction || !units) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let serviceTypeKey = serviceType;
    
    // Determine the correct service type based on phone number
    if (serviceType === 'sms' || serviceType === 'mms') {
      serviceTypeKey = determineServiceType(phoneNumber, serviceType);
    } else if (serviceType === 'voice') {
      serviceTypeKey = determineVoiceServiceType(phoneNumber);
    }

    // Calculate costs
    const { data: costData, error: costError } = await supabase
      .rpc('calculate_usage_cost', {
        p_service_type: serviceTypeKey,
        p_country_code: 'US',
        p_pricing_type: direction,
        p_units: units,
        p_organization_id: organizationId
      });

    if (costError) {
      console.error('Error calculating costs:', costError);
      return res.status(500).json({ error: 'Failed to calculate costs' });
    }

    const costs = costData[0];

    res.json({
      success: true,
      phoneNumber,
      serviceType: serviceTypeKey,
      direction,
      units,
      costs: {
        twilio_cost: costs.twilio_cost,
        markup_amount: costs.markup_amount,
        total_cost: costs.total_cost,
        markup_percentage: costs.markup_percentage
      }
    });

  } catch (error) {
    console.error('Pricing calculation error:', error);
    res.status(500).json({ error: 'Failed to calculate pricing' });
  }
});

router.get('/invoices', async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const customerId = req.query.customerId as string | undefined;
    if (!customerId) {
      return res.status(400).json({ error: 'customerId is required' });
    }

    const limit = Number(req.query.limit ?? 10);
    const startingAfter = (req.query.starting_after as string | undefined) || undefined;
    const endingBefore = (req.query.ending_before as string | undefined) || undefined;

    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit,
      starting_after: startingAfter,
      ending_before: endingBefore,
      expand: ['data.charge']
    });

    res.json({
      data: invoices.data,
      has_more: invoices.has_more,
      url: invoices.url
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

export default router;
