import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Device, Call } from '@twilio/voice-sdk';
import { WebRTCCallContext } from '../contexts/WebRTCCallContext';
import { supabase } from '../utils/supabaseClient';
import { NOTIFICATION_HELP_EVENT } from '../constants/events';

interface WebRTCCallProviderProps {
	children: React.ReactNode;
}

interface OutboundCallContext {
	user: { id: string };
	organizationId: string;
	agentNumber: string;
	formattedNumber: string;
	contactName: string;
	leadId: string | null;
	leadInfo?: { id: string; name: string; phone?: string } | null;
}

const callMeta = new WeakMap<
	Call,
	{ context: OutboundCallContext; callRecordCreated?: boolean; callRecordId?: string }
>();

const waitForRegistered = (d: Device, ms = 3000) =>
	new Promise<boolean>((resolve) => {
		if (d.state === 'registered') return resolve(true);
		const onReg = () => {
			// Remove handler after firing once
			d.off('registered', onReg as unknown as (...args: unknown[]) => void);
			resolve(true);
		};
		d.on('registered', onReg as unknown as (arg0?: unknown) => void);
		setTimeout(() => {
			d.off('registered', onReg as unknown as (arg0?: unknown) => void);
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
	const [notificationsEnabled, setNotificationsEnabled] = useState(false);
	const [isIncomingCall, setIsIncomingCall] = useState(false);

	const connRef = useRef<Call | null>(null);
	const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const mediaStreamRef = useRef<MediaStream | null>(null);
	const endCallRef = useRef<() => void>(() => {});
	const deviceInitRef = useRef<boolean>(false);
	const ringtoneRef = useRef<HTMLAudioElement | null>(null);
	const incomingNotificationRef = useRef<Notification | null>(null);

	// Keep a stable reference to endCall for event handlers created once
	useEffect(() => {
		// endCall will be assigned after its declaration; leave as is here
	}, []);

	// Helper function to create call history record with complete context
	const createCallHistoryRecord = async (call: Call, callContext: OutboundCallContext) => {
		console.log('history', call.parameters, call);
		try {
			// Get the actual Twilio Call SID
			const providedSid = (call as unknown as { parameters?: Record<string, string> }).parameters
				?.CallSid;
			const twilioCallSid =
				providedSid ?? `TEMP-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

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
				// Store the call record ID for reference in our metadata map
				const meta = callMeta.get(call) || { context: callContext };
				meta.callRecordId = callRecord.id;
				callMeta.set(call, meta);
			}
		} catch (error) {
			console.error('Failed to create call history record:', error);
		}
	};

	const stopIncomingAlerts = useCallback(() => {
		const audio = ringtoneRef.current;
		if (audio) {
			audio.pause();
			audio.currentTime = 0;
		}
		if (incomingNotificationRef.current) {
			incomingNotificationRef.current.close();
			incomingNotificationRef.current = null;
		}
		setRemoteNumber('');
		setRemoteName('');
	}, []);

	const endCall = useCallback(() => {
		console.log('[WebRTC] Ending call, cleaning up media streams');

		// Stop all media tracks (microphone, camera, etc.)
		if (mediaStreamRef.current) {
			mediaStreamRef.current.getTracks().forEach((track) => {
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
		setIsIncomingCall(false);
		setIsOnHold(false);
		setCurrentCall(null);
		setRemoteNumber('');
		setRemoteName('');
		setCallDuration(0);
		setStatus('Ready');
		stopIncomingAlerts();
	}, [device, stopIncomingAlerts]);

	// Keep a stable reference to endCall for event handlers created once
	useEffect(() => {
		endCallRef.current = endCall;
	}, [endCall]);

	// Initialize Twilio Device (guarded to run once per mount)
	useEffect(() => {
		if (deviceInitRef.current) {
			return;
		}
		deviceInitRef.current = true;
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
					const fromNumber = connection.parameters.From || 'Unknown';
					setIsRinging(true);
					setRemoteNumber(fromNumber);
					setRemoteName(fromNumber);
					setIsIncomingCall(true);
					playRingtone();
					notifyIncomingCall(fromNumber);
					connRef.current = connection;

					connection.on('accept', () => {
						console.log('[WebRTC] Incoming call accepted, capturing media stream');
						setIsRinging(false);
						setIsConnected(true);
						setIsConnecting(false);
						setIsIncomingCall(false);
						stopIncomingAlerts();
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

					connection.on('cancel', () => {
						stopIncomingAlerts();
						setIsIncomingCall(false);
						setIsRinging(false);
					});

					connection.on('disconnect', async () => {
						stopIncomingAlerts();
						setIsIncomingCall(false);
						await device?.audio?.unsetInputDevice();
						endCallRef.current();
					});

					connection.on('error', (e: { message: string }) => {
						console.error('Call error:', e.message);
						setStatus('Error');
						setIsIncomingCall(false);
						stopIncomingAlerts();
						endCallRef.current();
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
					d.on(evt as unknown as Parameters<Device['on']>[0], (...args: unknown[]) =>
						console.log(`[voice] ${evt}`, ...args)
					)
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
	}, [endCall]);

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
				mediaStreamRef.current.getTracks().forEach((track) => {
					console.log('[WebRTC] Stopping media track on unmount:', track.kind);
					track.stop();
				});
				mediaStreamRef.current = null;
			}
		};
	}, []);

	useEffect(() => {
		if (typeof window === 'undefined') {
			return;
		}

		const audio = new Audio('/audio/incoming-call.mp3');
		audio.loop = true;
		audio.preload = 'auto';
		audio.volume = 0.6;
		ringtoneRef.current = audio;

		return () => {
			audio.pause();
			ringtoneRef.current = null;
		};
	}, []);

	useEffect(() => {
		if (typeof window === 'undefined' || typeof Notification === 'undefined') {
			setNotificationsEnabled(false);
			return;
		}

		const updatePermissionState = () => {
			setNotificationsEnabled(Notification.permission === 'granted');
		};

		updatePermissionState();

		document.addEventListener('visibilitychange', updatePermissionState);

		return () => {
			document.removeEventListener('visibilitychange', updatePermissionState);
		};
	}, []);

	const requestNotificationPermission = useCallback(async () => {
		if (typeof window === 'undefined' || typeof Notification === 'undefined') {
			console.warn('Notifications are not supported in this environment.');
			return false;
		}

		if (Notification.permission === 'granted') {
			setNotificationsEnabled(true);
			return true;
		}

		if (Notification.permission === 'denied') {
			setNotificationsEnabled(false);
			return false;
		}

		try {
			const permission = await Notification.requestPermission();
			const granted = permission === 'granted';
			setNotificationsEnabled(granted);
			return granted;
		} catch (error) {
			console.error('Failed to request notification permission:', error);
			const granted = typeof Notification !== 'undefined' && Notification.permission === 'granted';
			setNotificationsEnabled(granted);
			return granted;
		}
	}, []);

	const showNotificationPrompt = useCallback(() => {
		if (typeof window === 'undefined') return;
		try {
			window.dispatchEvent(new Event(NOTIFICATION_HELP_EVENT));
		} catch (error) {
			console.error('Failed to dispatch notification help event:', error);
		}
	}, []);

	const playRingtone = useCallback(() => {
		const audio = ringtoneRef.current;
		if (!audio) return;
		try {
			audio.currentTime = 0;
			const playPromise = audio.play();
			if (playPromise) {
				playPromise.catch((error) => {
					console.warn('Unable to play incoming call ringtone:', error);
				});
			}
		} catch (error) {
			console.warn('Unable to start incoming call ringtone:', error);
		}
	}, []);

	const notifyIncomingCall = useCallback(
		(from: string | undefined) => {
			if (typeof window === 'undefined' || typeof Notification === 'undefined') {
				return;
			}

			const caller = from || 'Unknown Caller';

			if (Notification.permission === 'granted') {
				try {
					const notification = new Notification('Incoming Call', {
						body: `Call from ${caller}`,
						icon: '/images/logos/logo.svg',
						tag: 'paperboat-incoming-call',
						renotify: true,
						requireInteraction: true,
						silent: true
					});

					notification.onclick = () => {
						window.focus();
						notification.close();
					};

					incomingNotificationRef.current = notification;
				} catch (error) {
					console.error('Failed to show incoming call notification:', error);
				}
			} else if (Notification.permission === 'default') {
				showNotificationPrompt();
			}
		},
		[showNotificationPrompt]
	);

	// Call context manager to collect all necessary information
	const collectCallContext = async (phoneNumber: string, contactName?: string, leadId?: string) => {
		try {
			// Get current user and organization
			const {
				data: { user }
			} = await supabase.auth.getUser();
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

			// Get agent phone number (always from backend; no env fallback)
			let rawAgentNumber: string | null = null;
			console.log('userOrg', userOrg);
			console.log('user', user.id);
			const { data: seat, error: seatErr } = await supabase
				.from('seats')
				.select('id')
				.eq('org_id', userOrg.organization_id)
				.eq('user_id', user.id)
				.eq('status', 'active')
				.limit(1)
				.single();

			if (!seat) {
				console.error('[voice] no seat found for user id');
				throw new Error('Agent seat number not found');
			}

			// 1) Preferred: phone_numbers assigned to this profile via seat_id
			const { data: assignedPhone, error: assignedErr } = await supabase
				.from('phone_numbers')
				.select('phone_number')
				.eq('org_id', userOrg.organization_id)
				.eq('seat_id', seat.id)
				.eq('status', 'assigned')
				.order('created_at', { ascending: false })
				.limit(1)
				.single();
			if (!assignedErr && assignedPhone?.phone_number) {
				rawAgentNumber = assignedPhone.phone_number;
			}

			console.log('assignedPhone', assignedPhone);
			console.log('assignedErr', assignedErr);
			console.log(rawAgentNumber);

			// 2) Fallback: seats.phone_e164 for this user
			if (!rawAgentNumber) {
				const { data: seat, error: seatError } = await supabase
					.from('seats')
					.select('phone_e164')
					.eq('org_id', userOrg.organization_id)
					.eq('user_id', user.id)
					.eq('status', 'active')
					.order('created_at', { ascending: false })
					.limit(1)
					.single();
				if (!seatError && seat?.phone_e164) {
					rawAgentNumber = seat.phone_e164;
				}
			}

			if (!rawAgentNumber) {
				console.error('[voice] agentNumber not found phone_numbers or seats');
				throw new Error('Agent phone number not found');
			}

			// Normalize to E.164 (+countrycode + number). Default to US if no leading country code.
			const agentDigitsOnly = rawAgentNumber.replace(/\D/g, '');
			const normalizedAgentNumber = rawAgentNumber.startsWith('+')
				? rawAgentNumber
				: agentDigitsOnly.startsWith('1')
					? `+${agentDigitsOnly}`
					: `+1${agentDigitsOnly}`;
			const agentNumber = normalizedAgentNumber;

			// Normalize destination phone number to E.164
			const destDigitsOnly = phoneNumber.replace(/\D/g, '');
			const formattedNumber = phoneNumber.startsWith('+')
				? phoneNumber
				: destDigitsOnly.startsWith('1')
					? `+${destDigitsOnly}`
					: `+1${destDigitsOnly}`;

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
					normalizedPhone.slice(1)
				];

				const { data: lead, error: leadError } = await supabase
					.from('leads')
					.select('id, name, phone')
					.eq('organization_id', userOrg.organization_id)
					.or(phoneVariations.map((phone) => `phone.eq.${phone}`).join(','))
					.single();

				if (!leadError && lead) {
					leadInfo = lead;
					console.log('Found lead by phone number:', lead);
				}
			}

			// Return complete call context
			const callContext: OutboundCallContext = {
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

			console.log(
				'Making call to:',
				phoneNumber,
				'with contact name:',
				contactName,
				'and lead ID:',
				leadId
			);

			// Collect all call context information
			let callContext: OutboundCallContext;
			try {
				callContext = await collectCallContext(phoneNumber, contactName, leadId);
			} catch (error) {
				console.error('Error collecting call context:', error);
				setStatus('Failed to prepare call');
				setIsConnecting(false);
				return;
			}

			console.log('Call context:', callContext);

			try {
				const c = await device.connect({
					params: {
						To: callContext.formattedNumber,
						From: callContext.agentNumber
					}
				});
				connRef.current = c;

				console.log('Call object:', c);

				// Store call context in metadata map
				callMeta.set(c, { context: callContext });

				console.log('Call object created:', c);

				// Create call history record when call starts ringing (for all calls)
				c.on('ringing', async () => {
					console.log('[WebRTC] Call is ringing');
					const meta = callMeta.get(c);
					if (meta && !meta.callRecordCreated) {
						await createCallHistoryRecord(c, meta.context);
						meta.callRecordCreated = true; // Prevent duplicate creation
						callMeta.set(c, meta);
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

				c.on('disconnect', async () => {
					await device?.audio?.unsetInputDevice();
					// Call history will be updated by backend webhook
					endCall();
				});

				c.on('error', async (e: { message: string }) => {
					setStatus('Call error: ' + e.message);
					setIsConnecting(false);

					// Create call history record if not already created (for failed calls)
					const meta = callMeta.get(c);
					if (meta && !meta.callRecordCreated) {
						await createCallHistoryRecord(c, meta.context);
						meta.callRecordCreated = true;
						callMeta.set(c, meta);
					}
				});
			} catch {
				setStatus('Call failed');
				setIsConnecting(false);
			}
		},
		[device, endCall]
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
		setIsIncomingCall(false);
		stopIncomingAlerts();
	}, [stopIncomingAlerts]);

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
		isIncomingCall,
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

		// Notification state
		notificationsEnabled,
		requestNotificationPermission,
		showNotificationPrompt
	};

	return <WebRTCCallContext.Provider value={contextValue}>{children}</WebRTCCallContext.Provider>;
};
