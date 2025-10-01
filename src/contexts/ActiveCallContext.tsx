import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ActiveCall } from '../types/calls';
import { toast } from 'sonner';
import { supabase } from '../utils/supabaseClient';

interface ActiveCallContextType {
  activeCall: ActiveCall | null;
  isMuted: boolean;
  isSpeakerOn: boolean;
  isVideoOn: boolean;
  isRecording: boolean;
  isOnHold: boolean;
  showKeypad: boolean;
  callDuration: number;
  initiateCall: (phoneNumber: string, contactName?: string, contactId?: string) => Promise<void>;
  endCall: () => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  toggleVideo: () => void;
  toggleRecording: () => void;
  toggleHold: () => void;
  toggleKeypad: () => void;
  addParticipant: () => void;
  showMoreOptions: () => void;
}

const ActiveCallContext = createContext<ActiveCallContextType | undefined>(undefined);

export const useActiveCall = () => {
  const context = useContext(ActiveCallContext);
  if (context === undefined) {
    throw new Error('useActiveCall must be used within an ActiveCallProvider');
  }
  return context;
};

interface ActiveCallProviderProps {
  children: React.ReactNode;
}

export const ActiveCallProvider: React.FC<ActiveCallProviderProps> = ({ children }) => {
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeCall && activeCall.status === 'connected') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeCall]);

  const initiateCall = useCallback(async (phoneNumber: string, contactName?: string, contactId?: string) => {
    if (!phoneNumber) {
      toast.error('Phone number is required');
      return;
    }

    // Get the Twilio number from environment variable
    // Removed global fallback number; we will use the seat's assigned number from the server
    if (!twilioNumber) {
      toast.error('Twilio phone number not configured');
      return;
    }

    const newCall: ActiveCall = {
      id: `call-${Date.now()}`,
      contactId: contactId || null,
      phoneNumber,
      contactName: contactName || phoneNumber,
      direction: 'outbound',
      status: 'connecting',
      startTime: new Date(),
      duration: 0,
      isMuted: false,
      isSpeakerOn: false,
      isVideoOn: false,
      isRecording: false,
      isOnHold: false
    };

    setActiveCall(newCall);
    setCallDuration(0);
    setIsMuted(false);
    setIsSpeakerOn(false);
    setIsVideoOn(false);
    setIsRecording(false);
    setIsOnHold(false);
    setShowKeypad(false);

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
        body: JSON.stringify({ to: phoneNumber, from: twilioNumber })
      });
      
      const responseData = await response.json();
      
      if (response.ok && responseData.success) {
        const message = contactName 
          ? `Call initiated to ${contactName}`
          : `Call initiated to ${phoneNumber}`;
        
        toast.success(message);
        
        // Simulate call connection
        setTimeout(() => {
          setActiveCall(prev => prev ? { ...prev, status: 'connecting' } : null);
        }, 1000);
        
        setTimeout(() => {
          setActiveCall(prev => prev ? { ...prev, status: 'connected' } : null);
        }, 3000);
      } else {
        throw new Error(responseData.error || 'Failed to initiate call');
      }
    } catch (error) {
      // Silent error handling
    }
  }, []);

  const endCall = useCallback(() => {
    if (activeCall) {
      // Add to call history (in a real app, you'd save this to your database)
      const historyEntry = {
        id: `history-${Date.now()}`,
        contactId: activeCall.contactId,
        contactName: activeCall.contactName,
        phoneNumber: activeCall.phoneNumber,
        direction: activeCall.direction,
        status: 'completed' as const,
        startTime: activeCall.startTime,
        endTime: new Date(),
        duration: callDuration
      };
      

      toast.success('Call ended');
    }
    
    setActiveCall(null);
    setCallDuration(0);
    setIsMuted(false);
    setIsSpeakerOn(false);
    setIsVideoOn(false);
    setIsRecording(false);
    setIsOnHold(false);
    setShowKeypad(false);
  }, [activeCall, callDuration]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
    if (activeCall) {
      setActiveCall(prev => prev ? { ...prev, isMuted: !prev.isMuted } : null);
    }
  }, [activeCall]);

  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn(prev => !prev);
    if (activeCall) {
      setActiveCall(prev => prev ? { ...prev, isSpeakerOn: !prev.isSpeakerOn } : null);
    }
  }, [activeCall]);

  const toggleVideo = useCallback(() => {
    setIsVideoOn(prev => !prev);
    if (activeCall) {
      setActiveCall(prev => prev ? { ...prev, isVideoOn: !prev.isVideoOn } : null);
    }
  }, [activeCall]);

  const toggleRecording = useCallback(() => {
    setIsRecording(prev => !prev);
    if (activeCall) {
      setActiveCall(prev => prev ? { ...prev, isRecording: !prev.isRecording } : null);
    }
  }, [activeCall]);

  const toggleHold = useCallback(() => {
    setIsOnHold(prev => !prev);
    if (activeCall) {
      setActiveCall(prev => prev ? { ...prev, isOnHold: !prev.isOnHold } : null);
    }
  }, [activeCall]);

  const toggleKeypad = useCallback(() => {
    setShowKeypad(prev => !prev);
  }, []);

  const addParticipant = useCallback(() => {
    toast.info('Add participant functionality coming soon');
  }, []);

  const showMoreOptions = useCallback(() => {
    toast.info('More options functionality coming soon');
  }, []);

  const value: ActiveCallContextType = {
    activeCall,
    isMuted,
    isSpeakerOn,
    isVideoOn,
    isRecording,
    isOnHold,
    showKeypad,
    callDuration,
    initiateCall,
    endCall,
    toggleMute,
    toggleSpeaker,
    toggleVideo,
    toggleRecording,
    toggleHold,
    toggleKeypad,
    addParticipant,
    showMoreOptions
  };

  return (
    <ActiveCallContext.Provider value={value}>
      {children}
    </ActiveCallContext.Provider>
  );
};
