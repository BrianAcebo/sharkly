import React, { useEffect, useState } from 'react';
import {
	Phone,
	User,
	Clock,
	PhoneIncoming,
	PhoneOutgoing,
	PhoneMissed,
	Search,
	Building2,
	Mail,
	RefreshCw
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { supabase } from '../../utils/supabaseClient';
import { useWebRTCCall } from '../../hooks/useWebRTCCall';
import { toast } from 'sonner';

interface Lead {
	id: string;
	name: string;
	company?: string;
	phone: string | null;
	email?: string;
	created_at: string;
	updated_at: string;
}

interface CallHistoryEntry {
	id: string;
	twilio_call_sid: string;
	call_direction: 'inbound' | 'outbound';
	from_number: string;
	to_number: string;
	agent_id: string;
	organization_id: string;
	lead_id?: string;
	call_status:
		| 'initiated'
		| 'ringing'
		| 'answered'
		| 'completed'
		| 'busy'
		| 'no-answer'
		| 'failed'
		| 'canceled';
	call_duration: number;
	call_start_time: string;
	call_end_time?: string;
	call_quality_score?: number;
	recording_url?: string;
	call_notes?: string;
	call_tags?: string[];
	call_outcome?:
		| 'successful'
		| 'no-answer'
		| 'busy'
		| 'failed'
		| 'voicemail'
		| 'callback-requested'
		| 'not-interested';
	follow_up_required: boolean;
	follow_up_date?: string;
	follow_up_notes?: string;
	created_at: string;
	updated_at: string;
	// Joined lead data
	lead_name?: string;
	lead_company?: string;
}

const Calls: React.FC = () => {
	const [activeTab, setActiveTab] = useState<'leads' | 'history'>('leads');
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
	const [selectedCall, setSelectedCall] = useState<CallHistoryEntry | null>(null);
	const [leads, setLeads] = useState<Lead[]>([]);
	const [callHistory, setCallHistory] = useState<CallHistoryEntry[]>([]);
	const [isLoadingLeads, setIsLoadingLeads] = useState(true);
	const [isLoadingHistory, setIsLoadingHistory] = useState(true);
	const { makeCall, deviceStatus } = useWebRTCCall();

	useEffect(() => {
		fetchLeads();
		fetchCallHistory();

		// Set up real-time subscription for call history
		const setupRealtimeSubscription = async () => {
			const {
				data: { user }
			} = await supabase.auth.getUser();
			if (user) {
				console.log('Setting up real-time subscription for user:', user.id);

				const subscription = supabase
					.channel(`call_history_changes_${user.id}`)
					.on(
						'postgres_changes',
						{
							event: '*',
							schema: 'public',
							table: 'call_history',
							filter: `agent_id=eq.${user.id}`
						},
						(payload) => {
							console.log('Call history change received:', payload);
							// Refresh call history when changes occur
							fetchCallHistory();
						}
					)
					.subscribe((status) => {
						console.log('Subscription status:', status);
						if (status === 'SUBSCRIBED') {
							console.log('Successfully subscribed to call history changes');
						} else if (status === 'CHANNEL_ERROR') {
							console.error('Error subscribing to call history changes');
						}
					});

				// Also set up a general subscription without filter as backup
				const generalSubscription = supabase
					.channel(`call_history_general_${user.id}`)
					.on(
						'postgres_changes',
						{
							event: '*',
							schema: 'public',
							table: 'call_history'
						},
						(payload) => {
							console.log('General call history change received:', payload);
							// Check if this change is for the current user
							if ((payload.new as any)?.agent_id === user.id || (payload.old as any)?.agent_id === user.id) {
								console.log('Change is for current user, refreshing...');
								fetchCallHistory();
							}
						}
					)
					.subscribe((status) => {
						console.log('General subscription status:', status);
					});

				return () => {
					console.log('Unsubscribing from call history changes');
					subscription.unsubscribe();
					generalSubscription.unsubscribe();
				};
			}
		};

		let cleanup: (() => void) | undefined;
		setupRealtimeSubscription().then((cleanupFn) => {
			cleanup = cleanupFn;
		});

		return () => {
			if (cleanup) {
				cleanup();
			}
		};
	}, []);

	const fetchLeads = async () => {
		try {
			setIsLoadingLeads(true);
			const { data, error } = await supabase
				.from('leads')
				.select('id, name, company, phone, email, created_at, updated_at')
				.not('phone', 'is', null) // Only leads with phone numbers
				.order('name', { ascending: true });

			if (error) throw error;
			setLeads(data || []);
		} catch (error) {
			console.error('Error fetching leads:', error);
			toast.error('Failed to fetch leads');
		} finally {
			setIsLoadingLeads(false);
		}
	};

	const fetchCallHistory = async () => {
		try {
			console.log('Fetching call history...');
			setIsLoadingHistory(true);

			// Get current user
			const {
				data: { user }
			} = await supabase.auth.getUser();
			if (!user) {
				throw new Error('User not authenticated');
			}

			const { data, error } = await supabase
				.from('call_history')
				.select(
					`
					*,
					leads:lead_id (
						name,
						company
					)
				`
				)
				.eq('agent_id', user.id) // Only get calls for current user
				.order('call_start_time', { ascending: false })
				.limit(100);

			if (error) throw error;

			// Transform the data to include lead information
			const transformedData =
				data?.map((entry) => ({
					...entry,
					lead_name: entry.leads?.name,
					lead_company: entry.leads?.company
				})) || [];

			console.log('Call history fetched:', transformedData.length, 'records');
			setCallHistory(transformedData);
		} catch (error) {
			console.error('Error fetching call history:', error);
			toast.error('Failed to fetch call history');
		} finally {
			setIsLoadingHistory(false);
		}
	};

	const formatDuration = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	};

	const formatPhoneNumber = (phone: string | null) => {
		if (!phone) return 'No phone number';

		const cleaned = phone.replace(/\D/g, '');

		if (cleaned.length === 10) {
			return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
		}

		if (cleaned.length === 11 && cleaned.startsWith('1')) {
			return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
		}

		return phone;
	};

	const handleLeadCall = async (lead: Lead) => {
		if (!lead.phone) {
			toast.error('No phone number available for this lead');
			return;
		}

		try {
			// Format phone number to E.164
			const phoneNumber = lead.phone.startsWith('+')
				? lead.phone
				: `+1${lead.phone.replace(/\D/g, '')}`;

			await makeCall(phoneNumber, lead.name, lead.id);
			toast.success(`Calling ${lead.name}...`);
		} catch (error) {
			console.error('Error making call:', error);
			toast.error('Failed to initiate call');
		}
	};

	const handleCallDetail = (call: CallHistoryEntry) => {
		setSelectedCall(call);
	};

	const handleRecallFromHistory = async (call: CallHistoryEntry) => {
		try {
			if (!call.to_number) {
				toast.error('No phone number available for this call');
				return;
			}

			// Find the lead associated with this call
			const lead = leads.find((l) => l.id === call.lead_id);
			const leadName = lead?.name || call.to_number;

			await makeCall(call.to_number, leadName, call.lead_id || undefined);
			toast.success(`Calling ${leadName}...`);
			setSelectedCall(null); // Close modal
		} catch (error) {
			console.error('Error making call:', error);
			toast.error('Failed to initiate call');
		}
	};

	const getCallStatusIcon = (status: string, direction: 'inbound' | 'outbound') => {
		switch (status) {
			case 'answered':
			case 'completed':
				return direction === 'inbound' ? (
					<PhoneIncoming className="h-4 w-4 text-green-500" />
				) : (
					<PhoneOutgoing className="h-4 w-4 text-green-500" />
				);
			case 'no-answer':
				return <PhoneMissed className="h-4 w-4 text-red-500" />;
			case 'busy':
				return <PhoneMissed className="h-4 w-4 text-red-500" />;
			case 'failed':
				return <PhoneMissed className="h-4 w-4 text-red-500" />;
			case 'canceled':
				return <PhoneMissed className="h-4 w-4 text-red-500" />;
			case 'ringing':
				return <Phone className="h-4 w-4 animate-pulse text-blue-500" />;
			case 'initiated':
				return <Clock className="h-4 w-4 text-gray-400" />;
			default:
				return <Phone className="h-4 w-4 text-gray-400" />;
		}
	};

	const getCallStatusText = (status: string) => {
		switch (status) {
			case 'answered':
				return 'Answered';
			case 'completed':
				return 'Completed';
			case 'no-answer':
				return 'No Answer';
			case 'busy':
				return 'Busy';
			case 'failed':
				return 'Failed';
			case 'canceled':
				return 'Canceled';
			case 'ringing':
				return 'Ringing';
			case 'initiated':
				return 'Initiating';
			default:
				return status;
		}
	};

	const getCallStatusColor = (status: string) => {
		switch (status) {
			case 'answered':
				return 'text-green-600 bg-green-50';
			case 'completed':
				return 'text-green-600 bg-green-50';
			case 'no-answer':
				return 'text-red-600 bg-red-50';
			case 'busy':
				return 'text-red-600 bg-red-50';
			case 'failed':
				return 'text-red-600 bg-red-50';
			case 'canceled':
				return 'text-red-600 bg-red-50';
			case 'ringing':
				return 'text-blue-600 bg-blue-50';
			case 'initiated':
				return 'text-gray-600 bg-gray-50';
			default:
				return 'text-gray-600 bg-gray-50';
		}
	};

	const filteredLeads = leads.filter(
		(lead) =>
			lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			(lead.company && lead.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
			(lead.phone && lead.phone.includes(searchQuery))
	);

	const filteredHistory = callHistory.filter(
		(entry) =>
			(entry.lead_name && entry.lead_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
			entry.from_number.includes(searchQuery) ||
			entry.to_number.includes(searchQuery)
	);

	return (
		<div className="flex h-full flex-col border bg-gray-50 dark:bg-gray-900">
			{/* Header */}
			<div className="border-b border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
				<div className="px-6 py-4">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calls</h1>
							<p className="text-sm text-gray-600 dark:text-gray-400">
								Manage your calls and contacts • Dial pad available in the bottom-right call bar
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* Navigation Tabs */}
			<div className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
				<nav className="flex space-x-8 px-6">
					{[
						{ id: 'leads', label: 'Leads', icon: User },
						{ id: 'history', label: 'Call History', icon: Clock }
					].map((tab) => {
						const Icon = tab.icon;
						return (
							<button
								key={tab.id}
								onClick={() => setActiveTab(tab.id as 'leads' | 'history')}
								className={`flex items-center space-x-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
									activeTab === tab.id
										? 'border-red-500 text-red-600'
										: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
								}`}
							>
								<Icon className="h-4 w-4" />
								<span>{tab.label}</span>
							</button>
						);
					})}
				</nav>
			</div>

			{/* Main Content */}
			<div className="flex min-h-0 flex-1 flex-col">
				{activeTab === 'leads' && (
					<div className="flex min-h-0 flex-1 flex-col">
						{/* Search */}
						<div className="border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
							<div className="relative">
								<Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
								<Input
									placeholder="Search leads..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="pl-10"
								/>
							</div>
						</div>

						{/* Leads List */}
						<div className="min-h-0 flex-1 overflow-y-auto">
							{isLoadingLeads ? (
								<div className="flex items-center justify-center p-8">
									<div className="h-8 w-8 animate-spin rounded-full border-b-2 border-red-500"></div>
								</div>
							) : filteredLeads.length === 0 ? (
								<div className="p-8 text-center text-gray-500 dark:text-gray-400">
									{searchQuery
										? 'No leads found matching your search'
										: 'No leads with phone numbers found'}
								</div>
							) : (
								filteredLeads.map((lead) => (
									<div
										key={lead.id}
										className="flex cursor-pointer items-center justify-between border-b border-gray-100 p-4 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
										onClick={() => setSelectedLead(lead)}
									>
										<div className="flex items-center space-x-3">
											<div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 font-medium text-white">
												{lead.name.charAt(0)}
											</div>
											<div>
												<p className="font-medium text-gray-900 dark:text-white">{lead.name}</p>
												<div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
													<span>{formatPhoneNumber(lead.phone)}</span>
													{lead.company && (
														<>
															<span>•</span>
															<span className="flex items-center">
																<Building2 className="mr-1 h-3 w-3" />
																{lead.company}
															</span>
														</>
													)}
												</div>
											</div>
										</div>
										<div className="flex items-center space-x-2">
											<Button
												variant="ghost"
												size="sm"
												onClick={(e) => {
													e.stopPropagation();
													handleLeadCall(lead);
												}}
												disabled={deviceStatus === 'Calling…' || deviceStatus === 'Connected'}
												className="text-red-600 hover:bg-red-50 hover:text-red-700"
											>
												<Phone className="h-4 w-4" />
											</Button>
										</div>
									</div>
								))
							)}
						</div>
					</div>
				)}

				{activeTab === 'history' && (
					<div className="flex min-h-0 flex-1 flex-col">
						{/* Search */}
						<div className="border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
							<div className="flex items-center space-x-2">
								<div className="relative flex-1">
									<Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
									<Input
										placeholder="Search call history..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										className="pl-10"
									/>
								</div>
								<button
									onClick={fetchCallHistory}
									disabled={isLoadingHistory}
									className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 dark:text-gray-400 dark:hover:text-gray-200"
									title="Refresh call history"
								>
									<RefreshCw className={`h-4 w-4 ${isLoadingHistory ? 'animate-spin' : ''}`} />
								</button>
							</div>
						</div>

						{/* Call History List */}
						<div className="min-h-0 flex-1 overflow-y-auto">
							{isLoadingHistory ? (
								<div className="flex items-center justify-center p-8">
									<div className="h-8 w-8 animate-spin rounded-full border-b-2 border-red-500"></div>
								</div>
							) : filteredHistory.length === 0 ? (
								<div className="p-8 text-center text-gray-500 dark:text-gray-400">
									{searchQuery
										? 'No call history found matching your search'
										: 'No call history available'}
								</div>
							) : (
								filteredHistory.map((entry) => (
									<div
										key={entry.id}
										className="flex cursor-pointer items-center justify-between border-b border-gray-100 p-4 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
										onClick={() => handleCallDetail(entry)}
									>
										<div className="flex items-center space-x-3">
											<div
												className={`flex h-10 w-10 items-center justify-center rounded-full text-white ${
													entry.call_direction === 'inbound' ? 'bg-blue-500' : 'bg-red-500'
												}`}
											>
												{entry.call_direction === 'inbound' ? (
													<PhoneIncoming className="h-5 w-5" />
												) : (
													<PhoneOutgoing className="h-5 w-5" />
												)}
											</div>
											<div>
												<p className="font-medium text-gray-900 dark:text-white">
													{entry.lead_name || formatPhoneNumber(entry.to_number)}
												</p>
												<div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
													<span>{formatPhoneNumber(entry.to_number)}</span>
													{entry.lead_company && (
														<>
															<span>•</span>
															<span className="flex items-center">
																<Building2 className="mr-1 h-3 w-3" />
																{entry.lead_company}
															</span>
														</>
													)}
												</div>
											</div>
										</div>
										<div className="flex items-center space-x-3">
											<div className="text-right">
												<p className="text-sm text-gray-500 dark:text-gray-400">
													{new Date(entry.call_start_time).toLocaleDateString()}
												</p>
												<p className="text-xs text-gray-400 dark:text-gray-500">
													{entry.call_duration > 0
														? formatDuration(entry.call_duration)
														: 'No answer'}
												</p>
											</div>
											<div className="flex items-center space-x-2">
												{getCallStatusIcon(entry.call_status, entry.call_direction)}
												<span
													className={`rounded-full px-2 py-1 text-xs ${getCallStatusColor(entry.call_status)}`}
												>
													{getCallStatusText(entry.call_status)}
												</span>
											</div>
										</div>
									</div>
								))
							)}
						</div>
					</div>
				)}
			</div>

			{/* Lead Detail Modal */}
			{selectedLead && (
				<div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
					<div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 dark:bg-gray-900">
						<div className="mb-6 flex items-center space-x-4">
							<div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-2xl font-medium text-white">
								{selectedLead.name.charAt(0)}
							</div>
							<div>
								<h3 className="text-xl font-bold text-gray-900 dark:text-white">
									{selectedLead.name}
								</h3>
								<p className="text-gray-600 dark:text-gray-400">
									{formatPhoneNumber(selectedLead.phone)}
								</p>
								{selectedLead.company && (
									<p className="flex items-center text-sm text-gray-500 dark:text-gray-400">
										<Building2 className="mr-1 h-3 w-3" />
										{selectedLead.company}
									</p>
								)}
								{selectedLead.email && (
									<p className="flex items-center text-sm text-gray-500 dark:text-gray-400">
										<Mail className="mr-1 h-3 w-3" />
										{selectedLead.email}
									</p>
								)}
							</div>
						</div>

						<div className="flex space-x-3">
							<Button
								onClick={() => {
									handleLeadCall(selectedLead);
									setSelectedLead(null);
								}}
								disabled={deviceStatus === 'Calling…' || deviceStatus === 'Connected'}
								className="flex-1 bg-red-600 hover:bg-red-700"
							>
								<Phone className="mr-2 h-4 w-4" />
								{deviceStatus === 'Calling…' ? 'Calling...' : 'Call'}
							</Button>
							<Button variant="outline" onClick={() => setSelectedLead(null)} className="flex-1">
								Close
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* Call Detail Modal */}
			{selectedCall && (
				<div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
					<div className="mx-4 w-full max-w-lg rounded-lg bg-white p-6 dark:bg-gray-900">
						<div className="mb-6 flex items-center space-x-4">
							<div
								className={`flex h-16 w-16 items-center justify-center rounded-full text-white ${
									selectedCall.call_direction === 'inbound' ? 'bg-blue-500' : 'bg-red-500'
								}`}
							>
								{selectedCall.call_direction === 'inbound' ? (
									<PhoneIncoming className="h-8 w-8" />
								) : (
									<PhoneOutgoing className="h-8 w-8" />
								)}
							</div>
							<div>
								<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
									{selectedCall.lead_name || formatPhoneNumber(selectedCall.to_number)}
								</h3>
								<p className="text-sm text-gray-500 dark:text-gray-400">
									{formatPhoneNumber(selectedCall.to_number)}
								</p>
								{selectedCall.lead_company && (
									<p className="text-sm text-gray-500 dark:text-gray-400">
										{selectedCall.lead_company}
									</p>
								)}
							</div>
						</div>

						{/* Call Details */}
						<div className="mb-6 space-y-4">
							<div className="flex items-center justify-between">
								<span className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</span>
								<div className="flex items-center space-x-2">
									{getCallStatusIcon(selectedCall.call_status, selectedCall.call_direction)}
									<span
										className={`rounded-full px-2 py-1 text-sm ${getCallStatusColor(selectedCall.call_status)}`}
									>
										{getCallStatusText(selectedCall.call_status)}
									</span>
								</div>
							</div>

							<div className="flex items-center justify-between">
								<span className="text-sm font-medium text-gray-500 dark:text-gray-400">
									Date & Time
								</span>
								<span className="text-sm text-gray-900 dark:text-white">
									{new Date(selectedCall.call_start_time).toLocaleString()}
								</span>
							</div>

							<div className="flex items-center justify-between">
								<span className="text-sm font-medium text-gray-500 dark:text-gray-400">
									Duration
								</span>
								<span className="text-sm text-gray-900 dark:text-white">
									{selectedCall.call_duration > 0
										? formatDuration(selectedCall.call_duration)
										: 'No answer'}
								</span>
							</div>

							<div className="flex items-center justify-between">
								<span className="text-sm font-medium text-gray-500 dark:text-gray-400">From</span>
								<span className="text-sm text-gray-900 dark:text-white">
									{formatPhoneNumber(selectedCall.from_number)}
								</span>
							</div>

							<div className="flex items-center justify-between">
								<span className="text-sm font-medium text-gray-500 dark:text-gray-400">To</span>
								<span className="text-sm text-gray-900 dark:text-white">
									{formatPhoneNumber(selectedCall.to_number)}
								</span>
							</div>

							{selectedCall.twilio_call_sid && (
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium text-gray-500 dark:text-gray-400">
										Call ID
									</span>
									<span className="font-mono text-xs text-gray-500 dark:text-gray-400">
										{selectedCall.twilio_call_sid}
									</span>
								</div>
							)}
						</div>

						<div className="flex space-x-3">
							<Button
								onClick={() => handleRecallFromHistory(selectedCall)}
								disabled={deviceStatus === 'Calling…' || deviceStatus === 'Connected'}
								className="flex-1 bg-red-600 hover:bg-red-700"
							>
								<Phone className="mr-2 h-4 w-4" />
								{deviceStatus === 'Calling…' ? 'Calling...' : 'Call Again'}
							</Button>
							<Button variant="outline" onClick={() => setSelectedCall(null)} className="flex-1">
								Close
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default Calls;
