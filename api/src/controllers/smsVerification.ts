import { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient';
import { 
  SaveBrandRequest, 
  SaveCampaignRequest, 
  VerificationStatusResponse, 
  ApiResponse,
  SmsBrandProfile,
  SmsCampaignProfile
} from '../types/smsVerification';

// Helper function to verify organization ownership
const verifyOwnership = async (orgId: string, userId: string): Promise<boolean> => {
  const { data: org, error } = await supabase
    .from('organizations')
    .select('owner_id')
    .eq('id', orgId)
    .single();

  if (error || !org) {
    return false;
  }

  return org.owner_id === userId;
};

// GET /api/sms/verification-status
export const getVerificationStatus = async (req: Request, res: Response) => {
  try {
    const { orgId } = req.query;
    const userId = (req as any).user.id;

    if (!orgId || typeof orgId !== 'string') {
      return res.status(400).json({ ok: false, error: 'Organization ID is required' } as ApiResponse);
    }

    // Verify ownership
    const isOwner = await verifyOwnership(orgId, userId);
    if (!isOwner) {
      return res.status(403).json({ ok: false, error: 'Access denied' } as ApiResponse);
    }

    // Get organization SMS verification data
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select(`
        twilio_subaccount_sid,
        messaging_service_sid,
        trusthub_profile_sid,
        a2p_campaign_id,
        a2p_campaign_status,
        a2p_campaign_reject_reason,
        tollfree_verification_status,
        tollfree_reject_reason
      `)
      .eq('id', orgId)
      .single();

    if (orgError) {
      console.error('Error fetching organization:', orgError);
      return res.status(500).json({ ok: false, error: 'Failed to fetch verification status' } as ApiResponse);
    }

    const response: VerificationStatusResponse = {
      subaccountSid: org.twilio_subaccount_sid,
      messagingServiceSid: org.messaging_service_sid,
      trusthubProfileSid: org.trusthub_profile_sid,
      a2p: {
        status: org.a2p_campaign_status,
        reason: org.a2p_campaign_reject_reason
      },
      tollfree: {
        status: org.tollfree_verification_status,
        reason: org.tollfree_reject_reason
      }
    };

    res.json({ ok: true, data: response } as ApiResponse);
  } catch (error) {
    console.error('Error getting verification status:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' } as ApiResponse);
  }
};

// POST /api/sms/save-brand
export const saveBrand = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const brandData: SaveBrandRequest = req.body;

    // Verify ownership
    const isOwner = await verifyOwnership(brandData.orgId, userId);
    if (!isOwner) {
      return res.status(403).json({ ok: false, error: 'Access denied' } as ApiResponse);
    }

    // Validate required fields
    if (!brandData.legal_name || !brandData.business_type || !brandData.ein || 
        !brandData.website || !brandData.industry || !brandData.address || !brandData.contact) {
      return res.status(400).json({ ok: false, error: 'All required fields must be provided' } as ApiResponse);
    }

    // Prepare brand profile data
    const brandProfile: Partial<SmsBrandProfile> = {
      org_id: brandData.orgId,
      legal_name: brandData.legal_name,
      business_type: brandData.business_type,
      ein: brandData.ein,
      website: brandData.website,
      industry: brandData.industry,
      addr_street: brandData.address.street,
      addr_city: brandData.address.city,
      addr_state: brandData.address.state,
      addr_zip: brandData.address.zip,
      addr_country: brandData.address.country,
      contact_name: brandData.contact.name,
      contact_email: brandData.contact.email,
      contact_phone: brandData.contact.phone,
      updated_at: new Date().toISOString()
    };

    // Upsert brand profile
    const { error } = await supabase
      .from('sms_brand_profile')
      .upsert(brandProfile, { onConflict: 'org_id' });

    if (error) {
      console.error('Error saving brand profile:', error);
      return res.status(500).json({ ok: false, error: 'Failed to save brand profile' } as ApiResponse);
    }

    res.json({ ok: true } as ApiResponse);
  } catch (error) {
    console.error('Error saving brand:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' } as ApiResponse);
  }
};

// POST /api/sms/save-campaign
export const saveCampaign = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const campaignData: SaveCampaignRequest = req.body;

    // Verify ownership
    const isOwner = await verifyOwnership(campaignData.orgId, userId);
    if (!isOwner) {
      return res.status(403).json({ ok: false, error: 'Access denied' } as ApiResponse);
    }

    // Validate required fields
    if (!campaignData.use_case_description || !campaignData.opt_in_method || 
        !campaignData.sample_msg_1 || !campaignData.sample_msg_2 || 
        !campaignData.opt_out_text || !campaignData.help_text || 
        !campaignData.terms_url || !campaignData.privacy_url || 
        !campaignData.est_monthly_messages) {
      return res.status(400).json({ ok: false, error: 'All required fields must be provided' } as ApiResponse);
    }

    // Validate sample messages
    const brandProfile = await supabase
      .from('sms_brand_profile')
      .select('legal_name')
      .eq('org_id', campaignData.orgId)
      .single();

    if (brandProfile.data) {
      const brandName = brandProfile.data.legal_name.toLowerCase();
      const sample1Lower = campaignData.sample_msg_1.toLowerCase();
      const sample2Lower = campaignData.sample_msg_2.toLowerCase();
      
      // Check if brand name is in one sample and STOP/HELP is in another
      const hasBrandName = sample1Lower.includes(brandName) || sample2Lower.includes(brandName);
      const hasStopHelp = sample1Lower.includes('stop') || sample1Lower.includes('help') || 
                         sample2Lower.includes('stop') || sample2Lower.includes('help');

      if (!hasBrandName) {
        return res.status(400).json({ 
          ok: false, 
          error: 'At least one sample message must include your brand name' 
        } as ApiResponse);
      }

      if (!hasStopHelp) {
        return res.status(400).json({ 
          ok: false, 
          error: 'At least one sample message must include STOP or HELP' 
        } as ApiResponse);
      }
    }

    // Prepare campaign profile data
    const campaignProfile: Partial<SmsCampaignProfile> = {
      org_id: campaignData.orgId,
      use_case_description: campaignData.use_case_description,
      opt_in_method: campaignData.opt_in_method,
      sample_msg_1: campaignData.sample_msg_1,
      sample_msg_2: campaignData.sample_msg_2,
      opt_out_text: campaignData.opt_out_text,
      help_text: campaignData.help_text,
      terms_url: campaignData.terms_url,
      privacy_url: campaignData.privacy_url,
      est_monthly_messages: campaignData.est_monthly_messages,
      countries: campaignData.countries || ['US'],
      updated_at: new Date().toISOString()
    };

    // Upsert campaign profile
    const { error } = await supabase
      .from('sms_campaign_profile')
      .upsert(campaignProfile, { onConflict: 'org_id' });

    if (error) {
      console.error('Error saving campaign profile:', error);
      return res.status(500).json({ ok: false, error: 'Failed to save campaign profile' } as ApiResponse);
    }

    res.json({ ok: true } as ApiResponse);
  } catch (error) {
    console.error('Error saving campaign:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' } as ApiResponse);
  }
};

// POST /api/sms/submit-10dlc
export const submit10DLC = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { orgId } = req.body;

    if (!orgId) {
      return res.status(400).json({ ok: false, error: 'Organization ID is required' } as ApiResponse);
    }

    // Verify ownership
    const isOwner = await verifyOwnership(orgId, userId);
    if (!isOwner) {
      return res.status(403).json({ ok: false, error: 'Access denied' } as ApiResponse);
    }

    // Check if organization has Twilio subaccount
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('twilio_subaccount_sid')
      .eq('id', orgId)
      .single();

    if (orgError || !org?.twilio_subaccount_sid) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Organization must have Twilio subaccount configured' 
      } as ApiResponse);
    }

    // Get brand and campaign profiles
    const [brandResult, campaignResult] = await Promise.all([
      supabase.from('sms_brand_profile').select('*').eq('org_id', orgId).single(),
      supabase.from('sms_campaign_profile').select('*').eq('org_id', orgId).single()
    ]);

    if (brandResult.error || campaignResult.error) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Brand and campaign profiles must be completed first' 
      } as ApiResponse);
    }

    // TODO: Implement actual Twilio TrustHub and A2P API calls
    // For now, we'll simulate the process
    console.log('TODO: Implement Twilio TrustHub Customer Profile creation');
    console.log('TODO: Implement A2P Campaign submission');
    
    // Simulate creating TrustHub profile and A2P campaign
    const mockTrusthubProfileSid = `TB${Math.random().toString(36).substr(2, 32)}`;
    const mockA2pCampaignId = `A2P${Math.random().toString(36).substr(2, 32)}`;

    // Update organization with submission data
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        trusthub_profile_sid: mockTrusthubProfileSid,
        a2p_campaign_id: mockA2pCampaignId,
        a2p_campaign_status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', orgId);

    if (updateError) {
      console.error('Error updating organization with 10DLC data:', updateError);
      return res.status(500).json({ ok: false, error: 'Failed to submit 10DLC application' } as ApiResponse);
    }

    res.json({ 
      ok: true, 
      data: { a2p_campaign_id: mockA2pCampaignId } 
    } as ApiResponse);
  } catch (error) {
    console.error('Error submitting 10DLC:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' } as ApiResponse);
  }
};

// POST /api/sms/submit-tollfree
export const submitTollFree = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { orgId } = req.body;

    if (!orgId) {
      return res.status(400).json({ ok: false, error: 'Organization ID is required' } as ApiResponse);
    }

    // Verify ownership
    const isOwner = await verifyOwnership(orgId, userId);
    if (!isOwner) {
      return res.status(403).json({ ok: false, error: 'Access denied' } as ApiResponse);
    }

    // Get brand and campaign profiles
    const [brandResult, campaignResult] = await Promise.all([
      supabase.from('sms_brand_profile').select('*').eq('org_id', orgId).single(),
      supabase.from('sms_campaign_profile').select('*').eq('org_id', orgId).single()
    ]);

    if (brandResult.error || campaignResult.error) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Brand and campaign profiles must be completed first' 
      } as ApiResponse);
    }

    // TODO: Implement actual Twilio Toll-Free verification API call
    console.log('TODO: Implement Twilio Toll-Free verification submission');
    
    // Simulate Toll-Free verification submission
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        tollfree_verification_status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', orgId);

    if (updateError) {
      console.error('Error updating organization with Toll-Free data:', updateError);
      return res.status(500).json({ ok: false, error: 'Failed to submit Toll-Free verification' } as ApiResponse);
    }

    res.json({ ok: true } as ApiResponse);
  } catch (error) {
    console.error('Error submitting Toll-Free verification:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' } as ApiResponse);
  }
};

// POST /api/sms/refresh-status
export const refreshStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { orgId } = req.body;

    if (!orgId) {
      return res.status(400).json({ ok: false, error: 'Organization ID is required' } as ApiResponse);
    }

    // Verify ownership
    const isOwner = await verifyOwnership(orgId, userId);
    if (!isOwner) {
      return res.status(403).json({ ok: false, error: 'Access denied' } as ApiResponse);
    }

    // TODO: Implement actual Twilio API calls to check status
    console.log('TODO: Implement Twilio API calls to check TrustHub/A2P/Toll-Free status');
    
    // For now, return current status (in production, this would poll Twilio APIs)
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select(`
        twilio_subaccount_sid,
        messaging_service_sid,
        trusthub_profile_sid,
        a2p_campaign_id,
        a2p_campaign_status,
        a2p_campaign_reject_reason,
        tollfree_verification_status,
        tollfree_reject_reason
      `)
      .eq('id', orgId)
      .single();

    if (orgError) {
      console.error('Error fetching organization:', orgError);
      return res.status(500).json({ ok: false, error: 'Failed to refresh status' } as ApiResponse);
    }

    const response: VerificationStatusResponse = {
      subaccountSid: org.twilio_subaccount_sid,
      messagingServiceSid: org.messaging_service_sid,
      trusthubProfileSid: org.trusthub_profile_sid,
      a2p: {
        status: org.a2p_campaign_status,
        reason: org.a2p_campaign_reject_reason
      },
      tollfree: {
        status: org.tollfree_verification_status,
        reason: org.tollfree_reject_reason
      }
    };

    res.json({ ok: true, data: response } as ApiResponse);
  } catch (error) {
    console.error('Error refreshing status:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' } as ApiResponse);
  }
};
