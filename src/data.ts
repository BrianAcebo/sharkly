import { TEAM_MEMBER_ROLES } from './utils/constants';
import { Lead } from './types/leads';

export const mockLeads: Lead[] = [
	{
		id: '1',
		name: 'Sarah Johnson',
		email: 'sarah.johnson@techcorp.com',
		phone: '+1 (555) 123-4567',
		company: 'TechCorp Solutions',
		stage: 'qualified',
		value: 25000,
		last_contact: '2024-01-15',
		assigned_to: {
			id: '2',
			profile: {
				id: '2',
				avatar: '/images/avatars/avatar-2.jpg',
				completed_onboarding: true,
				first_name: 'Sarah',
				last_name: 'Johnson'
			},
			role: TEAM_MEMBER_ROLES.ADMIN,
			organization_id: '1'
		},
		notes: 'Interested in enterprise package. Follow up next week.',
		created_at: '2024-01-10',
		communications: [
			{
				id: '1',
				lead_id: '1',
				created_by: 'John Doe',
				created_at: '2024-01-15T14:00:00Z',
				updated_at: '2024-01-15T14:00:00Z',
				type: 'email',
				direction: 'outbound',
				subject: 'Welcome to our CRM solution',
				content: 'Hi Sarah, thank you for your interest in our CRM solution...',
				timestamp: '2024-01-15T10:30:00Z',
				status: 'read'
			},
			{
				id: '2',
				lead_id: '1',
				created_by: 'John Doe',
				created_at: '2024-01-15T14:00:00Z',
				updated_at: '2024-01-15T14:00:00Z',
				type: 'call',
				direction: 'outbound',
				content: 'Discussed pricing and implementation timeline',
				timestamp: '2024-01-15T14:00:00Z',
				duration: 1800,
				status: 'sent'
			}
		],
		status: 'active',
		priority: 'low',
		organization_id: '',
		created_by: '',
		updated_at: ''
	},
	{
		id: '2',
		name: 'Michael Chen',
		email: 'michael.chen@startup.io',
		phone: '+1 (555) 987-6543',
		company: 'Innovation Startup',
		stage: 'new',
		value: 15000,
		last_contact: '2024-01-14',
		assigned_to: {
			id: '2',
			profile: {
				id: '2',
				avatar: 'https://via.placeholder.com/150',
				completed_onboarding: true,
				first_name: 'Sarah',
				last_name: 'Johnson'
			},
			role: TEAM_MEMBER_ROLES.ADMIN,
			organization_id: '1'
		},
		notes: 'New lead from website form',
		created_at: '2024-01-14',
		communications: [
			{
				id: '3',
				type: 'text',
				direction: 'inbound',
				content: 'Hi, I filled out your form and would like to learn more about your CRM',
				timestamp: '2024-01-14T09:15:00Z',
				status: 'delivered',
				lead_id: '',
				created_by: '',
				created_at: '',
				updated_at: ''
			}
		],
		status: 'active',
		priority: 'low',
		organization_id: '',
		created_by: '',
		updated_at: ''
	}
];