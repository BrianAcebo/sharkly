import React, { useEffect, useState } from 'react';
import {
	Phone,
	User,
	Clock,
	PhoneIncoming,
	PhoneOutgoing,
	PhoneMissed,
	Search,
	Star
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { mockContacts, mockCallHistory } from '../data/mockCallData';
import { CallContact } from '../types/calls';
import { useActiveCall } from '../contexts/ActiveCallContext';
import { useBreadcrumbs } from '../hooks/useBreadcrumbs';
import PageMeta from '../components/common/PageMeta';

const Calls: React.FC = () => {
	const [activeTab, setActiveTab] = useState<'contacts' | 'history'>('contacts');
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedContact, setSelectedContact] = useState<CallContact | null>(null);
	const { initiateCall } = useActiveCall();
	const { setTitle } = useBreadcrumbs();

	useEffect(() => {
		setTitle('Calls');
	}, [setTitle]);

	const formatDuration = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	};

	const handleContactCall = (contact: CallContact) => {
		initiateCall(contact.phoneNumber, contact.name, contact.id);
	};

	const filteredContacts = mockContacts.filter(
		(contact) =>
			contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			contact.phoneNumber.includes(searchQuery)
	);

	const filteredHistory = mockCallHistory.filter(
		(entry) =>
			entry.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
			entry.phoneNumber.includes(searchQuery)
	);

	return (
		<>
			<PageMeta title="Calls" description="Manage your calls and contacts" />
			<div className="flex h-full flex-col bg-gray-50 dark:bg-gray-900">
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
							{ id: 'contacts', label: 'Contacts', icon: User },
							{ id: 'history', label: 'Call History', icon: Clock }
						].map((tab) => {
							const Icon = tab.icon;
							return (
								<button
									key={tab.id}
									onClick={() => setActiveTab(tab.id as 'contacts' | 'history')}
									className={`flex items-center space-x-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
										activeTab === tab.id
											? 'border-blue-500 text-blue-600'
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
				<div className="flex-1 overflow-hidden">
					{activeTab === 'contacts' && (
						<div className="flex h-full flex-col">
							{/* Search */}
							<div className="border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
								<div className="relative">
									<Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
									<Input
										placeholder="Search contacts..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										className="pl-10"
									/>
								</div>
							</div>

							{/* Contacts List */}
							<div className="flex-1 overflow-y-auto">
								{filteredContacts.map((contact) => (
									<div
										key={contact.id}
										className="flex cursor-pointer items-center justify-between border-b border-gray-100 p-4 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
										onClick={() => setSelectedContact(contact)}
									>
										<div className="flex items-center space-x-3">
											<div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 font-medium text-white">
												{contact.name.charAt(0)}
											</div>
											<div>
												<p className="font-medium text-gray-900 dark:text-white">{contact.name}</p>
												<p className="text-sm text-gray-500 dark:text-gray-400">
													{contact.phoneNumber}
												</p>
											</div>
										</div>
										<div className="flex items-center space-x-2">
											{contact.isFavorite && (
												<Star className="h-4 w-4 fill-current text-yellow-500" />
											)}
											<Button
												variant="ghost"
												size="sm"
												onClick={(e) => {
													e.stopPropagation();
													handleContactCall(contact);
												}}
												className="text-green-600 hover:bg-green-50 hover:text-green-700"
											>
												<Phone className="h-4 w-4" />
											</Button>
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{activeTab === 'history' && (
						<div className="flex h-full flex-col">
							{/* Search */}
							<div className="border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
								<div className="relative">
									<Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
									<Input
										placeholder="Search call history..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										className="pl-10"
									/>
								</div>
							</div>

							{/* Call History List */}
							<div className="flex-1 overflow-y-auto">
								{filteredHistory.map((entry) => (
									<div
										key={entry.id}
										className="flex cursor-pointer items-center justify-between border-b border-gray-100 p-4 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
										onClick={() => {
											const contact = mockContacts.find((c) => c.id === entry.contactId);
											if (contact) {
												setSelectedContact(contact);
												setActiveTab('contacts');
											}
										}}
									>
										<div className="flex items-center space-x-3">
											<div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-500 text-white">
												{entry.direction === 'inbound' ? (
													<PhoneIncoming className="h-5 w-5" />
												) : entry.direction === 'outbound' ? (
													<PhoneOutgoing className="h-5 w-5" />
												) : (
													<PhoneMissed className="h-5 w-5" />
												)}
											</div>
											<div>
												<p className="font-medium text-gray-900 dark:text-white">
													{entry.contactName}
												</p>
												<p className="text-sm text-gray-500 dark:text-gray-400">
													{entry.phoneNumber}
												</p>
											</div>
										</div>
										<div className="text-right">
											<p className="text-sm text-gray-500 dark:text-gray-400">
												{entry.startTime.toLocaleDateString()}
											</p>
											<p className="text-xs text-gray-400 dark:text-gray-500">
												{entry.duration > 0 ? formatDuration(entry.duration) : 'Missed'}
											</p>
										</div>
									</div>
								))}
							</div>
						</div>
					)}
				</div>

				{/* Contact Detail Modal */}
				{selectedContact && (
					<div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
						<div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 dark:bg-gray-900">
							<div className="mb-6 flex items-center space-x-4">
								<div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500 text-2xl font-medium text-white">
									{selectedContact.name.charAt(0)}
								</div>
								<div>
									<h3 className="text-xl font-bold text-gray-900 dark:text-white">
										{selectedContact.name}
									</h3>
									<p className="text-gray-600 dark:text-gray-400">{selectedContact.phoneNumber}</p>
									{selectedContact.company && (
										<p className="text-sm text-gray-500 dark:text-gray-400">
											{selectedContact.company}
										</p>
									)}
								</div>
							</div>

							<div className="flex space-x-3">
								<Button
									onClick={() => {
										handleContactCall(selectedContact);
										setSelectedContact(null);
									}}
									className="flex-1 bg-green-600 hover:bg-green-700"
								>
									<Phone className="mr-2 h-4 w-4" />
									Call
								</Button>
								<Button
									variant="outline"
									onClick={() => setSelectedContact(null)}
									className="flex-1"
								>
									Close
								</Button>
							</div>
						</div>
					</div>
				)}
			</div>
		</>
	);
};

export default Calls;
