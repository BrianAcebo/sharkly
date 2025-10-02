import React, { useState, useEffect, useMemo } from 'react';
import { useWebRTCCall } from '../../hooks/useWebRTCCall';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { supabase } from '../../utils/supabaseClient';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Minimize2,
  X,
  User,
  Expand,
  PhoneIncoming,
  PhoneOutgoing,
  Check,
  BellRing,
  X as CloseIcon,
  AlertTriangle
} from 'lucide-react';

const isPhoneNumber = (text: string): boolean => /^[+\-\s()\d]+$/.test(text);

const formatPhoneNumber = (number?: string) => {
  if (!number) {
    return '';
  }
  const cleaned = number.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length > 11) {
    return `+${cleaned}`;
  }
  return cleaned;
};

const callerPreviewColor = (direction?: 'inbound' | 'outbound') =>
  direction === 'inbound' ? 'bg-blue-500' : direction === 'outbound' ? 'bg-red-500' : 'bg-gray-500';

const directionIcon = (direction?: 'inbound' | 'outbound') =>
  direction === 'inbound' ? <PhoneIncoming className="h-4 w-4" /> : <PhoneOutgoing className="h-4 w-4" />;

const IncomingCallCard: React.FC<{
  name: string;
  phoneNumber: string;
  leadState: 'idle' | 'loading' | 'found' | 'not-found';
  onAccept: () => void;
  onDecline: () => void;
  isEnding: boolean;
}> = ({ name, phoneNumber, leadState, onAccept, onDecline, isEnding }) => {
  const formatted = formatPhoneNumber(phoneNumber);
  return (
    <div className="w-96 max-w-sm overflow-hidden rounded-2xl bg-white text-gray-900 shadow-xl ring-1 ring-black/5 dark:bg-gray-900 dark:text-white">
      <div className="relative bg-gradient-to-r from-red-400 via-red-500 to-pink-500 p-5 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-red-500">
              <PhoneIncoming className="h-5 w-5" />
            </div>
            <div className="max-w-[200px] flex flex-col">
              <span className="text-xs uppercase tracking-wide opacity-80">Incoming Call</span>
              <span className="truncate text-lg font-semibold leading-tight">{name}</span>
              <span className="text-xs opacity-80">{formatted}</span>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={onDecline}
            className="h-8 w-8 rounded-full bg-white/20 text-white hover:bg-white/30"
            tooltip="Decline"
            tooltipPosition="top"
          >
            <PhoneOff className="h-4 w-4" />
          </Button>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/30" />
      </div>
      <div className="space-y-5 bg-white px-6 py-5 dark:bg-gray-900">
        <div className="flex items-center justify-between rounded-xl border border-gray-200/70 bg-gray-50 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-300">
              <User className="h-4 w-4" />
            </div>
            <div className="max-w-[180px] flex flex-col">
              <span className="truncate font-medium text-gray-900 dark:text-white">{name}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{formatted}</span>
            </div>
          </div>
          {leadState === 'loading' && (
            <div className="flex items-center space-x-2 text-xs text-red-500">
              <div className="h-2 w-2 animate-ping rounded-full bg-red-500" />
              <span>Identifying…</span>
            </div>
          )}
          {leadState === 'found' && (
            <div className="flex items-center space-x-2 text-xs text-green-500">
              <Check className="h-3 w-3" />
              <span>Lead matched</span>
            </div>
          )}
          {leadState === 'not-found' && (
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              <AlertTriangle className="h-3 w-3" />
              <span>No CRM match</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between space-x-4">
          <Button
            onClick={onDecline}
            variant="outline"
            className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-red-500/40 dark:hover:bg-red-500/10 dark:hover:text-red-300"
            tooltip="Decline"
            tooltipPosition="top"
          >
            Decline
          </Button>
          <Button
            onClick={onAccept}
            className="flex-1 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 py-3 text-sm font-semibold text-white shadow-lg hover:from-green-600 hover:to-emerald-600"
            tooltip="Answer"
            tooltipPosition="top"
          >
            Answer
          </Button>
        </div>
        <div className="flex items-center justify-center space-x-2 text-xs text-gray-400 dark:text-gray-500">
          <span>{isEnding ? 'Call ended' : 'Ringing your browser…'}</span>
          {isEnding && <div className="h-2 w-2 animate-pulse rounded-full bg-gray-400" />}
        </div>
      </div>
    </div>
  );
};

export const ActiveCallBar: React.FC = () => {
  const { user } = useAuth();
  const {
    makeCall: initiateCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleSpeaker,
    holdCall,
    resumeCall,
    currentCall,
    isConnected,
    isConnecting,
    isRinging,
    isEnding,
    isMuted,
    isSpeakerOn,
    callDuration,
    remoteNumber,
    remoteName,
    deviceStatus,
    notificationsEnabled,
    requestNotificationPermission,
    showNotificationPrompt
  } = useWebRTCCall();

  const [isMinimized, setIsMinimized] = useState(false);
  const [showDialPad, setShowDialPad] = useState(false);
  const [dialedNumber, setDialedNumber] = useState('');
  const [isDialing, setIsDialing] = useState(false);
  const [incomingLeadName, setIncomingLeadName] = useState<string | null>(null);
  const [incomingLookupState, setIncomingLookupState] = useState<'idle' | 'loading' | 'found' | 'not-found'>('idle');

  const activeCall = currentCall;

  useEffect(() => {
    if (!isRinging && isEnding) {
      const timeout = setTimeout(() => {
        setShowDialPad(false);
      }, 800);
      return () => clearTimeout(timeout);
    }
  }, [isRinging, isEnding]);

  useEffect(() => {
    if (!isRinging) {
      setIncomingLeadName(null);
      setIncomingLookupState('idle');
    }
  }, [isRinging]);

  useEffect(() => {
    const fetchLead = async () => {
      if (!isRinging || !remoteNumber) return;
      setIncomingLookupState('loading');
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          setIncomingLookupState('not-found');
          return;
        }
        const { data: membership } = await supabase
          .from('user_organizations')
          .select('organization_id')
          .eq('user_id', authUser.id)
          .single();
        if (!membership?.organization_id) {
          setIncomingLookupState('not-found');
          return;
        }
        const digits = remoteNumber.replace(/\D/g, '');
        const variations = [
          remoteNumber,
          digits,
          `+${digits}`,
          digits.startsWith('1') ? `+${digits}` : `+1${digits}`,
          digits.startsWith('1') ? digits.slice(1) : digits
        ];
        const { data: lead } = await supabase
          .from('leads')
          .select('id,name,phone')
          .eq('organization_id', membership.organization_id)
          .or(variations.map((v) => `phone.eq.${v}`).join(','))
          .maybeSingle();
        if (lead?.name) {
          setIncomingLeadName(lead.name);
          setIncomingLookupState('found');
        } else {
          setIncomingLeadName(null);
          setIncomingLookupState('not-found');
        }
      } catch (error) {
        console.error('Failed to lookup incoming caller', error);
        setIncomingLeadName(null);
        setIncomingLookupState('not-found');
      }
    };
    fetchLead();
  }, [isRinging, remoteNumber]);

  useEffect(() => {
    if (activeCall && activeCall.status === 'connected' && showDialPad) {
      setShowDialPad(false);
    }
  }, [activeCall, showDialPad]);

  useEffect(() => {
    if (!isRinging && deviceStatus === 'Calling…' && !showDialPad) {
      setShowDialPad(true);
    }
  }, [deviceStatus, isRinging, showDialPad]);

  useEffect(() => {
    if (deviceStatus === 'Calling…' && remoteNumber && !dialedNumber) {
      setDialedNumber(remoteNumber);
    }
  }, [deviceStatus, remoteNumber, dialedNumber]);

  if (!user?.organization_id) {
    return null;
  }

  const lookupLeadByPhone = async (phoneNumber: string) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return null;
      const { data: membership } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', authUser.id)
        .single();
      if (!membership?.organization_id) return null;
      const digits = phoneNumber.replace(/\D/g, '');
      const variations = [
        phoneNumber,
        digits,
        `+${digits}`,
        digits.startsWith('1') ? `+${digits}` : `+1${digits}`,
        digits.startsWith('1') ? digits.slice(1) : digits
      ];
      const { data: lead } = await supabase
        .from('leads')
        .select('id,name,phone')
        .eq('organization_id', membership.organization_id)
        .or(variations.map((v) => `phone.eq.${v}`).join(','))
        .maybeSingle();
      return lead ?? null;
    } catch (error) {
      console.error('Error looking up lead by phone', error);
      return null;
    }
  };

  const handleDialPadClick = (digit: string) => {
    if (digit === 'delete') {
      setDialedNumber((prev) => {
        const cleaned = prev.replace(/\D/g, '');
        return formatPhoneNumber(cleaned.slice(0, -1));
      });
    } else if (digit === 'clear') {
      setDialedNumber('');
    } else {
      setDialedNumber((prev) => {
        const cleaned = prev.replace(/\D/g, '');
        return formatPhoneNumber(cleaned + digit);
      });
    }
  };

  const handleMakeCall = async () => {
    if (!dialedNumber) return;
    setIsDialing(true);
    try {
      const cleaned = dialedNumber.replace(/\D/g, '');
      const callNumber = cleaned.length === 10 ? `+1${cleaned}` : cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
      const lead = await lookupLeadByPhone(callNumber);
      if (lead) {
        await initiateCall(callNumber, lead.name, lead.id);
      } else {
        await initiateCall(callNumber, callNumber);
      }
      setDialedNumber('');
    } catch (error) {
      console.error('Error making call', error);
    } finally {
      setIsDialing(false);
    }
  };

  const toggleDialPad = () => {
    setShowDialPad((prev) => !prev);
    if (showDialPad) {
      setDialedNumber('');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const incomingDisplayName = useMemo(() => {
    if (incomingLeadName) return incomingLeadName;
    if (remoteName && !isPhoneNumber(remoteName)) return remoteName;
    if (remoteNumber) return formatPhoneNumber(remoteNumber);
    return 'Unknown Caller';
  }, [incomingLeadName, remoteName, remoteNumber]);

  if (isRinging || (isEnding && !activeCall)) {
    return (
      <div className="fixed right-4 bottom-4 z-50 transition-all duration-200 ease-in-out">
        <IncomingCallCard
          name={incomingDisplayName}
          phoneNumber={remoteNumber || ''}
          leadState={incomingLookupState}
          onAccept={answerCall}
          onDecline={rejectCall}
          isEnding={isEnding && !isRinging}
        />
      </div>
    );
  }

  if (deviceStatus === 'Loading…' || deviceStatus === 'Registering…' || deviceStatus === 'Unauthorized') {
    return (
      <div className="fixed right-4 bottom-4 z-50">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-white shadow-lg">
          <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-white" />
        </div>
      </div>
    );
  }

  if (deviceStatus === 'Error' || deviceStatus === 'Failed to initialize') {
    return (
      <div className="fixed right-4 bottom-4 z-50">
        <div className="rounded-full border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 font-medium text-white">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeCall && isMinimized) {
    return (
      <div className="fixed right-4 bottom-4 z-50">
        <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center space-x-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full text-white ${callerPreviewColor(activeCall.direction)}`}>
              {isPhoneNumber(activeCall.contactName) ? <User className="h-4 w-4" /> : activeCall.contactName.charAt(0)}
            </div>
            <div className="text-sm">
              <p className="font-medium text-gray-900 dark:text-white">{activeCall.contactName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {activeCall.status === 'connected' ? formatDuration(callDuration) : 'Connecting…'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(false)}
              className="h-8 w-8 p-1"
              tooltip="Expand"
              tooltipPosition="top"
            >
              <Expand className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed right-4 bottom-4 z-50">
      {!activeCall ? (
        <div
          className={`border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 ${showDialPad ? 'w-80 rounded-xl' : 'w-fit rounded-full'}`}
        >
          {showDialPad ? (
            <>
              <div className="flex items-center justify-between rounded-t-lg bg-gradient-to-r from-red-400 via-red-500 to-pink-500 p-3 text-white">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{deviceStatus === 'Calling…' ? 'Calling…' : 'Dial Pad'}</p>
                  {deviceStatus !== 'Ready' && deviceStatus !== 'Calling…' && (
                    <span className="text-xs opacity-80">{deviceStatus}</span>
                  )}
                  {deviceStatus === 'Calling…' && remoteNumber && (
                    <p className="text-xs opacity-90">{remoteName || formatPhoneNumber(remoteNumber)}</p>
                  )}
                  {!notificationsEnabled && (
                    <p className="flex items-center space-x-1 text-xs text-amber-100">
                      <BellRing className="h-3 w-3" />
                      <span>Notifications are disabled</span>
                      <button
                        type="button"
                        onClick={() => {
                          void requestNotificationPermission();
                          showNotificationPrompt();
                        }}
                        className="underline"
                      >
                        Remind me how
                      </button>
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleDialPad}
                  className="h-6 w-6 p-1 text-white hover:bg-red-600"
                >
                  <CloseIcon className="h-4 w-4" />
                </Button>
              </div>

              <div className="px-4 pt-4">
                {deviceStatus === 'Calling…' ? (
                  <div className="flex h-12 items-center justify-center">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <div className="h-2 w-2 animate-ping rounded-full bg-red-500" />
                      <span>Calling…</span>
                    </div>
                  </div>
                ) : (
                  <Input
                    type="tel"
                    value={dialedNumber}
                    onChange={(e) => setDialedNumber(formatPhoneNumber(e.target.value))}
                    placeholder="Enter phone number"
                    className="h-12 text-center font-mono text-sm"
                  />
                )}
              </div>

              <div className="flex flex-col items-center p-6">
                <div className="mb-6 grid grid-cols-3 gap-4">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
                    <Button
                      key={digit}
                      variant="outline"
                      size="lg"
                      onClick={() => handleDialPadClick(digit)}
                      className="h-12 w-12 rounded-full font-mono text-lg"
                    >
                      {digit}
                    </Button>
                  ))}
                </div>

                {deviceStatus === 'Calling…' ? (
                  <Button
                    onClick={endCall}
                    className="mx-auto h-12 w-12 rounded-full bg-red-600 text-white hover:bg-red-700"
                  >
                    <PhoneOff className="h-6 w-6" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleMakeCall}
                    disabled={!dialedNumber || isDialing}
                    className="mx-auto h-12 w-12 rounded-full bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {isDialing ? (
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <Phone className="h-6 w-6" />
                    )}
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="p-2">
              <Button
                onClick={toggleDialPad}
                className="relative h-12 w-12 rounded-full bg-gradient-to-r from-red-400 via-red-500 to-pink-500 text-white"
              >
                <Phone className="h-4 w-4" />
                {!notificationsEnabled && (
                  <span className="absolute -right-3 -top-3 flex size-6 items-center justify-center rounded-full border-2 border-white bg-red-500">
                    <BellRing className="size-3" />
                  </span>
                )}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="w-80 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <div className="rounded-t-lg bg-gradient-to-r from-red-400 via-red-500 to-pink-500 p-3">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-sm text-white">
                {activeCall.status === 'connected' ? formatDuration(callDuration) : '00:00'}
              </span>
              {deviceStatus !== 'On call' && deviceStatus !== 'Ready' && (
                <span className="text-xs text-red-100 opacity-80">{deviceStatus}</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-white ${activeCall.direction === 'inbound' ? 'text-blue-500' : 'text-red-500'}`}>
                  {directionIcon(activeCall.direction)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{activeCall.contactName}</p>
                  <p className="text-xs text-red-100 opacity-80">{formatPhoneNumber(activeCall.phoneNumber)}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(true)}
                className="h-6 w-6 p-1 text-white hover:bg-red-600"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="px-3 py-2">
            <div className="h-1 w-full rounded-full bg-gray-200 dark:bg-gray-600">
              <div className="h-1 w-1/3 rounded-full bg-gray-400 dark:bg-gray-400" />
            </div>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant={isMuted ? 'destructive' : 'outline'}
                size="sm"
                onClick={toggleMute}
                className="flex flex-col items-center justify-center space-y-1"
              >
                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>
              <Button
                variant={isSpeakerOn ? 'default' : 'outline'}
                size="sm"
                onClick={toggleSpeaker}
                className="flex flex-col items-center justify-center space-y-1"
              >
                {isSpeakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={endCall}
                className="flex flex-col items-center justify-center space-y-1"
              >
                <PhoneOff className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="flex justify-center p-4">
            <Button
              variant="destructive"
              size="lg"
              onClick={endCall}
              className="h-14 w-14 rounded-full p-0"
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
