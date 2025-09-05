import express from 'express';
import { z } from 'zod';
import { supabase } from '../utils/supabaseClient';

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

// Track voice usage and calculate costs
router.post('/voice-usage', async (req, res) => {
  try {
    const data = voiceUsageSchema.parse(req.body);
    
    // Convert seconds to minutes for billing
    const call_duration_minutes = data.call_duration_seconds / 60;
    
    // Determine voice service type based on phone number
    const serviceType = determineVoiceServiceType(data.phone_number);
    
    // Calculate costs using the database function
    const { data: costData, error: costError } = await supabase
      .rpc('calculate_usage_cost', {
        p_service_type: serviceType,
        p_country_code: data.country_code,
        p_pricing_type: data.direction,
        p_units: call_duration_minutes,
        p_organization_id: data.organization_id
      });

    if (costError) {
      console.error('Error calculating voice costs:', costError);
      return res.status(500).json({ error: 'Failed to calculate costs' });
    }

    const costs = costData[0];

    // Insert voice usage record
    const { data: usageRecord, error: insertError } = await supabase
      .from('voice_usage')
      .insert({
        ...data,
        call_duration_minutes: call_duration_minutes,
        twilio_cost: costs.twilio_cost,
        markup_amount: costs.markup_amount,
        total_cost: costs.total_cost
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting voice usage:', insertError);
      return res.status(500).json({ error: 'Failed to track voice usage' });
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
    console.error('Voice usage tracking error:', error);
    res.status(400).json({ error: 'Invalid request data' });
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

    // Build date filter
    let dateFilter = '';
    if (startDate && endDate) {
      dateFilter = `AND usage_date >= '${startDate}' AND usage_date <= '${endDate}'`;
    }

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
    const smsTotal = smsUsage?.reduce((sum, usage) => sum + parseFloat(usage.total_cost), 0) || 0;
    const voiceTotal = voiceUsage?.reduce((sum, usage) => sum + parseFloat(usage.total_cost), 0) || 0;
    const totalCost = smsTotal + voiceTotal;

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

export default router;
