import React, { useState, useEffect } from 'react';
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
  Expand
} from 'lucide-react';

export const ActiveCallBar: React.FC = () => {
	const { user } = useAuth();
	const {
		currentCall: activeCall,
		isMuted,
		isSpeakerOn,
		callDuration,
		deviceStatus,
		remoteNumber,
		remoteName,
		toggleMute,
		toggleSpeaker,
		endCall,
		makeCall: initiateCall,
	} = useWebRTCCall();

	// Don't show dial pad if user has no organization
	if (!user?.organization_id) {
		return null;
	}

	const [isMinimized, setIsMinimized] = useState(false);
	const [showDialPad, setShowDialPad] = useState(false);
	const [dialedNumber, setDialedNumber] = useState('');
	const [isDialing, setIsDialing] = useState(false);

	// Function to lookup lead by phone number
	const lookupLeadByPhone = async (phoneNumber: string) => {
		try {
			// Get current user's organization
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) return null;

			const { data: userOrg } = await supabase
				.from('user_organizations')
				.select('organization_id')
				.eq('user_id', user.id)
				.single();

			if (!userOrg) return null;

			// Normalize phone number for lookup (remove all non-digits)
			const normalizedPhone = phoneNumber.replace(/\D/g, '');
			
			// Try different phone number formats
			const phoneVariations = [
				normalizedPhone, // Raw digits
				`+1${normalizedPhone}`, // +1 prefix
				`+${normalizedPhone}`, // + prefix
				normalizedPhone.slice(1), // Remove leading 1
			];

			// Look for lead with matching phone number
			const { data: lead, error } = await supabase
				.from('leads')
				.select('id, name, phone')
				.eq('organization_id', userOrg.organization_id)
				.or(phoneVariations.map(phone => `phone.eq.${phone}`).join(','))
				.single();

			if (error || !lead) {
				console.log('No lead found for phone number:', phoneNumber);
				return null;
			}

			console.log('Found lead for phone number:', { phoneNumber, lead });
			return lead;
		} catch (error) {
			console.error('Error looking up lead by phone:', error);
			return null;
		}
	};

	// Auto-close dial pad when a call becomes active (not just calling)
	useEffect(() => {
		if (activeCall && activeCall.status === 'connected' && showDialPad) {
			setShowDialPad(false);
		}
	}, [activeCall, showDialPad]);

	// Auto-open dial pad when a call is initiated (calling state)
	useEffect(() => {
		if (deviceStatus === 'Calling…' && !showDialPad) {
			setShowDialPad(true);
		}
	}, [deviceStatus, showDialPad]);

	// Pre-populate dial pad with remote number when call is initiated
	useEffect(() => {
		if (deviceStatus === 'Calling…' && remoteNumber && !dialedNumber) {
			setDialedNumber(remoteNumber);
		}
	}, [deviceStatus, remoteNumber, dialedNumber]);

	const formatDuration = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	};

	const isPhoneNumber = (text: string): boolean => {
		return /^[+\-\s()\d]+$/.test(text);
	};

	const formatPhoneNumber = (number: string) => {
		// Remove all non-digits
		const cleaned = number.replace(/\D/g, '');

		// If it's a US number (10 digits), format as (XXX) XXX-XXXX
		if (cleaned.length === 10) {
			return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
		}

		// If it's a US number with country code (11 digits starting with 1), format as +1 (XXX) XXX-XXXX
		if (cleaned.length === 11 && cleaned.startsWith('1')) {
			return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
		}

		// If it's longer than 11 digits, assume international and add +
		if (cleaned.length > 11) {
			return `+${cleaned}`;
		}

		// For shorter numbers, just return as is
		return cleaned;
	};

	const handleDialPadClick = (digit: string) => {
		if (digit === 'delete') {
			setDialedNumber((prev) => {
				const cleaned = prev.replace(/\D/g, '');
				const newCleaned = cleaned.slice(0, -1);
				return formatPhoneNumber(newCleaned);
			});
		} else if (digit === 'clear') {
			setDialedNumber('');
		} else {
			setDialedNumber((prev) => {
				const cleaned = prev.replace(/\D/g, '');
				const newCleaned = cleaned + digit;
				return formatPhoneNumber(newCleaned);
			});
		}
	};

	const handleMakeCall = async () => {
		if (!dialedNumber) return;

		setIsDialing(true);

		try {
			// Clean the number for the actual call (remove formatting)
			const cleanedNumber = dialedNumber.replace(/\D/g, '');

			// Add +1 if it's a 10-digit US number
			const callNumber = cleanedNumber.length === 10 ? `+1${cleanedNumber}` : cleanedNumber;

			// Lookup lead by phone number
			const lead = await lookupLeadByPhone(callNumber);
			
			// Make the call with lead information if found
			if (lead) {
				console.log('Making call to lead:', lead.name, 'with ID:', lead.id);
				await initiateCall(callNumber, lead.name, lead.id);
			} else {
				console.log('Making call to unknown number:', callNumber);
				await initiateCall(callNumber, callNumber);
			}

			setDialedNumber('');
			// Keep dial pad open during calling state, it will close when call becomes active
		} catch (error) {
			console.error('Error making call:', error);
		} finally {
			setIsDialing(false);
		}
	};

	const toggleDialPad = () => {
		setShowDialPad(!showDialPad);
		if (!showDialPad) {
			setDialedNumber('');
		}
	};

	// Show loading state only when device is initializing or when a call is processing
	if (deviceStatus === 'Loading…' || deviceStatus === 'Registering…' || deviceStatus === 'Unauthorized') {
		return (
			<div className="fixed right-4 bottom-4 z-50">
				<div className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg">
					<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
				</div>
			</div>
		);
	}

	// Show error state if device has an error
	if (deviceStatus === 'Error' || deviceStatus === 'Failed to initialize') {
		return (
			<div className="fixed right-4 bottom-4 z-50">
				<div className="rounded-full border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800">
					<div className="flex items-center space-x-3">
						<div className="bg-brand-500 flex h-10 w-10 items-center justify-center rounded-full font-medium text-white">
							<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
								<path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
							</svg>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Show call status indicator for active call states
	if (deviceStatus === 'Calling…' || deviceStatus === 'Ringing...' || deviceStatus === 'On call' || deviceStatus === 'Connected') {
		// Keep dial pad open to show call progress
		// The call interface will be shown below
	}

	// If there's an active call and it's minimized
	if (activeCall && isMinimized) {
		return (
			<div className="fixed right-4 bottom-4 z-50">
				<div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800">
					<div className="flex items-center space-x-3">
						<div className="bg-brand-500 flex h-10 w-10 items-center justify-center rounded-full font-medium text-white">
							{isPhoneNumber(activeCall.contactName) ? (
								<User className="size-4 text-white" />
							) : (
								<span className="text-brand-500 text-sm font-medium">
									{activeCall.contactName.charAt(0)}
								</span>
							)}
						</div>
						<div className="text-sm">
							<p className="font-medium text-gray-900 dark:text-white">{activeCall.contactName}</p>
							<p className="text-xs text-gray-500 dark:text-gray-400">
								{activeCall.status === 'connected' ? formatDuration(callDuration) : 'Connecting...'}
							</p>
						</div>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setIsMinimized(false)}
							className="h-8 w-8 p-1"
							tooltip="Expand call bar"
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
				// Dial Pad Widget (when no active call)
				<div
					className={`border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 ${
						showDialPad ? 'w-80 rounded-xl' : 'w-fit rounded-full'
					}`}
				>
					{showDialPad ? (
						<>
							{/* Dial Pad Header */}
							<div className="bg-gradient-to-r from-red-400 via-red-500 to-pink-500 text-white flex items-center justify-between rounded-t-lg p-3">
								<div className="flex flex-col">
									<span className="text-sm font-medium text-white">
										{deviceStatus === 'Calling…' ? 'Calling...' : 'Dial Pad'}
									</span>
									{deviceStatus === 'Calling…' && remoteNumber && (
										<div className="flex items-center space-x-2 mt-1">
											<div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
												<User className="w-3 h-3 text-red-500" />
											</div>
											<span className="text-xs text-red-100 opacity-90">
												{remoteName || remoteNumber}
											</span>
										</div>
									)}
									{deviceStatus !== 'Ready' && deviceStatus !== 'Calling…' && (
										<span className="text-xs text-red-100 opacity-80">{deviceStatus}</span>
									)}
								</div>
								<Button
									variant="ghost"
									size="sm"
									onClick={toggleDialPad}
									className="hover:bg-brand-600 h-6 w-6 p-1 text-white"
									tooltip="Close dial pad"
									tooltipPosition="top"
								>
									<X className="h-4 w-4" />
								</Button>
							</div>

							{/* Phone Number Input */}
							<div className="px-2 pt-2">
								{deviceStatus === 'Calling…' ? (
									<div className="h-12 flex items-center justify-center rounded-lg">
										<div className="flex items-center space-x-2">
											<div className="animate-pulse w-2 h-2 bg-red-500 rounded-full"></div>
											<span className="text-sm text-gray-600 dark:text-gray-300">Calling...</span>
											<div className="animate-pulse w-2 h-2 bg-red-500 rounded-full"></div>
										</div>
									</div>
								) : (
									<div className="relative">
										<Input
											type="tel"
											value={dialedNumber}
											onChange={(e) => {
												const input = e.target.value;
												// Only format if the input is getting longer (user is typing)
												if (input.length > dialedNumber.length) {
													setDialedNumber(formatPhoneNumber(input));
												} else {
													// If deleting, just set the raw input
													setDialedNumber(input);
												}
											}}
											placeholder="Enter phone number"
											className="h-12 text-center font-mono text-sm"
										/>
										{dialedNumber && (
											<button
												onClick={() => setDialedNumber('')}
												className="absolute top-1/2 right-3 -translate-y-1/2 transform text-gray-400 hover:text-gray-600"
											>
												×
											</button>
										)}
									</div>
								)}
							</div>

							{/* Dial Pad Grid */}
							<div className="flex flex-col items-center p-6">
								<div className="mb-6 grid grid-cols-3 gap-4">
									{['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
										<Button
											key={digit}
											variant="outline"
											size="lg"
											onClick={() => handleDialPadClick(digit)}
											className="size-10 rounded-full font-mono text-lg"
											tooltip={`Press ${digit}`}
											tooltipPosition="top"
										>
											{digit}
										</Button>
									))}
								</div>

								{/* Call/Cancel Button */}
								{deviceStatus === 'Calling…' ? (
									<Button
										onClick={endCall}
										className="mx-auto size-12 rounded-full bg-red-600 text-lg font-medium hover:bg-red-700"
										tooltip="Cancel call"
										tooltipPosition="top"
									>
										<PhoneOff className="size-6" />
									</Button>
								) : (
									<Button
										onClick={handleMakeCall}
										disabled={!dialedNumber || isDialing}
										className="mx-auto size-12 rounded-full bg-green-700 text-lg font-medium hover:bg-green-700 disabled:opacity-50"
										tooltip={
											isDialing 
												? 'Looking up contact...' 
												: dialedNumber 
													? `Call ${dialedNumber}` 
													: 'Enter a phone number'
										}
										tooltipPosition="top"
									>
										{isDialing ? (
											<div className="size-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
										) : (
											<Phone className="size-6" />
										)}
									</Button>
								)}
							</div>

							{/* Call Progress Indicator */}
							{deviceStatus === 'Calling…' && (
								<div className="px-6 pb-4">
									<div className="flex items-center justify-center space-x-2">
										<div className="w-2 h-2 bg-red-500 rounded-full animate-bounce"></div>
										<div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
										<div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
									</div>
								</div>
							)}
						</>
					) : (
						// Phone Icon Button (when dial pad is closed)
						<div className="p-2">
							<Button
								onClick={toggleDialPad}
								className="bg-gradient-to-r from-red-400 via-red-500 to-pink-500 text-white rounded-full size-12 relative"
								tooltip="Open dial pad"
								tooltipPosition="top"
							>
								<Phone className="size-4" />
								{deviceStatus !== 'Ready' && (
									<div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white"></div>
								)}
							</Button>
						</div>
					)}
				</div>
			) : (
				// Active Call Interface (when there is an active call)
				<div className="w-80 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
					{/* Header - Red Bar */}
					<div className="bg-gradient-to-r from-red-400 via-red-500 to-pink-500 rounded-t-lg p-3">
						<div className="mb-3 flex items-center justify-between">
							<span className="font-mono text-sm text-white">
								{activeCall.status === 'connected' ? formatDuration(callDuration) : '00:00'}
							</span>
							{deviceStatus !== 'On call' && deviceStatus !== 'Ready' && (
								<span className="text-xs text-red-100 opacity-80">{deviceStatus}</span>
							)}
						</div>

						<div className="flex w-full items-center justify-between">
							<div className="flex items-center space-x-3">
								<div className="flex h-8 w-8 items-center justify-center rounded-full bg-white">
									{isPhoneNumber(activeCall.contactName) ? (
										<User className="text-brand-500 size-4" />
									) : (
										<span className="text-brand-500 text-sm font-medium">
											{activeCall.contactName.charAt(0)}
										</span>
									)}
								</div>
								<span className="font-medium text-white">{activeCall.contactName}</span>
							</div>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setIsMinimized(true)}
								className="hover:bg-brand-600 h-6 w-6 p-1 text-white"
								tooltip="Minimize call bar"
								tooltipPosition="top"
							>
								<Minimize2 className="h-4 w-4" />
							</Button>
						</div>
					</div>

					{/* Voice Activity Indicator */}
					<div className="px-3 py-2">
						<div className="h-1 w-full rounded-full bg-gray-200 dark:bg-gray-600">
							<div className="h-1 w-1/3 rounded-full bg-gray-400 dark:bg-gray-400"></div>
						</div>
					</div>

					{/* Call Controls Grid */}
					<div className="p-4">
						<div className="grid grid-cols-3 gap-3">
							{/* Mute Button */}
							<Button
								variant={isMuted ? 'destructive' : 'outline'}
								size="sm"
								onClick={toggleMute}
								className="flex w-full flex-col items-center justify-center space-y-1"
								tooltip={isMuted ? 'Unmute' : 'Mute'}
								tooltipPosition="top"
							>
								{isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
							</Button>

							{/* Speaker Button */}
							<Button
								variant={isSpeakerOn ? 'default' : 'outline'}
								size="sm"
								onClick={toggleSpeaker}
								className="flex w-full flex-col items-center justify-center space-y-1"
								tooltip={isSpeakerOn ? 'Disable speaker mode' : 'Enable speaker mode'}
								tooltipPosition="top"
							>
								{isSpeakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
							</Button>

							{/* End Call Button */}
							<Button
								variant="destructive"
								size="sm"
								onClick={endCall}
								className="flex w-full flex-col items-center justify-center space-y-1"
								tooltip="End call"
								tooltipPosition="top"
							>
								<PhoneOff className="h-5 w-5" />
							</Button>
						</div>
					</div>

					{/* End Call Button */}
					<div className="flex justify-center p-4">
						<Button
							variant="destructive"
							size="lg"
							onClick={endCall}
							className="h-14 w-14 rounded-full p-0"
							tooltip="End call"
							tooltipPosition="top"
						>
							<PhoneOff className="h-6 w-6" />
						</Button>
					</div>
				</div>
			)}
		</div>
	);
};
