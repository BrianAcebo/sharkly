import React, { useState } from 'react';
import { Phone, X, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { supabase } from '../../utils/supabaseClient';

interface CallConfirmationProps {
  leadName: string;
  leadPhone: string;
  onClose: () => void;
  onCallInitiated?: (callSid: string) => void;
}

const CallConfirmation: React.FC<CallConfirmationProps> = ({
  leadName,
  leadPhone,
  onClose,
  onCallInitiated
}) => {
  const [isCalling, setIsCalling] = useState(false);
  const [twilioNumber, setTwilioNumber] = useState<string>('');

  // Get Twilio number from environment variable for testing
  React.useEffect(() => {
    const envNumber = import.meta.env.VITE_TWILIO_PHONE_NUMBER;
    if (envNumber) {
      setTwilioNumber(envNumber);
    }
  }, []);

  const handleMakeCall = async () => {
    if (!twilioNumber) {
      toast.error('Twilio phone number not configured');
      return;
    }

    setIsCalling(true);
    
    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No active session');
      }

      const response = await fetch('/api/calls/make', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ to: leadPhone, from: twilioNumber })
      });
      
      const responseData = await response.json();
      
      if (response.ok && responseData.success) {
        toast.success(`Call initiated to ${leadName}`);
        onCallInitiated?.(responseData.callSid);
        onClose();
      } else {
        toast.error(responseData.error || 'Failed to initiate call');
      }
    } catch (error) {
      console.error('Error making call:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to make call';
      toast.error(`Call failed: ${errorMessage}`);
    } finally {
      setIsCalling(false);
    }
  };

  const formatPhoneNumber = (phone: string): string => {
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 10) {
      return `(${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6)}`;
    }
    return phone;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
              <Phone className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Make Phone Call
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Call {leadName}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                From:
              </span>
              <span className="text-sm text-gray-900 dark:text-white font-mono">
                {twilioNumber ? formatPhoneNumber(twilioNumber) : 'Loading...'}
              </span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                To:
              </span>
              <span className="text-sm text-gray-900 dark:text-white font-mono">
                {formatPhoneNumber(leadPhone)}
              </span>
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              </div>
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <p className="font-medium">Important:</p>
                <p className="mt-1">
                  This will initiate a real phone call using your Twilio number. 
                  Make sure you're ready to speak with {leadName}.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isCalling}
            >
              Cancel
            </Button>
            <Button
              onClick={handleMakeCall}
              disabled={isCalling || !twilioNumber}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isCalling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Initiating Call...
                </>
              ) : (
                <>
                  <Phone className="h-4 w-4 mr-2" />
                  Make Call
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallConfirmation;
