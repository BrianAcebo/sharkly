import React, { useState } from 'react';
import { X, Phone, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { useWebRTCCall } from '../../hooks/useWebRTCCall';
import { toast } from 'sonner';

interface CallConfirmationProps {
  leadName: string;
  leadPhone: string;
  leadId?: string;
  onClose: () => void;
  onCallInitiated?: (callSid: string) => void;
}

const CallConfirmation: React.FC<CallConfirmationProps> = ({
  leadName,
  leadPhone,
  leadId,
  onClose,
  onCallInitiated
}) => {
  const [isCalling, setIsCalling] = useState(false);
  const { makeCall } = useWebRTCCall();

  const handleMakeCall = async () => {
    if (!leadPhone) {
      toast.error('Phone number is required');
      return;
    }

    setIsCalling(true);
    
    try {
      // Format phone number for WebRTC (ensure E.164 format)
      let formattedPhone = leadPhone;
      
      // Remove all non-digits
      const cleaned = leadPhone.replace(/\D/g, '');
      
      // If it's a 10-digit US number, add +1
      if (cleaned.length === 10) {
        formattedPhone = `+1${cleaned}`;
      }
      // If it's an 11-digit US number starting with 1, add +
      else if (cleaned.length === 11 && cleaned.startsWith('1')) {
        formattedPhone = `+${cleaned}`;
      }
      // For other formats, try to add + if not present
      else if (!leadPhone.startsWith('+')) {
        formattedPhone = `+${cleaned}`;
      }
      
      // Use the WebRTC system to make the call
      await makeCall(formattedPhone, leadName, leadId);
      
      toast.success(`Call initiated to ${leadName}`);
      onCallInitiated?.('webrtc-call'); // Use a placeholder since WebRTC doesn't have a traditional call SID
      onClose();
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Call {leadName}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-4 p-6">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                To:
              </span>
              <span className="text-sm text-gray-900 dark:text-white font-mono">
                {formatPhoneNumber(leadPhone)}
              </span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Contact:
              </span>
              <span className="text-sm text-gray-900 dark:text-white">
                {leadName}
              </span>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              </div>
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium">WebRTC Call:</p>
                <p className="mt-1">
                  This will initiate a call using your browser's microphone and the WebRTC dial pad. 
                  The dial pad will open automatically to show call progress and controls.
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
              disabled={isCalling || !leadPhone}
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
