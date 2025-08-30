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
						setIsRinging(false);
						setIsConnected(true);
						setIsConnecting(false);
						setCurrentCall({
							contactName: connection.parameters.From || 'Unknown',
							status: 'connected'
						});
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

	const makeCall = useCallback(
		async (phoneNumber: string, contactName?: string) => {
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

			// Ensure phone number is properly formatted (E.164)
			const formattedNumber = phoneNumber.startsWith('+')
				? phoneNumber
				: `${phoneNumber.replace(/\D/g, '')}`;

			let agentNumber;

			if (import.meta.env.VITE_NODE_ENV === 'development') {
				agentNumber = import.meta.env.VITE_TWILIO_PHONE_NUMBER;
			} else {
				const {
					data: { user }
				} = await supabase.auth.getUser();
				if (!user) {
					console.error('[voice] user not found');
					setStatus('Unauthorized');
					return;
				}

				const agentData = await supabase
					.from('agent_phone_numbers')
					.select('phone_number')
					.eq('agent_id', user.id)
					.eq('is_active', true)
					.single();

				if (agentData.error || !agentData.data?.phone_number) {
					console.error('[voice] agentNumber:', agentData.error, agentData.data?.phone_number);
					setStatus('Unauthorized to use this phone number');
					return;
				}

				agentNumber = agentData.data.phone_number;
			}

			try {
				const c = await device.connect({ params: { To: formattedNumber, From: agentNumber } });
				connRef.current = c;

				console.log('c', c);

				c.on('accept', () => {
					setStatus('On call');
					setIsConnecting(false);
					setIsConnected(true);
					setCurrentCall({
						contactName: contactName || phoneNumber,
						status: 'connected'
					});
				});

				c.on('disconnect', () => {
					endCall();
				});

				c.on('error', (e: { message: string }) => {
					setStatus('Call error: ' + e.message);
					setIsConnecting(false);
				});
			} catch {
				setStatus('Call failed');
				setIsConnecting(false);
			}
		},
		[device]
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
