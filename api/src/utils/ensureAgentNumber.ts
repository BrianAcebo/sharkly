import { supabase } from './supabaseClient';
import { twilioClient } from './twilioClient';

interface EnsureAgentNumberResult {
  phoneNumber: string;
  error?: string;
}

/**
 * Ensures an agent has an active phone number, provisioning one if needed.
 * This function is idempotent - if the agent already has a number, it returns it.
 */
export async function ensureAgentNumber(
  agentId: string
): Promise<EnsureAgentNumberResult> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.info(`[${requestId}] Ensuring phone number for agent ${agentId}`);
    
    // Check if agent already has an active number
    const { data: existingNumber, error: queryError } = await supabase
      .from('agent_phone_numbers')
      .select('phone_number')
      .eq('agent_id', agentId)
      .eq('is_active', true)
      .single();

    if (queryError && queryError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error(`[${requestId}] Database error checking existing number:`, queryError);
      throw queryError;
    }

    if (existingNumber) {
      console.info(`[${requestId}] Agent ${agentId} already has active number: ${existingNumber.phone_number}`);
      return { phoneNumber: existingNumber.phone_number };
    }

    // Agent needs a new number - provision one
    console.info(`[${requestId}] Provisioning new number for agent ${agentId}`);
    
    // Check if agent has area code preference in profile
    // Search for available phone numbers
    const searchParams: {
      country: string;
      smsEnabled: boolean;
      voiceEnabled: boolean;
      limit: number;
    } = {
      country: 'US',
      smsEnabled: true,
      voiceEnabled: false, // SMS only
      limit: 1
    };

    // Try to find available numbers
    const [availableNumber] = await twilioClient.incomingPhoneNumbers
      .list(searchParams);

    if (!availableNumber) {
      const errorMsg = 'No SMS-enabled numbers available';
      console.error(`[${requestId}] ${errorMsg}`);
      return { phoneNumber: '', error: errorMsg };
    }

    // Purchase the phone number
    console.info(`[${requestId}] Purchasing number: ${availableNumber.phoneNumber}`);
    
    const purchasedNumber = await twilioClient.incomingPhoneNumbers
      .create({
        phoneNumber: availableNumber.phoneNumber,
        smsUrl: `${process.env.PUBLIC_URL}/webhooks/twilio/sms-inbound`,
        smsMethod: 'POST'
      });

    // Insert into agent_phone_numbers
    const { data: agentPhoneNumber, error: insertError } = await supabase
      .from('agent_phone_numbers')
      .insert({
        agent_id: agentId,
        phone_number: purchasedNumber.phoneNumber,
        twilio_sid: purchasedNumber.sid,
        is_active: true
      })
      .select()
      .single();

    if (insertError) {
      // If database insert fails, release the Twilio number
      console.error(`[${requestId}] Database insert failed, releasing Twilio number:`, insertError);
      await twilioClient.incomingPhoneNumbers(purchasedNumber.sid).remove();
      throw insertError;
    }

    console.info(`[${requestId}] Successfully provisioned number ${purchasedNumber.phoneNumber} for agent ${agentId}`);
    return { phoneNumber: agentPhoneNumber.phone_number };

  } catch (error) {
    console.error(`[${requestId}] Error ensuring agent number:`, error);
    
    // Retry once on Twilio API errors
    if (error instanceof Error && error.message.includes('Twilio')) {
      console.info(`[${requestId}] Retrying once due to Twilio error...`);
      try {
        // Wait a bit before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Recursive call for retry
        return await ensureAgentNumber(agentId);
      } catch (retryError) {
        console.error(`[${requestId}] Retry failed:`, retryError);
        return { phoneNumber: '', error: 'Failed to provision number after retry' };
      }
    }
    
    return { 
      phoneNumber: '', 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}
