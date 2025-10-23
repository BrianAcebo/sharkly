import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Loader2, Phone } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import { api } from '../../utils/api';

interface TwilioCallIntegrationProps {
  phoneNumber: string;
  contactName?: string;
  onCallInitiated?: (callSid: string) => void;
  onCallFailed?: (error: string) => void;
}

const TwilioCallIntegration: React.FC<TwilioCallIntegrationProps> = ({
  phoneNumber,
  contactName,
  onCallInitiated,
  onCallFailed
}) => {
  const [isCalling, setIsCalling] = useState(false);

  const initiateCall = async () => {
    if (!phoneNumber) {
      toast.error('Phone number is required');
      return;
    }

    setIsCalling(true);
    
    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No active session');
      }

      const response = await api.post(
        '/api/calls/make',
        { to: phoneNumber },
        { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` } }
      );

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to initiate call');
      }
      
      if (responseData.success) {
        const message = contactName 
          ? `Call initiated to ${contactName}`
          : `Call initiated to ${phoneNumber}`;
        
        toast.success(message);
        onCallInitiated?.(responseData.callSid);
      } else {
        throw new Error(responseData.error || 'Failed to initiate call');
      }
    } catch (error) {
      console.error('Error making call:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to make call';
      toast.error(`Call failed: ${errorMessage}`);
      onCallFailed?.(errorMessage);
    } finally {
      setIsCalling(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Button
        onClick={initiateCall}
        disabled={isCalling || !phoneNumber}
        className="bg-green-600 hover:bg-green-700 text-white"
        size="sm"
      >
        {isCalling ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Calling...
          </>
        ) : (
          <>
            <Phone className="h-4 w-4 mr-2" />
            Call via Twilio
          </>
        )}
      </Button>
      
      <div className="text-xs text-gray-500 dark:text-gray-400">
        {contactName ? `Will call ${contactName}` : `Will call ${phoneNumber}`}
      </div>
    </div>
  );
};

export default TwilioCallIntegration;
