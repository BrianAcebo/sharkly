import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Device, Call } from '@twilio/voice-sdk';
import { WebRTCCallContext } from '../contexts/WebRTCCallContext';
import { supabase } from '../utils/supabaseClient';

interface WebRTCCallProviderProps {
	children: React.ReactNode;
}

const waitForRegistered = (d: Device, ms = 3000) =>
	new Promise<boolean>((resolve) => {
		if (d.state === 'registered') return resolve(true);
		const onReg = () => {
			d.off('registered', onReg as any);
			resolve(true);
		};
		d.on('registered', onReg as any);
		setTimeout(() => {
			d.off('registered', onReg as any);
			resolve(d.state === 'registered');
		}, ms);
	});

export const WebRTCCallProvider = ({ children }: WebRTCCallProviderProps) => {
	const [device, setDevice] = useState<Device | null>(null);
	const [status, setStatus] = useState('Loading…');
	const [isConnected, setIsConnected] = useState(false);
	const [isConnecting, setIsConnecting] = useState(false);
	const [isRinging, setIsRinging] = useState(false);
	const [isOnHold, setIsOnHold] = useState(false);
	const [isMuted, setIsMuted] = useState(false);
	const [isSpeakerOn, setIsSpeakerOn] = useState(false);
	const [currentCall, setCurrentCall] = useState<{ contactName: string; status: string } | null>(
		null
	);
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
	const mediaStreamRef = useRef<MediaStream | null>(null);

	// Helper function to create call history record with complete context
	const createCallHistoryRecord = async (call: Call, callContext: any) => {
		console.log("history", call.parameters, call)
		try {
			// Get the actual Twilio Call SID
			const twilioCallSid = call.parameters?.CallSid || call.sid;
			if (!twilioCallSid) {
				console.warn('No Twilio Call SID available');
				return;
			}

			// Debug logging
			console.log('Creating call history record with complete context:', {
				twilioCallSid,
				callContext
			});

			const { data: callRecord, error: insertError } = await supabase
				.from('call_history')
				.insert({
					twilio_call_sid: twilioCallSid,
					call_direction: 'outbound',
					from_number: callContext.agentNumber,
					to_number: callContext.formattedNumber,
					agent_id: callContext.user.id,
					organization_id: callContext.organizationId,
					lead_id: callContext.leadId,
					call_status: 'initiated',
					call_start_time: new Date().toISOString()
				})
				.select()
				.single();

			if (insertError) {
				console.error('Failed to create call history record:', insertError);
			} else {
				console.log('Call history record created successfully with complete context:', {
					id: callRecord.id,
					twilioCallSid,
					organizationId: callContext.organizationId,
					leadId: callContext.leadId,
					fromNumber: callContext.agentNumber,
					toNumber: callContext.formattedNumber
				});
				// Store the call record ID for reference
				(call as any).callRecordId = callRecord.id;
			}
		} catch (error) {
			console.error('Failed to create call history record:', error);
		}
	};



	const endCall = useCallback(() => {
		console.log('[WebRTC] Ending call, cleaning up media streams');
		
		// Stop all media tracks (microphone, camera, etc.)
		if (mediaStreamRef.current) {
			mediaStreamRef.current.getTracks().forEach(track => {
				console.log('[WebRTC] Stopping media track:', track.kind);
				track.stop();
			});
			mediaStreamRef.current = null;
		}

		// Disconnect the call
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

	// Initialize Twilio Device
	useEffect(() => {
		(async () => {
			try {
				// Get the current session token
				const {
					data: { session }
				} = await supabase.auth.getSession();
				if (!session?.access_token) {
					throw new Error('No active session');
				}

				const r = await fetch(`/api/twilio/tokens/generate-token`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${session.access_token}`
					}
				});

				if (!r.ok) {
					console.error('Token generation failed:', {
						status: r.status,
						statusText: r.statusText,
						timestamp: new Date().toISOString()
					});
					throw new Error(`Token generation failed: ${r.status} ${r.statusText}`);
				}

				const responseData = await r.json();
				const { token } = responseData;

				const d = new Device(token, {
					logLevel: import.meta.env.NODE_ENV === 'development' ? 'debug' : undefined
				});

				console.log('device', d);

				d.on('ready', () => {
					setStatus('Ready');
					setDevice(d);
				});

				d.on(
					'error',
					(e: { message: string; code?: number; description?: string; explanation?: string }) => {
						console.error('Twilio Device error:', e.message, e.code, e.description);
						setStatus('Error');
						setDevice(null);
					}
				);

				d.on('registered', () => {
					setStatus('Ready');
					setDevice(d);
				});
				d.on('registering', () => setStatus('Registering…'));
				d.on('unregistered', () => setStatus('Unregistered'));
				d.on('error', (e) => {
					console.error('[voice] device error', e);
					setStatus('Error');
				});
				d.on('incoming', (connection) => {
					setIsRinging(true);
					setRemoteNumber(connection.parameters.From || 'Unknown');
					setRemoteName(connection.parameters.From || 'Unknown');
					connRef.current = connection;

					connection.on('accept', () => {
						console.log('[WebRTC] Incoming call accepted, capturing media stream');
						setIsRinging(false);
						setIsConnected(true);
						setIsConnecting(false);
						setCurrentCall({
							contactName: connection.parameters.From || 'Unknown',
							status: 'connected'
						});
						
						// Capture the media stream for cleanup when call ends
						if (connection.getLocalStream) {
							const localStream = connection.getLocalStream();
							if (localStream) {
								mediaStreamRef.current = localStream;
							}
						}
					});

					connection.on('disconnect', () => {
						endCall();
					});

					connection.on('error', (e: { message: string }) => {
						console.error('Call error:', e.message);
						setStatus('Error');
						endCall();
					});
				});

				d.on('connect', () => {
					setStatus('Connected');
				});

				d.on('disconnect', () => {
					setStatus('Ready');
				});

				[
					'ready',
					'error',
					'registered',
					'unregistered',
					'registering',
					'incoming',
					'connect',
					'disconnect',
					'tokenWillExpire',
					'tokenExpired',
					'stateChanged'
				].forEach((evt) =>
					d.on(evt as any, (...args: any[]) => console.log(`[voice] ${evt}`, ...args))
				);

				await d.register(); // <-- important
				setStatus('Registering…');

				// Add a timeout fallback in case the ready event doesn't fire
				const readyTimeout = setTimeout(() => {
					// Try to check if device is actually working
					try {
						if (d && typeof d.connect === 'function') {
							setStatus('Ready');
						}
					} catch {
						// Silent error handling
					}
				}, 5000); // 5 second timeout

				// Add periodic state checking to track device registration progress
				const stateCheckInterval = setInterval(() => {
					// Silent state monitoring
				}, 2000); // Check every 2 seconds

				// Clean up both intervals when component unmounts
				return () => {
					clearTimeout(readyTimeout);
					clearInterval(stateCheckInterval);
				};
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
				setCallDuration((prev) => prev + 1);
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

	// Cleanup media streams on unmount
	useEffect(() => {
		return () => {
			console.log('[WebRTC] Component unmounting, cleaning up media streams');
			if (mediaStreamRef.current) {
				mediaStreamRef.current.getTracks().forEach(track => {
					console.log('[WebRTC] Stopping media track on unmount:', track.kind);
					track.stop();
				});
				mediaStreamRef.current = null;
			}
		};
	}, []);

	// Call context manager to collect all necessary information
	const collectCallContext = async (phoneNumber: string, contactName?: string, leadId?: string) => {
		try {
			// Get current user and organization
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) {
				console.error('[voice] user not found');
				throw new Error('User not authenticated');
			}

			const { data: userOrg } = await supabase
				.from('user_organizations')
				.select('organization_id')
				.eq('user_id', user.id)
				.single();

			if (!userOrg) {
				console.error('[voice] user organization not found');
				throw new Error('User organization not found');
			}

			// Get agent phone number
			let agentNumber;
			if (import.meta.env.VITE_NODE_ENV === 'development') {
				agentNumber = import.meta.env.VITE_TWILIO_PHONE_NUMBER;
			} else {
				const agentData = await supabase
					.from('agent_phone_numbers')
					.select('phone_number')
					.eq('agent_id', user.id)
					.eq('is_active', true)
					.single();

				if (agentData.error || !agentData.data?.phone_number) {
					console.error('[voice] agentNumber:', agentData.error, agentData.data?.phone_number);
					throw new Error('Agent phone number not found');
				}

				agentNumber = agentData.data.phone_number;
			}

			// Format phone number
			const formattedNumber = phoneNumber.startsWith('+')
				? phoneNumber
				: `${phoneNumber.replace(/\D/g, '')}`;

			// Lookup lead information if leadId is provided or if we need to find it
			let leadInfo = null;
			if (leadId) {
				// Get lead info by ID
				const { data: lead, error: leadError } = await supabase
					.from('leads')
					.select('id, name, phone')
					.eq('id', leadId)
					.eq('organization_id', userOrg.organization_id)
					.single();

				if (!leadError && lead) {
					leadInfo = lead;
					console.log('Found lead by ID:', lead);
				}
			} else {
				// Try to find lead by phone number
				const normalizedPhone = formattedNumber.replace(/\D/g, '');
				const phoneVariations = [
					normalizedPhone,
					`+1${normalizedPhone}`,
					`+${normalizedPhone}`,
					normalizedPhone.slice(1),
				];

				const { data: lead, error: leadError } = await supabase
					.from('leads')
					.select('id, name, phone')
					.eq('organization_id', userOrg.organization_id)
					.or(phoneVariations.map(phone => `phone.eq.${phone}`).join(','))
					.single();

				if (!leadError && lead) {
					leadInfo = lead;
					console.log('Found lead by phone number:', lead);
				}
			}

			// Return complete call context
			const callContext = {
				user,
				organizationId: userOrg.organization_id,
				agentNumber,
				formattedNumber,
				contactName: contactName || leadInfo?.name || formattedNumber,
				leadId: leadInfo?.id || leadId || null,
				leadInfo
			};

			console.log('Call context collected:', callContext);
			return callContext;

		} catch (error) {
			console.error('Error collecting call context:', error);
			throw error;
		}
	};

	const makeCall = useCallback(
		async (phoneNumber: string, contactName?: string, leadId?: string) => {
			if (!device) return;

			// ✅ Use the SDK state, not your string
			if (device.state !== 'registered') {
				setStatus('Registering…');
				const ok = await waitForRegistered(device, 4000);
				if (!ok) {
					setStatus('Device not ready. Please wait…');
					return;
				}
			}

			setIsConnecting(true);
			setStatus('Calling…');
			setRemoteNumber(phoneNumber);
			setRemoteName(contactName || phoneNumber);

			// Collect all call context information
			let callContext;
			try {
				callContext = await collectCallContext(phoneNumber, contactName, leadId);
			} catch (error) {
				setStatus('Failed to prepare call');
				setIsConnecting(false);
				return;
			}

			try {
				const c = await device.connect({ 
					params: { 
						To: callContext.formattedNumber, 
						From: callContext.agentNumber 
					} 
				});
				connRef.current = c;

				console.log('Call object:', c);

				// Store complete call context on the call object for reference
				(c as any).callContext = callContext;

				console.log('Call object created:', c);

				// Create call history record when call starts ringing (for all calls)
				c.on('ringing', async () => {
					console.log('[WebRTC] Call is ringing');
					const callContext = (c as any).callContext;
					if (callContext && !(c as any).callRecordCreated) {
						await createCallHistoryRecord(c, callContext);
						(c as any).callRecordCreated = true; // Prevent duplicate creation
					}
				});

				c.on('accept', async () => {
					console.log('[WebRTC] Call accepted, capturing media stream');
					setStatus('On call');
					setIsConnecting(false);
					setIsConnected(true);
					setCurrentCall({
						contactName: contactName || phoneNumber,
						status: 'connected'
					});
					
					// Capture the media stream for cleanup when call ends
					if (c.getLocalStream) {
						const localStream = c.getLocalStream();
						if (localStream) {
							mediaStreamRef.current = localStream;
						}
					}

					// Call history record already created in 'ringing' event
				});

				c.on('disconnect', () => {
					// Call history will be updated by backend webhook
					endCall();
				});

				c.on('error', async (e: { message: string }) => {
					setStatus('Call error: ' + e.message);
					setIsConnecting(false);
					
					// Create call history record if not already created (for failed calls)
					const callContext = (c as any).callContext;
					if (callContext && !(c as any).callRecordCreated) {
						await createCallHistoryRecord(c, callContext);
						(c as any).callRecordCreated = true;
					}
				});
			} catch {
				setStatus('Call failed');
				setIsConnecting(false);
			}
		},
		[device, callDuration]
	);

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

	const toggleMute = useCallback(() => {
		if (connRef.current) {
			const newMuteState = !isMuted;
			connRef.current.mute(newMuteState);
			setIsMuted(newMuteState);
		}
	}, [isMuted]);

	const toggleSpeaker = useCallback(() => {
		setIsSpeakerOn((prev) => !prev);
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
			const audioInputs = devices.filter((device) => device.kind === 'audioinput');
			const audioOutputs = devices.filter((device) => device.kind === 'audiooutput');

			setAudioDevices([...audioInputs, ...audioOutputs]);

			if (!selectedAudioDevice && audioInputs.length > 0) {
				setSelectedAudioDevice(audioInputs[0].deviceId);
			}
			if (!selectedSpeakerDevice && audioOutputs.length > 0) {
				setSelectedSpeakerDevice(audioOutputs[0].deviceId);
			}
		} catch {
			// Silent error handling
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
		deviceStatus: status
	};

	return <WebRTCCallContext.Provider value={contextValue}>{children}</WebRTCCallContext.Provider>;
};
