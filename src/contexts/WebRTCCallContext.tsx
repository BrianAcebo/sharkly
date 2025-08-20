import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

interface WebRTCCallContextType {
  // Call state
  isConnected: boolean;
  isConnecting: boolean;
  isRinging: boolean;
  isOnHold: boolean;
  isMuted: boolean;
  isSpeakerOn: boolean;
  
  // Call info
  currentCall: any | null;
  callDuration: number;
  remoteNumber: string;
  remoteName: string;
  
  // Audio devices
  audioDevices: MediaDeviceInfo[];
  selectedAudioDevice: string | null;
  selectedSpeakerDevice: string | null;
  
  // Call controls
  makeCall: (phoneNumber: string, contactName?: string) => Promise<void>;
  answerCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  holdCall: () => void;
  resumeCall: () => void;
  
  // Device management
  refreshAudioDevices: () => Promise<void>;
  setAudioDevice: (deviceId: string) => void;
  setSpeakerDevice: (deviceId: string) => void;
  
  // Audio levels
  localAudioLevel: number;
  remoteAudioLevel: number;
}

const WebRTCCallContext = createContext<WebRTCCallContextType | undefined>(undefined);

export const useWebRTCCall = () => {
  const context = useContext(WebRTCCallContext);
  if (context === undefined) {
    throw new Error('useWebRTCCall must be used within a WebRTCCallProvider');
  }
  return context;
};

interface WebRTCCallProviderProps {
  children: React.ReactNode;
}

export const WebRTCCallProvider: React.FC<WebRTCCallProviderProps> = ({ children }) => {
  // Call state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  
  // Call info
  const [currentCall, setCurrentCall] = useState<any | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [remoteNumber, setRemoteNumber] = useState('');
  const [remoteName, setRemoteName] = useState('');
  
  // Audio devices
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string | null>(null);
  const [selectedSpeakerDevice, setSelectedSpeakerDevice] = useState<string | null>(null);
  
  // Audio levels
  const [localAudioLevel, setLocalAudioLevel] = useState(0);
  const [remoteAudioLevel, setRemoteAudioLevel] = useState(0);
  
  // Refs
  const callRef = useRef<any | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Initialize Twilio Device
  useEffect(() => {
    const initTwilioDevice = async () => {
      try {
        // Request microphone permission
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Create audio context for audio level monitoring
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        
        // Connect microphone to analyser
        microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
        microphoneRef.current.connect(analyserRef.current);
        
        // Start audio level monitoring
        const monitorAudioLevels = () => {
          if (analyserRef.current) {
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(dataArray);
            
            // Calculate average audio level
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
            setLocalAudioLevel(average / 255); // Normalize to 0-1
            
            // Monitor remote audio if available
            if (callRef.current && callRef.current.getRemoteStream) {
              const remoteStream = callRef.current.getRemoteStream();
              if (remoteStream) {
                const remoteAnalyser = audioContextRef.current!.createAnalyser();
                const remoteSource = audioContextRef.current!.createMediaStreamSource(remoteStream);
                remoteSource.connect(remoteAnalyser);
                
                const remoteDataArray = new Uint8Array(remoteAnalyser.frequencyBinCount);
                remoteAnalyser.getByteFrequencyData(remoteDataArray);
                const remoteAverage = remoteDataArray.reduce((a, b) => a + b) / remoteDataArray.length;
                setRemoteAudioLevel(remoteAverage / 255);
              }
            }
          }
          requestAnimationFrame(monitorAudioLevels);
        };
        
        monitorAudioLevels();
        
        // Refresh audio devices
        await refreshAudioDevices();
        
        // Release the initial stream since we just needed it for permissions
        stream.getTracks().forEach(track => track.stop());
        
      } catch (error) {
        console.error('Failed to initialize audio devices:', error);
      }
    };
    
    initTwilioDevice();
    
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
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

  const refreshAudioDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
      
      setAudioDevices([...audioInputs, ...audioOutputs]);
      
      // Set default devices if none selected
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

  const makeCall = useCallback(async (phoneNumber: string, contactName?: string) => {
    try {
      setIsConnecting(true);
      setRemoteNumber(phoneNumber);
      setRemoteName(contactName || phoneNumber);
      
      // Here you would integrate with your Twilio backend to get a token
      // For now, we'll simulate the call setup
      
      // Simulate call connection
      setTimeout(() => {
        setIsConnecting(false);
        setIsConnected(true);
        setCurrentCall({ id: `call-${Date.now()}`, phoneNumber, contactName });
      }, 2000);
      
    } catch (error) {
      console.error('Failed to make call:', error);
      setIsConnecting(false);
    }
  }, []);

  const answerCall = useCallback(() => {
    if (isRinging) {
      setIsRinging(false);
      setIsConnected(true);
    }
  }, [isRinging]);

  const rejectCall = useCallback(() => {
    setIsRinging(false);
    setCurrentCall(null);
    setRemoteNumber('');
    setRemoteName('');
  }, []);

  const endCall = useCallback(() => {
    if (currentCall) {
      // Here you would actually end the Twilio call
      setIsConnected(false);
      setIsConnecting(false);
      setIsRinging(false);
      setIsOnHold(false);
      setCurrentCall(null);
      setRemoteNumber('');
      setRemoteName('');
      setCallDuration(0);
    }
  }, [currentCall]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
    // Here you would actually mute/unmute the Twilio call
  }, []);

  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn(prev => !prev);
    // Here you would actually toggle speaker mode
  }, []);

  const holdCall = useCallback(() => {
    if (isConnected && !isOnHold) {
      setIsOnHold(true);
      // Here you would actually put the Twilio call on hold
    }
  }, [isConnected, isOnHold]);

  const resumeCall = useCallback(() => {
    if (isConnected && isOnHold) {
      setIsOnHold(false);
      // Here you would actually resume the Twilio call
    }
  }, [isConnected, isOnHold]);

  const setAudioDevice = useCallback((deviceId: string) => {
    setSelectedAudioDevice(deviceId);
    // Here you would actually switch the Twilio call audio input
  }, []);

  const setSpeakerDevice = useCallback((deviceId: string) => {
    setSelectedSpeakerDevice(deviceId);
    // Here you would actually switch the Twilio call audio output
  }, []);

  const value: WebRTCCallContextType = {
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
  };

  return (
    <WebRTCCallContext.Provider value={value}>
      {children}
    </WebRTCCallContext.Provider>
  );
};
