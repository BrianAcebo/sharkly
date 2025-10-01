import React, { useState, useRef, useEffect } from 'react';
import {
	Search,
	MoreHorizontal,
	Phone,
	MessageCircle,
	Send,
	User,
	Clock,
	Check,
	CheckCheck,
	AlertCircle,
	Plus,
	X,
	Archive,
	Trash2,
	Ban,
	Info
} from 'lucide-react';
import { Button } from '../ui/button';
import { supabase } from '../../utils/supabaseClient';
import { toast } from 'sonner';
import { useWebRTCCall } from '../../hooks/useWebRTCCall';

interface SmsContact {
	phone_number: string;
	lead_name?: string;
	last_message: string;
	last_message_time: string;
	unread_count: number;
	direction: 'inbound' | 'outbound';
	archived?: boolean;
}

interface SmsMessage {
  id: string;
  agent_id: string;
  phone_number: string;
  to_number: string;
  from_number: string;
  direction: 'inbound' | 'outbound';
  body: string;
  status: 'queued' | 'sent' | 'delivered' | 'undelivered' | 'failed';
  twilio_sid?: string;
  lead_id?: string;
  archived?: boolean;
  read?: boolean;
  created_at: string;
}

interface MessageGroup {
  id: string;
  direction: 'inbound' | 'outbound';
  messages: SmsMessage[];
  timestamp: string;
  status?: string;
  showStatus: boolean;
}

interface DateHeader {
  type: 'date';
  date: string;
  displayText: string;
}

interface Lead {
	id: string;
	name: string;
	company?: string;
	phone: string | null;
	email?: string;
}

const Chat: React.FC = () => {
	const [selectedContact, setSelectedContact] = useState<SmsContact | null>(null);
	const [contacts, setContacts] = useState<SmsContact[]>([]);
	const [messages, setMessages] = useState<SmsMessage[]>([]);
	const [newMessage, setNewMessage] = useState('');
	const [searchTerm, setSearchTerm] = useState('');
	const [isLoading, setIsLoading] = useState(true);
	const [isSending, setIsSending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [agentPhone, setAgentPhone] = useState<string | null>(null);
	const [showNewMessageModal, setShowNewMessageModal] = useState(false);
	const [newMessagePhone, setNewMessagePhone] = useState('');
	const [newMessageBody, setNewMessageBody] = useState('');
	const [leads, setLeads] = useState<Lead[]>([]);
	const [isLoadingLeads, setIsLoadingLeads] = useState(false);
	const [showLeadSelector, setShowLeadSelector] = useState(false);
	const [showSettingsMenu, setShowSettingsMenu] = useState(false);
	const [showCallConfirmation, setShowCallConfirmation] = useState(false);
	const [showContactInfo, setShowContactInfo] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [showArchivedMenu, setShowArchivedMenu] = useState(false);
	const [archivedContacts, setArchivedContacts] = useState<SmsContact[]>([]);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const [subscription, setSubscription] = useState<ReturnType<typeof supabase.channel> | null>(
		null
	);

	// WebRTC call functionality
	const { makeCall, deviceStatus } = useWebRTCCall();

	// Fetch agent's phone number
	useEffect(() => {
		fetchAgentPhone();
	}, []);

	// Fetch contacts when agent phone is available
	useEffect(() => {
		if (agentPhone) {
			fetchContacts();
		}
	}, [agentPhone]);

	// Fetch leads when needed
	useEffect(() => {
		if (showLeadSelector) {
			fetchLeads();
		}
	}, [showLeadSelector]);

	// Set up real-time subscription for SMS messages
	useEffect(() => {
		if (!agentPhone) return;

		const channel = supabase
			.channel('sms-messages')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'sms_messages',
					filter: `phone_number=eq.${agentPhone}`
				},
				(payload) => {
					console.log('SMS message change:', payload);

					if (payload.eventType === 'INSERT') {
						const newMessage = payload.new as SmsMessage;
						// Add to messages if it's part of the current conversation
						if (
							selectedContact &&
							((newMessage.from_number === selectedContact.phone_number &&
								newMessage.direction === 'inbound') ||
								(newMessage.to_number === selectedContact.phone_number &&
									newMessage.direction === 'outbound'))
						) {
							setMessages((prev) => [...prev, newMessage]);
						}
						// Refresh contacts to show latest message and update unread counts
						fetchContacts();
					} else if (payload.eventType === 'UPDATE') {
						const updatedMessage = payload.new as SmsMessage;
						setMessages((prev) =>
							prev.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg))
						);
					}
				}
			)
			.subscribe();

		setSubscription(channel);

		return () => {
			if (subscription) {
				supabase.removeChannel(subscription);
			}
		};
	}, [agentPhone, selectedContact]);

	const fetchAgentPhone = async () => {
		try {
            // Removed global fallback; always use assigned seat number from backend

			// Fallback to Supabase for production
			const {
				data: { user }
			} = await supabase.auth.getUser();
			if (!user) return;

			const { data, error } = await supabase
				.from('agent_phone_numbers')
				.select('phone_number')
				.eq('agent_id', user.id)
				.eq('is_active', true)
				.single();

			if (error) throw error;
			setAgentPhone(data.phone_number);
		} catch (err) {
			console.error('Error fetching agent phone:', err);
			setError('Failed to fetch agent phone number');
		}
	};

	const fetchLeads = async () => {
		try {
			setIsLoadingLeads(true);
			const { data, error } = await supabase
				.from('leads')
				.select('id, name, company, phone, email')
				.order('created_at', { ascending: false });

			if (error) throw error;
			setLeads(data || []);
		} catch (err) {
			console.error('Error fetching leads:', err);
			setError('Failed to fetch leads');
		} finally {
			setIsLoadingLeads(false);
		}
	};

	const fetchContacts = async () => {
		if (!agentPhone) return;

		try {
			setIsLoading(true);
			setError(null);

			// Get unique contacts from SMS messages
			const { data, error } = await supabase
				.from('sms_messages')
				.select('*')
				.eq('phone_number', agentPhone)
				.order('created_at', { ascending: false });

			if (error) throw error;

			// Group messages by contact and get latest message for each
			const contactMap = new Map<string, SmsContact>();

			data?.forEach((message) => {
				const contactPhone =
					message.direction === 'inbound' ? message.from_number : message.to_number;

				if (!contactMap.has(contactPhone)) {
					contactMap.set(contactPhone, {
						phone_number: contactPhone,
						lead_name: undefined, // Will be populated below
						last_message: message.body,
						last_message_time: message.created_at,
						unread_count: 0, // Will be calculated below
						direction: message.direction,
						archived: message.archived || false
					});
				} else {
					const existing = contactMap.get(contactPhone)!;
					if (new Date(message.created_at) > new Date(existing.last_message_time)) {
						existing.last_message = message.body;
						existing.last_message_time = message.created_at;
						existing.direction = message.direction;
					}
				}
			});

			// Calculate unread counts for each contact
			contactMap.forEach((contact, contactPhone) => {
				const unreadMessages = data?.filter(message => {
					const messageContactPhone = message.direction === 'inbound' ? message.from_number : message.to_number;
					return messageContactPhone === contactPhone && 
						   message.direction === 'inbound' && 
						   !message.read;
				}) || [];
				
				contact.unread_count = unreadMessages.length;
			});

			// Fetch lead names using lead_id from messages (for new messages)
			const leadIds = data?.map((message) => message.lead_id).filter(Boolean) || [];
			if (leadIds.length > 0) {
				const { data: leadData, error: leadError } = await supabase
					.from('leads')
					.select('id, name, phone')
					.in('id', leadIds);

				if (leadError) {
					console.error('Error fetching lead names:', leadError);
				}

				if (leadData) {
					// Create a map of lead_id to lead info
					const leadMap = new Map(leadData.map((lead) => [lead.id, lead]));

					// Update contacts with lead names
					data?.forEach((message) => {
						if (message.lead_id && leadMap.has(message.lead_id)) {
							const lead = leadMap.get(message.lead_id)!;
							const contactPhone =
								message.direction === 'inbound' ? message.from_number : message.to_number;
							const contact = contactMap.get(contactPhone);
							if (contact) {
								contact.lead_name = lead.name;
							}
						}
					});
				}
			}

			// Also fetch lead names by phone number (for existing messages without lead_id)
			const contactPhones = Array.from(contactMap.keys());
			if (contactPhones.length > 0) {
				const { data: leadDataByPhone, error: phoneError } = await supabase
					.from('leads')
					.select('name, phone')
					.in('phone', contactPhones);

				if (phoneError) {
					console.error('Error fetching lead names by phone:', phoneError);
				}

				if (leadDataByPhone) {
					// Update contacts that don't already have lead names
					leadDataByPhone.forEach((lead) => {
						const contact = contactMap.get(lead.phone);
						if (contact && !contact.lead_name) {
							contact.lead_name = lead.name;
						}
					});
				}
			}

			const allContacts = Array.from(contactMap.values());
			
			// Filter out archived contacts from main list
			const activeContacts = allContacts.filter(contact => !contact.archived);
			setContacts(activeContacts);
			
			// Store archived contacts separately
      console.log('allContacts', allContacts);
			const archivedContacts = allContacts.filter(contact => contact.archived);
			setArchivedContacts(archivedContacts);
		} catch (err) {
			console.error('Error fetching contacts:', err);
			setError('Failed to fetch contacts');
		} finally {
			setIsLoading(false);
		}
	};

	const fetchMessages = async (contactPhone: string) => {
		if (!agentPhone) return;

		try {
			const { data, error } = await supabase
				.from('sms_messages')
				.select('*')
				.eq('phone_number', agentPhone)
				.or(
					`and(direction.eq.inbound,from_number.eq.${contactPhone}),and(direction.eq.outbound,to_number.eq.${contactPhone})`
				)
				.order('created_at', { ascending: true });

			if (error) throw error;
			setMessages(data || []);
		} catch (err) {
			console.error('Error fetching messages:', err);
			setError('Failed to fetch messages');
		}
	};

	const handleContactSelect = (contact: SmsContact) => {
		setSelectedContact(contact);
		fetchMessages(contact.phone_number);
		// Mark messages as read when conversation is opened
		markMessagesAsRead(contact.phone_number);
	};

	const handleSendMessage = async () => {
		if (!newMessage.trim() || !selectedContact || !agentPhone) return;

		try {
			setIsSending(true);
			setError(null);

			// Get the current session token
			const {
				data: { session }
			} = await supabase.auth.getSession();
			if (!session?.access_token) {
				throw new Error('No active session');
			}

			// Try to find lead_id for this contact
			let leadId: string | undefined;
			const { data: contactLeadData } = await supabase
				.from('leads')
				.select('id')
				.eq('phone', selectedContact.phone_number)
				.single();

			if (contactLeadData?.id) {
				leadId = contactLeadData.id;
			}

			const response = await fetch('/api/sms/send', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${session.access_token}`
				},
				body: JSON.stringify({
					to: selectedContact.phone_number,
					body: newMessage.trim(),
					lead_id: leadId
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to send SMS');
			}

			// Clear the message on success
			setNewMessage('');

			// Refresh messages to show the new one
			fetchMessages(selectedContact.phone_number);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to send SMS');
		} finally {
			setIsSending(false);
		}
	};

	const handleRetryMessage = async (message: SmsMessage) => {
		try {
			setIsSending(true);
			setError(null);

			// Get the current session token
			const { data: { session } } = await supabase.auth.getSession();
			if (!session?.access_token) {
				throw new Error('No active session');
			}

			const response = await fetch('/api/sms/send', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${session.access_token}`
				},
				body: JSON.stringify({
					to: message.to_number,
					body: message.body,
					lead_id: message.lead_id
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to resend SMS');
			}

			// Refresh messages to show the new one
			if (selectedContact) {
				fetchMessages(selectedContact.phone_number);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to resend SMS');
		} finally {
			setIsSending(false);
		}
	};

	const handleSendNewMessage = async () => {
		if (!newMessageBody.trim() || !newMessagePhone || !agentPhone) return;

		try {
			setIsSending(true);
			setError(null);

			// Get the current session token
			const {
				data: { session }
			} = await supabase.auth.getSession();
			if (!session?.access_token) {
				throw new Error('No active session');
			}

			// Try to find lead_id for this phone number
			let leadId: string | undefined;
			const { data: messageLeadData } = await supabase
				.from('leads')
				.select('id')
				.eq('phone', newMessagePhone)
				.single();

			if (messageLeadData?.id) {
				leadId = messageLeadData.id;
			}

			const response = await fetch('/api/sms/send', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${session.access_token}`
				},
				body: JSON.stringify({
					to: newMessagePhone,
					body: newMessageBody.trim(),
					lead_id: leadId
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to send SMS');
			}

			// Clear the form and close modal
			setNewMessageBody('');
			setNewMessagePhone('');
			setShowNewMessageModal(false);

			// Create a new contact for this conversation
			const newContact: SmsContact = {
				phone_number: newMessagePhone,
				lead_name: undefined, // Will be populated if lead exists
				last_message: newMessageBody.trim(),
				last_message_time: new Date().toISOString(),
				unread_count: 0,
				direction: 'outbound'
			};

			// Try to find lead name for this phone number
			const { data: newLeadData } = await supabase
				.from('leads')
				.select('id, name')
				.eq('phone', newMessagePhone)
				.single();

			if (newLeadData?.name) {
				newContact.lead_name = newLeadData.name;
			}

			// Add to contacts and select it
			setContacts((prev) => [newContact, ...prev]);
			setSelectedContact(newContact);

			// Refresh messages
			fetchMessages(newMessagePhone);

			toast.success('Message sent successfully!');
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to send SMS');
		} finally {
			setIsSending(false);
		}
	};

	const handleLeadSelect = (lead: Lead) => {
		if (lead.phone) {
			setNewMessagePhone(lead.phone);
			setShowLeadSelector(false);
		}
	};

	const handleCallClick = () => {
		if (selectedContact) {
			setShowCallConfirmation(true);
		}
	};

	const handleConfirmCall = async () => {
		if (!selectedContact) return;

		try {
			// Format phone number to E.164
			const phoneNumber = selectedContact.phone_number.startsWith('+') 
				? selectedContact.phone_number 
				: `+1${selectedContact.phone_number.replace(/\D/g, '')}`;

			// Try to find lead_id for this contact
			let leadId: string | undefined;
			const { data: leadData } = await supabase
				.from('leads')
				.select('id')
				.eq('phone', selectedContact.phone_number)
				.single();

			if (leadData?.id) {
				leadId = leadData.id;
			}

			await makeCall(phoneNumber, selectedContact.lead_name || selectedContact.phone_number, leadId);
			setShowCallConfirmation(false);
			toast.success('Call initiated successfully!');
		} catch (error) {
			console.error('Error making call:', error);
			toast.error('Failed to initiate call');
		}
	};

	const handleSettingsAction = (action: string) => {
		setShowSettingsMenu(false);
		
		switch (action) {
			case 'archive':
				handleArchiveChat();
				break;
			case 'delete':
				setShowDeleteConfirm(true);
				break;
			case 'info':
				setShowContactInfo(true);
				break;
			default:
				break;
		}
	};

	const handleArchiveChat = async () => {
		if (!selectedContact) return;
		
		try {
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) {
				toast.error('User not authenticated');
				return;
			}

			// Try to update the conversation status to archived
			// If the archived column doesn't exist, we'll handle it gracefully
			const { error } = await supabase
				.from('sms_messages')
				.update({ archived: true })
				.eq('phone_number', selectedContact.phone_number)
				.eq('agent_id', user.id);

			if (error) {
				// If archived column doesn't exist, show a different message
				if (error.message.includes('column "archived" does not exist')) {
					toast.info('Archive feature requires database schema update');
					return;
				}
				throw error;
			}

			toast.success('Chat archived successfully');
			// Refresh contacts to update the list
			fetchContacts();
		} catch (error) {
			console.error('Error archiving chat:', error);
			toast.error('Failed to archive chat');
		}
	};



	const handleDeleteChat = async () => {
		if (!selectedContact) return;
		
		try {
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) {
				toast.error('User not authenticated');
				return;
			}

			// Delete all messages for this contact
			const { error } = await supabase
				.from('sms_messages')
				.delete()
				.eq('phone_number', selectedContact.phone_number)
				.eq('agent_id', user.id);

			if (error) throw error;

			toast.success('Chat deleted successfully');
			// Clear selected contact and refresh
			setSelectedContact(null);
			fetchContacts();
		} catch (error) {
			console.error('Error deleting chat:', error);
			toast.error('Failed to delete chat');
		}
	};

	const markMessagesAsRead = async (contactPhone: string) => {
		if (!agentPhone) return;
		
		try {
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) {
				return;
			}

			// Mark all inbound messages as read for this contact
			const { error } = await supabase
				.from('sms_messages')
				.update({ read: true })
				.eq('phone_number', agentPhone)
				.eq('from_number', contactPhone)
				.eq('direction', 'inbound')
				.eq('agent_id', user.id)
				.is('read', null); // Only update messages that haven't been marked as read

			if (error) {
				console.error('Error marking messages as read:', error);
			}
		} catch (error) {
			console.error('Error marking messages as read:', error);
		}
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage();
		}
	};

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	};

	useEffect(() => {
		scrollToBottom();
	}, [messages]);

	// Close settings menu and archived menu when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Element;
			
			if (showSettingsMenu && !target.closest('.settings-menu-container')) {
				setShowSettingsMenu(false);
			}
			
			if (showArchivedMenu && !target.closest('.archived-menu-container')) {
				setShowArchivedMenu(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showSettingsMenu, showArchivedMenu]);

	const filteredContacts = contacts.filter(
		(contact) =>
			contact.phone_number.includes(searchTerm) ||
			contact.last_message.toLowerCase().includes(searchTerm.toLowerCase())
	);

	  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatDateHeader = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (messageDate.getTime() === today.getTime()) {
      return 'Today';
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (messageDate.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    }
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const groupMessages = (messages: SmsMessage[]): (MessageGroup | DateHeader)[] => {
    if (messages.length === 0) return [];
    
    const groups: (MessageGroup | DateHeader)[] = [];
    let currentGroup: MessageGroup | null = null;
    let lastDate = '';
    
    messages.forEach((message) => {
      const messageDate = new Date(message.created_at).toDateString();
      const isNewDay = messageDate !== lastDate;
      
      // Add date header if it's a new day
      if (isNewDay) {
        groups.push({
          type: 'date',
          date: messageDate,
          displayText: formatDateHeader(message.created_at)
        });
        lastDate = messageDate;
      }
      
      // Check if we should start a new group
      const shouldStartNewGroup = !currentGroup || 
        currentGroup.direction !== message.direction ||
        (new Date(message.created_at).getTime() - new Date(currentGroup.timestamp).getTime()) > 5 * 60 * 1000; // 5 minutes
      
      if (shouldStartNewGroup) {
        // Close previous group if it exists
        if (currentGroup) {
          groups.push(currentGroup);
        }
        
        // Start new group
        currentGroup = {
          id: `group-${message.id}`,
          direction: message.direction,
          messages: [message],
          timestamp: message.created_at,
          status: message.status,
          showStatus: message.direction === 'outbound'
        };
      } else {
        // Add to current group
        currentGroup!.messages.push(message);
        // Update status to the latest message's status
        currentGroup!.status = message.status;
      }
    });
    
    // Add the last group
    if (currentGroup) {
      groups.push(currentGroup);
    }
    
    return groups;
  };

	const getStatusIcon = (status: string, direction: string) => {
		if (direction === 'inbound') return null;

		switch (status) {
			case 'queued':
				return <Clock className="h-3 w-3 text-gray-400" />;
			case 'sent':
				return <Check className="h-3 w-3 text-blue-500" />;
			case 'delivered':
				return <CheckCheck className="h-3 w-3 text-green-500" />;
			case 'failed':
				return <AlertCircle className="h-3 w-3 text-red-500" />;
			default:
				return <Clock className="h-3 w-3 text-gray-400" />;
		}
	};

	const formatPhoneNumber = (phone: string | null) => {
		// Handle null or undefined phone numbers
		if (!phone) {
			return 'No phone number';
		}

		// Remove all non-digits
		const cleaned = phone.replace(/\D/g, '');

		// If it's a US number (10 digits), format as (XXX) XXX-XXXX
		if (cleaned.length === 10) {
			return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
		}

		// If it's a US number with country code (11 digits starting with 1), format as +1 (XXX) XXX-XXXX
		if (cleaned.length === 11 && cleaned.startsWith('1')) {
			return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
		}

		// Return as is for other formats
		return phone;
	};

	if (!agentPhone) {
		return (
			<div className="flex h-full items-center justify-center bg-gray-50 dark:bg-gray-900">
				<div className="text-center">
					<MessageCircle className="mx-auto mb-4 h-16 w-16 text-gray-400" />
					<h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
						No Business Number
					</h3>
					<p className="mb-6 text-gray-600 dark:text-gray-400">
						You need a business phone number to send and receive SMS messages.
					</p>
					<Button
						variant="default"
						onClick={() => (window.location.href = '/settings')}
						className="inline-flex items-center"
					>
						<Phone className="mr-2 h-4 w-4" />
						Get Business Number
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-full bg-gray-50 dark:bg-gray-900 border">
			{/* SMS Contacts Sidebar */}
			<div className="flex w-80 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
				<div className="border-b border-gray-200 p-4 dark:border-gray-700">
					<div className="mb-4 flex items-center justify-between">
						<h2 className="text-xl font-bold text-gray-900 dark:text-white">SMS Messages</h2>
						<div className="flex items-center space-x-2">
							{/* Archived Chats Menu */}
							{archivedContacts.length > 0 && (
								<div className="relative archived-menu-container">
									<Button
										variant="icon"
										startIcon={<Archive className="h-4 w-4" />}
										onClick={() => setShowArchivedMenu(!showArchivedMenu)}
										className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
										title={`${archivedContacts.length} archived chat${archivedContacts.length !== 1 ? 's' : ''}`}
									/>
									
									{/* Archived Menu */}
									{showArchivedMenu && (
										<div className="absolute right-0 top-10 z-50 w-64 rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
											<div className="p-2">
												<div className="mb-2 px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">
													Archived Chats ({archivedContacts.length})
												</div>
												<div className="max-h-48 overflow-y-auto">
													{archivedContacts.map((contact) => (
														<button
															key={contact.phone_number}
															onClick={() => {
																setSelectedContact(contact);
																setShowArchivedMenu(false);
																fetchMessages(contact.phone_number);
																markMessagesAsRead(contact.phone_number);
															}}
															className="flex w-full items-center p-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
														>
															<div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600">
																<User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
																{/* Unread count badge for archived contacts */}
																{contact.unread_count > 0 && (
																	<div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
																		{contact.unread_count > 9 ? '9+' : contact.unread_count}
																	</div>
																)}
															</div>
															<div className="ml-3 flex-1 min-w-0">
																<p className="truncate font-medium text-gray-900 dark:text-white">
																	{contact.lead_name || formatPhoneNumber(contact.phone_number)}
																</p>
																<p className="truncate text-xs text-gray-500 dark:text-gray-400">
																	{contact.last_message}
																</p>
															</div>
														</button>
													))}
												</div>
											</div>
										</div>
									)}
								</div>
							)}
							
							<Button
								variant="icon"
								startIcon={<Plus className="h-5 w-5 text-white" />}
								onClick={() => setShowNewMessageModal(true)}
								className="bg-red-600 text-white hover:bg-red-700"
							/>
						</div>
					</div>

					<div className="relative">
						<Search className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
						<input
							type="text"
							placeholder="Search contacts..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full rounded-lg border border-gray-200 bg-gray-100 py-2 pr-4 pl-10 text-gray-900 placeholder-gray-500 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
						/>
					</div>
				</div>

				<div className="flex-1 overflow-y-auto">
					{isLoading ? (
						<div className="p-4 text-center">
							<div className="mx-auto h-6 w-6 animate-spin rounded-full border-b-2 border-red-500"></div>
						</div>
					) : filteredContacts.length === 0 ? (
						<div className="p-4 text-center text-gray-500 dark:text-gray-400">
							{searchTerm ? 'No contacts found' : 'No SMS conversations yet'}
						</div>
					) : (
						filteredContacts.map((contact) => (
							<button
								key={contact.phone_number}
								onClick={() => handleContactSelect(contact)}
								className={`flex w-full items-center p-4 transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-700 ${
									selectedContact?.phone_number === contact.phone_number
										? 'bg-gray-50 dark:bg-gray-700'
										: ''
								}`}
							>
								<div className="relative mr-3">
									<div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600">
										<User className="h-6 w-6 text-white" />
									</div>
									{/* Unread count badge */}
									{contact.unread_count > 0 && (
										<div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
											{contact.unread_count > 99 ? '99+' : contact.unread_count}
										</div>
									)}
								</div>
								<div className="flex-1 text-left">
									<div className="flex items-center justify-between">
										<h3 className="font-medium text-gray-900 dark:text-white">
											{contact.lead_name || formatPhoneNumber(contact.phone_number)}
										</h3>
										<div className="flex items-center space-x-2">
											{contact.unread_count > 0 && (
												<div className="flex h-2 w-2 rounded-full bg-red-500"></div>
											)}
											<span className="text-xs text-gray-500 dark:text-gray-400">
												{formatTime(contact.last_message_time)}
											</span>
										</div>
									</div>
									<p className="truncate text-sm text-gray-500 dark:text-gray-400">
										{contact.last_message}
									</p>
								</div>
							</button>
						))
					)}
				</div>
			</div>

			{/* SMS Conversation Area */}
			<div className="flex flex-1 flex-col">
				{selectedContact ? (
					<>
						{/* Conversation Header */}
						<div className="border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
							<div className="flex items-center justify-between">
								<div className="flex items-center space-x-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600">
										<User className="h-5 w-5 text-white" />
									</div>
									<div>
										<h3 className="font-medium text-gray-900 dark:text-white">
											{selectedContact.lead_name || formatPhoneNumber(selectedContact.phone_number)}
										</h3>
										<p className="text-sm text-gray-500 dark:text-gray-400">
											{selectedContact.lead_name
												? 'SMS Conversation'
												: formatPhoneNumber(selectedContact.phone_number)}
										</p>
									</div>
								</div>

								<div className="flex items-center space-x-2">
									<Button 
										variant="icon" 
										startIcon={<Phone className="h-5 w-5" />}
										onClick={handleCallClick}
										disabled={deviceStatus === 'Calling…' || deviceStatus === 'Connected'}
										className="hover:bg-gray-100 dark:hover:bg-gray-700"
									/>
									<div className="relative settings-menu-container">
										<Button 
											variant="icon" 
											startIcon={<MoreHorizontal className="h-5 w-5" />}
											onClick={() => setShowSettingsMenu(!showSettingsMenu)}
											className="hover:bg-gray-100 dark:hover:bg-gray-700"
										/>
										
										{/* Settings Menu */}
										{showSettingsMenu && (
											<div className="absolute right-0 top-10 z-50 w-48 rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
												<div className="py-1">
													<button
														onClick={() => handleSettingsAction('info')}
														className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
													>
														<Info className="mr-3 h-4 w-4" />
														Contact Info
													</button>
													{/* <button
														onClick={() => handleSettingsAction('archive')}
														className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
													>
														<Archive className="mr-3 h-4 w-4" />
														Archive Chat
													</button> */}
													<hr className="my-1 border-gray-200 dark:border-gray-700" />
													<button
														onClick={() => handleSettingsAction('delete')}
														className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:text-red-400 dark:hover:bg-gray-700"
													>
														<Trash2 className="mr-3 h-4 w-4" />
														Delete Chat
													</button>
												</div>
											</div>
										)}
									</div>
								</div>
							</div>
						</div>

						{/* Messages */}
						<div className="flex-1 overflow-y-auto p-4">
							{groupMessages(messages).map((item) => {
								if ('type' in item && item.type === 'date') {
									// Date header
									return (
										<div key={`date-${item.date}`} className="flex justify-center my-6">
											<div className="px-3 py-1 rounded-full">
												<span className="text-xs font-medium text-gray-400 dark:text-gray-300">
													{item.displayText}
												</span>
											</div>
										</div>
									);
								} else {
									// Message group
									const group = item as MessageGroup;
									return (
										<div
											key={group.id}
											className={`flex ${group.direction === 'outbound' ? 'justify-end' : 'justify-start'} mb-4`}
										>
											<div className={`max-w-xs lg:max-w-md ${group.direction === 'outbound' ? 'order-2' : 'order-1'}`}>
												{/* Message bubbles */}
												<div className="space-y-1">
													{group.messages.map((message, msgIndex) => (
														<div
															key={message.id}
															className={`rounded-2xl px-4 py-2 ${
																group.direction === 'outbound'
																	? 'bg-red-500 text-white'
																	: 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white'
															} ${
																group.messages.length === 1
																	? 'rounded-2xl'
																	: msgIndex === 0
																	? group.direction === 'outbound'
																		? 'rounded-2xl rounded-br-md'
																		: 'rounded-2xl rounded-bl-md'
																	: msgIndex === group.messages.length - 1
																	? group.direction === 'outbound'
																		? 'rounded-2xl rounded-tr-md'
																		: 'rounded-2xl rounded-tl-md'
																	: group.direction === 'outbound'
																	? 'rounded-md'
																	: 'rounded-md'
															}`}
														>
															<p className="text-sm whitespace-pre-wrap">{message.body}</p>
														</div>
													))}
												</div>

												{/* Status and time - only show on last message of group */}
												<div
													className={`mt-1 flex items-center justify-between gap-2 px-2 text-xs ${
														group.direction === 'outbound'
															? 'text-red-100'
															: 'text-gray-500 dark:text-gray-400'
													}`}
												>
													<span className="text-gray-400 dark:text-gray-300">{formatTime(group.timestamp)}</span>

													{group.direction === 'outbound' && group.showStatus && (
														<div className="flex items-center space-x-1">
															{group.status === 'failed' || group.status === 'undelivered' ? (
																<button
																	onClick={() => handleRetryMessage(group.messages[group.messages.length - 1])}
																	className="flex items-center space-x-1 text-red-300 hover:text-red-200 transition-colors"
																	disabled={isSending}
																>
																	<AlertCircle className="h-3 w-3" />
																	<span className="text-xs">Tap to retry</span>
																</button>
															) : (
																<>
																	{getStatusIcon(group.status || 'queued', group.direction)}
																	<span className="text-xs text-gray-400 dark:text-gray-300">{group.status}</span>
																</>
															)}
														</div>
													)}
												</div>
											</div>
										</div>
									);
								}
							})}
							<div ref={messagesEndRef} />
						</div>

						{/* Message Input */}
						<div className="border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
							<div className="flex items-center space-x-3">
								<div className="relative flex-1">
									<input
										type="text"
										value={newMessage}
										onChange={(e) => setNewMessage(e.target.value)}
										onKeyPress={handleKeyPress}
										placeholder="Type a message"
										disabled={isSending}
										className="w-full rounded-full border border-gray-200 bg-gray-100 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
									/>
								</div>

								<Button
									variant="secondary"
									startIcon={<Send className="h-5 w-5" />}
									onClick={handleSendMessage}
									disabled={!newMessage.trim() || isSending}
									className="bg-red-600 px-6 text-white hover:bg-red-700"
								>
									{isSending ? 'Sending...' : 'Send'}
								</Button>
							</div>

							{error && <div className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</div>}
						</div>
					</>
				) : (
					<div className="flex flex-1 items-center justify-center">
						<div className="text-center">
							<MessageCircle className="mx-auto mb-4 h-16 w-16 text-gray-400" />
							<h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
								Select a Conversation
							</h3>
							<p className="text-gray-600 dark:text-gray-400">
								Choose a contact from the sidebar to start messaging
							</p>
						</div>
					</div>
				)}
			</div>

			{/* New Message Modal */}
			{showNewMessageModal && (
				<div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
					<div className="mx-4 w-full max-w-md rounded-lg bg-white shadow-xl dark:bg-gray-800">
						<div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700">
							<h2 className="text-lg font-semibold text-gray-900 dark:text-white">New Message</h2>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setShowNewMessageModal(false)}
								className="h-8 w-8 p-0"
							>
								<X className="h-5 w-5" />
							</Button>
						</div>

						<div className="space-y-4 p-6">
							{/* Phone Number Input */}
							<div>
								<label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
									Phone Number
								</label>
								<div className="flex space-x-2">
									<input
										type="tel"
										value={newMessagePhone}
										onChange={(e) => setNewMessagePhone(e.target.value)}
										placeholder="Enter phone number"
										className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
									/>
									<Button
										variant="outline"
										onClick={() => setShowLeadSelector(true)}
										className="whitespace-nowrap"
									>
										Choose Lead
									</Button>
								</div>
							</div>

							{/* Message Input */}
							<div>
								<label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
									Message
								</label>
								<textarea
									value={newMessageBody}
									onChange={(e) => setNewMessageBody(e.target.value)}
									placeholder="Type your message..."
									rows={4}
									className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
								/>
							</div>

							{/* Send Button */}
							<div className="flex justify-end space-x-3 pt-4">
								<Button
									variant="outline"
									onClick={() => setShowNewMessageModal(false)}
									disabled={isSending}
								>
									Cancel
								</Button>
								<Button
									onClick={handleSendNewMessage}
									disabled={!newMessageBody.trim() || !newMessagePhone || isSending}
									className="bg-red-600 text-white hover:bg-red-700"
								>
									{isSending ? 'Sending...' : 'Send Message'}
								</Button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Lead Selector Modal */}
			{showLeadSelector && (
				<div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
					<div className="mx-4 max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-xl dark:bg-gray-800">
						<div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700">
							<h2 className="text-lg font-semibold text-gray-900 dark:text-white">Choose a Lead</h2>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setShowLeadSelector(false)}
								className="h-8 w-8 p-0"
							>
								<X className="h-5 w-5" />
							</Button>
						</div>

						<div className="p-6">
							{isLoadingLeads ? (
								<div className="py-8 text-center">
									<div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-red-500"></div>
									<p className="mt-2 text-gray-600 dark:text-gray-400">Loading leads...</p>
								</div>
							) : leads.length === 0 ? (
								<div className="py-8 text-center text-gray-600 dark:text-gray-400">
									No leads found
								</div>
							) : (
								<div className="max-h-96 space-y-2 overflow-y-auto">
									{leads
										.filter((lead) => lead.phone)
										.map((lead) => (
											<button
												key={lead.id}
												onClick={() => handleLeadSelect(lead)}
												className="w-full rounded-md p-3 text-left transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-700"
											>
												<div className="flex items-center justify-between">
													<div>
														<h3 className="font-medium text-gray-900 dark:text-white">
															{lead.name || lead.company || 'Unknown Lead'}
														</h3>
														<p className="text-sm text-gray-600 dark:text-gray-400">
															{formatPhoneNumber(lead.phone)}
														</p>
														{lead.email && (
															<p className="text-sm text-gray-500 dark:text-gray-400">
																{lead.email}
															</p>
														)}
													</div>
													<Phone className="h-4 w-4 text-gray-400" />
												</div>
											</button>
										))}
								</div>
							)}
						</div>
					</div>
				</div>
			)}

			{/* Call Confirmation Modal */}
			{showCallConfirmation && selectedContact && (
				<div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
					<div className="mx-4 w-full max-w-md rounded-lg bg-white shadow-xl dark:bg-gray-800">
						<div className="p-6">
							<div className="mb-4 text-center">
								<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
									<Phone className="h-8 w-8 text-red-600 dark:text-red-400" />
								</div>
								<h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
									Call {selectedContact.lead_name || formatPhoneNumber(selectedContact.phone_number)}
								</h3>
								<p className="text-sm text-gray-600 dark:text-gray-400">
									Are you sure you want to call this contact?
								</p>
							</div>

							<div className="flex justify-end space-x-3">
								<Button
									variant="outline"
									onClick={() => setShowCallConfirmation(false)}
									disabled={deviceStatus === 'Calling…'}
								>
									Cancel
								</Button>
								<Button
									onClick={handleConfirmCall}
									disabled={deviceStatus === 'Calling…'}
									className="bg-red-600 text-white hover:bg-red-700"
								>
									{deviceStatus === 'Calling…' ? 'Initiating Call...' : 'Call'}
								</Button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Contact Info Modal */}
			{showContactInfo && selectedContact && (
				<div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
					<div className="mx-4 w-full max-w-md rounded-lg bg-white shadow-xl dark:bg-gray-800">
						<div className="p-6">
							<div className="mb-4 text-center">
								<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
									<User className="h-8 w-8 text-red-600 dark:text-red-400" />
								</div>
								<h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
									Contact Information
								</h3>
							</div>

							<div className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
										Name
									</label>
									<p className="mt-1 text-sm text-gray-900 dark:text-white">
										{selectedContact.lead_name || 'Unknown'}
									</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
										Phone Number
									</label>
									<p className="mt-1 text-sm text-gray-900 dark:text-white">
										{formatPhoneNumber(selectedContact.phone_number)}
									</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
										Last Message
									</label>
									<p className="mt-1 text-sm text-gray-900 dark:text-white">
										{selectedContact.last_message}
									</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
										Last Activity
									</label>
									<p className="mt-1 text-sm text-gray-900 dark:text-white">
										{formatTime(selectedContact.last_message_time)}
									</p>
								</div>
							</div>

							<div className="mt-6 flex justify-end">
								<Button
									onClick={() => setShowContactInfo(false)}
									className="bg-red-600 text-white hover:bg-red-700"
								>
									Close
								</Button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Delete Confirmation Modal */}
			{showDeleteConfirm && selectedContact && (
				<div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
					<div className="mx-4 w-full max-w-md rounded-lg bg-white shadow-xl dark:bg-gray-800">
						<div className="p-6">
							<div className="mb-4 text-center">
								<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
									<Trash2 className="h-8 w-8 text-red-600 dark:text-red-400" />
								</div>
								<h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
									Delete Chat
								</h3>
								<p className="text-sm text-gray-600 dark:text-gray-400">
									Are you sure you want to delete this conversation? This action cannot be undone.
								</p>
							</div>

							<div className="flex justify-end space-x-3">
								<Button
									variant="outline"
									onClick={() => setShowDeleteConfirm(false)}
								>
									Cancel
								</Button>
								<Button
									onClick={() => {
										setShowDeleteConfirm(false);
										handleDeleteChat();
									}}
									className="bg-red-600 text-white hover:bg-red-700"
								>
									Delete Chat
								</Button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default Chat;
