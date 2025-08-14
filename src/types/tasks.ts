export interface Task {
	id: string;
	title: string;
	description?: string;
	due_date: string;
	priority: 'low' | 'medium' | 'high' | 'urgent';
	status: 'pending' | 'in_progress' | 'completed';
	type: 'follow_up' | 'proposal' | 'meeting' | 'call' | 'email' | 'general';
	lead_id?: string;
	lead_name?: string;
	organization_id: string;
	owner_id: string;
	reminder_enabled: boolean;
	reminder_time?: string;
	created_at: string;
	updated_at: string;
}

export interface TaskFormData {
	title: string;
	description: string;
	due_date: string;
	priority: 'low' | 'medium' | 'high' | 'urgent';
	type: 'follow_up' | 'proposal' | 'meeting' | 'call' | 'email' | 'general';
	lead_id?: string;
	reminder_enabled: boolean;
	reminder_time?: string;
}

export interface TaskReminder {
	id: string;
	task_id: string;
	reminder_time: string;
	status: 'pending' | 'sent' | 'cancelled';
	notification_type: 'browser' | 'email' | 'both';
	created_at: string;
	updated_at: string;
}

export interface TaskStats {
	total: number;
	pending: number;
	in_progress: number;
	completed: number;
	overdue: number;
	dueToday: number;
	dueThisWeek: number;
}

export const TASK_TYPES = {
	follow_up: { label: 'Follow Up', icon: '📞', color: 'text-blue-500' },
	proposal: { label: 'Proposal', icon: '📋', color: 'text-green-500' },
	meeting: { label: 'Meeting', icon: '📅', color: 'text-purple-500' },
	call: { label: 'Call', icon: '📞', color: 'text-orange-500' },
	email: { label: 'Email', icon: '📧', color: 'text-indigo-500' },
	general: { label: 'General', icon: '📝', color: 'text-gray-500' }
} as const;

export const PRIORITY_COLORS = {
	low: 'text-gray-500 bg-gray-100 dark:bg-gray-800',
	medium: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
	high: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
	urgent: 'text-red-600 bg-red-100 dark:bg-red-900/30'
} as const;

export const STATUS_COLORS = {
	pending: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
	in_progress: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
	completed: 'text-green-600 bg-green-100 dark:bg-green-900/30'
} as const;
