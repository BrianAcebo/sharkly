import React, { useState } from 'react';
import { useWebRTCCall } from '../../contexts/WebRTCCallContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
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

const ActiveCallBar: React.FC = () => {
	const {
		currentCall: activeCall,
		isMuted,
		isSpeakerOn,
		callDuration,
		toggleMute,
		toggleSpeaker,
		endCall,
		makeCall: initiateCall
	} = useWebRTCCall();

	const [isMinimized, setIsMinimized] = useState(false);
	const [showDialPad, setShowDialPad] = useState(false);
	const [dialedNumber, setDialedNumber] = useState('');

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

	

	const handleMakeCall = () => {
		if (!dialedNumber) return;

		// Clean the number for the actual call (remove formatting)
		const cleanedNumber = dialedNumber.replace(/\D/g, '');

		// Add +1 if it's a 10-digit US number
		const callNumber = cleanedNumber.length === 10 ? `+1${cleanedNumber}` : cleanedNumber;

		initiateCall(callNumber, dialedNumber);
		setDialedNumber('');
		setShowDialPad(false);
	};

	const toggleDialPad = () => {
		setShowDialPad(!showDialPad);
		if (!showDialPad) {
			setDialedNumber('');
		}
	};

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
								<span className="text-sm font-medium text-white">Dial Pad</span>
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

								{/* Call Button */}
								<Button
									onClick={handleMakeCall}
									disabled={!dialedNumber}
									className="mx-auto size-12 rounded-full bg-green-700 text-lg font-medium hover:bg-green-700"
									tooltip={dialedNumber ? `Call ${dialedNumber}` : 'Enter a phone number'}
									tooltipPosition="top"
								>
									<Phone className="size-6" />
								</Button>
							</div>
						</>
					) : (
						// Phone Icon Button (when dial pad is closed)
						<div className="p-2">
							<Button
								onClick={toggleDialPad}
								className="bg-gradient-to-r from-red-400 via-red-500 to-pink-500 text-white rounded-full size-12"
								tooltip="Open dial pad"
								tooltipPosition="top"
							>
								<Phone className="size-4" />
							</Button>
						</div>
					)}
				</div>
			) : (
				// Active Call Interface (when there is an active call)
				<div className="w-80 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
					{/* Header - Red Bar */}
					<div className="bg-gradient-to-r from-red-400 via-red-500 to-pink-500 rounded-t-lg p-3">
						<span className="mb-3 block font-mono text-sm text-white">
							{activeCall.status === 'connected' ? formatDuration(callDuration) : '00:00'}
						</span>

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

export default ActiveCallBar;
