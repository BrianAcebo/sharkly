export interface CallContact {
  id: string;
  name: string;
  phoneNumber: string;
  company?: string;
  email?: string;
  isFavorite: boolean;
  avatar?: string;
  tags?: string[];
  notes?: string;
  lastContact?: Date;
}

export interface CallHistoryEntry {
  id: string;
  contactId?: string | null;
  contactName: string;
  phoneNumber: string;
  direction: 'inbound' | 'outbound' | 'missed';
  status: 'completed' | 'missed' | 'declined' | 'busy';
  startTime: Date;
  endTime?: Date;
  duration: number; // in seconds
  recordingUrl?: string;
  notes?: string;
}

export interface ActiveCall {
  id: string;
  contactId?: string | null;
  contactName: string;
  phoneNumber: string;
  direction: 'inbound' | 'outbound';
  status: 'ringing' | 'connecting' | 'connected' | 'on-hold' | 'transferring';
  startTime: Date;
  duration: number; // in seconds
  isMuted: boolean;
  isSpeakerOn: boolean;
  isVideoOn: boolean;
  isRecording: boolean;
  isOnHold: boolean;
  recordingUrl?: string;
  notes?: string;
  twilioCallSid?: string;
  callHistoryId?: string;
}

export interface CallSettings {
  enableRecording: boolean;
  enableVideo: boolean;
  enableScreenShare: boolean;
  defaultMute: boolean;
  defaultSpeaker: boolean;
  callTimeout: number; // in seconds
  maxCallDuration: number; // in seconds
  enableCallForwarding: boolean;
  forwardToNumber?: string;
}

export interface CallQuality {
  audioLevel: number; // 0-100
  videoQuality: 'poor' | 'fair' | 'good' | 'excellent';
  latency: number; // in milliseconds
  packetLoss: number; // percentage
  connectionType: 'wifi' | 'cellular' | 'ethernet';
}

export interface CallParticipant {
  id: string;
  name: string;
  phoneNumber: string;
  role: 'caller' | 'callee' | 'participant';
  status: 'connected' | 'connecting' | 'disconnected' | 'on-hold';
  isMuted: boolean;
  isVideoOn: boolean;
  joinTime: Date;
  leaveTime?: Date;
}
