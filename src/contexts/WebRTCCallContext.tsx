import { createContext } from 'react';

interface ActiveCall {
	contactName: string;
	status: string;
}

interface WebRTCCallContextType {
  // Call state
  isConnected: boolean;
  isConnecting: boolean;
  isRinging: boolean;
  isOnHold: boolean;
  isMuted: boolean;
  isSpeakerOn: boolean;
  
  // Call info
  currentCall: ActiveCall | null;
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
  
  // Device status
  deviceStatus: string;
}

export const WebRTCCallContext = createContext<WebRTCCallContextType | undefined>(undefined);
