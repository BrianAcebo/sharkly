import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Device, Call } from '@twilio/voice-sdk';
import { WebRTCCallContext } from '../contexts/WebRTCCallContext';
import { supabase } from '../utils/supabaseClient';

interface WebRTCCallProviderProps {
  children: React.ReactNode;
}

export const WebRTCCallProvider = ({ children }: WebRTCCallProviderProps) => {
  const [device, setDevice] = useState<Device | null>(null);
  const [status, setStatus] = useState("Loading…");
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [currentCall, setCurrentCall] = useState<{ contactName: string; status: string } | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [remoteNumber, setRemoteNumber] = useState('');
  const [remoteName, setRemoteName] = useState('');
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string | null>(null);
  const [selectedSpeakerDevice, setSelectedSpeakerDevice] = useState<string | null>(null);
  const [localAudioLevel] = useState(0);
  const [remoteAudioLevel] = useState(0);
  
  const connRef = useRef<Call | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Twilio Device
  useEffect(() => {
    (async () => {
      try {
        // Get the current session token
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('No active session');
        }

        console.log(window.location.origin)

        const r = await fetch("/api/twilio/tokens/generate-token", {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        const { token } = await r.json();
        const d = new Device(token);
        
        d.on("ready", () => {
          setStatus("Ready");
          setDevice(d);
        });
        
        d.on("error", (e: any) => {
          setStatus("Error: " + e.message);
          setDevice(null);
        });
        
        d.on("incoming", (connection) => {
          setIsRinging(true);
          setRemoteNumber(connection.parameters.From || 'Unknown');
          setRemoteName(connection.parameters.From || 'Unknown');
          connRef.current = connection;
          
          connection.on("accept", () => {
            setIsRinging(false);
            setIsConnected(true);
            setIsConnecting(false);
            setCurrentCall({
              contactName: connection.parameters.From || 'Unknown',
              status: 'connected'
            });
          });
          
          connection.on("disconnect", () => {
            endCall();
          });
          
          connection.on("error", (e: any) => {
            setStatus("Call error: " + e.message);
            endCall();
          });
        });
        
        setDevice(d);
      } catch (error) {
        console.error('Failed to initialize Twilio Device:', error);
        setStatus('Failed to initialize');
      }
    })();
  }, []);

  // Call duration timer
  useEffect(() => {
    if (isConnected && currentCall) {
      durationIntervalRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      setCallDuration(0);
    }
    
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [isConnected, currentCall]);

  const makeCall = useCallback(async (phoneNumber: string, contactName?: string) => {
    if (!device) return;
    
    setIsConnecting(true);
    setStatus("Calling…");
    setRemoteNumber(phoneNumber);
    setRemoteName(contactName || phoneNumber);
    
    try {
      const c = await device.connect({ params: { To: phoneNumber } });
      connRef.current = c;
      
      c.on("accept", () => {
        setStatus("On call");
        setIsConnecting(false);
        setIsConnected(true);
        setCurrentCall({
          contactName: contactName || phoneNumber,
          status: 'connected'
        });
      });
      
      c.on("disconnect", () => {
        endCall();
      });
      
      c.on("error", (e: any) => {
        setStatus("Call error: " + e.message);
        setIsConnecting(false);
      });
    } catch (error) {
      console.error('Failed to make call:', error);
      setStatus('Call failed');
      setIsConnecting(false);
    }
  }, [device]);

  const answerCall = useCallback(() => {
    if (isRinging && connRef.current) {
      connRef.current.accept();
    }
  }, [isRinging]);

  const rejectCall = useCallback(() => {
    if (connRef.current) {
      connRef.current.reject();
    }
    setIsRinging(false);
    setCurrentCall(null);
    setRemoteNumber('');
    setRemoteName('');
  }, []);

  const endCall = useCallback(() => {
    if (connRef.current) {
      connRef.current.disconnect();
    }
    device?.disconnectAll();
    
    setIsConnected(false);
    setIsConnecting(false);
    setIsRinging(false);
    setIsOnHold(false);
    setCurrentCall(null);
    setRemoteNumber('');
    setRemoteName('');
    setCallDuration(0);
    setStatus('Ready');
  }, [device]);

  const toggleMute = useCallback(() => {
    if (connRef.current) {
      const newMuteState = !isMuted;
      connRef.current.mute(newMuteState);
      setIsMuted(newMuteState);
    }
  }, [isMuted]);

  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn(prev => !prev);
  }, []);

  const holdCall = useCallback(() => {
    if (isConnected && !isOnHold) {
      setIsOnHold(true);
    }
  }, [isConnected, isOnHold]);

  const resumeCall = useCallback(() => {
    if (isConnected && isOnHold) {
      setIsOnHold(false);
    }
  }, [isConnected, isOnHold]);

  const refreshAudioDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
      
      setAudioDevices([...audioInputs, ...audioOutputs]);
      
      if (!selectedAudioDevice && audioInputs.length > 0) {
        setSelectedAudioDevice(audioInputs[0].deviceId);
      }
      if (!selectedSpeakerDevice && audioOutputs.length > 0) {
        setSelectedSpeakerDevice(audioOutputs[0].deviceId);
      }
    } catch (error) {
      console.error('Failed to enumerate audio devices:', error);
    }
  }, [selectedAudioDevice, selectedSpeakerDevice]);

  const setAudioDevice = useCallback((deviceId: string) => {
    setSelectedAudioDevice(deviceId);
  }, []);

  const setSpeakerDevice = useCallback((deviceId: string) => {
    setSelectedSpeakerDevice(deviceId);
  }, []);

  const contextValue = {
    // Call state
    isConnected,
    isConnecting,
    isRinging,
    isOnHold,
    isMuted,
    isSpeakerOn,
    
    // Call info
    currentCall,
    callDuration,
    remoteNumber,
    remoteName,
    
    // Audio devices
    audioDevices,
    selectedAudioDevice,
    selectedSpeakerDevice,
    
    // Call controls
    makeCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleSpeaker,
    holdCall,
    resumeCall,
    
    // Device management
    refreshAudioDevices,
    setAudioDevice,
    setSpeakerDevice,
    
    // Audio levels
    localAudioLevel,
    remoteAudioLevel,
    
    // Device status
    deviceStatus: status,
  };

  return (
    <WebRTCCallContext.Provider value={contextValue}>
      {children}
    </WebRTCCallContext.Provider>
  );
};
