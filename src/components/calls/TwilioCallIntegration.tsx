import { useMemo } from 'react';
import { useWebRTCCall } from '../../hooks/useWebRTCCall';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

export default function TwilioCallIntegration() {
  const callContext = useWebRTCCall();
  const callerId = (callContext as any)?.callerId;

  const alertContent = useMemo(() => {
    if (!callerId) {
      return null;
    }

    return (
      <Alert className="mb-4">
        <AlertTitle>Connected to Twilio</AlertTitle>
        <AlertDescription>
          Calls will originate from <span className="font-semibold">{callerId}</span>
        </AlertDescription>
      </Alert>
    );
  }, [callerId]);

  return alertContent;
}
