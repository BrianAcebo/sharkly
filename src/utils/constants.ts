// Lead Stage Options
export const LEAD_STAGES = {
	NEW: 'new',
	CONTACTED: 'contacted',
	QUALIFIED: 'qualified',
	PROPOSAL: 'proposal',
	CLOSED_WON: 'closed-won',
	CLOSED_LOST: 'closed-lost'
} as const;

// Lead Priority Options
export const LEAD_PRIORITIES = {
	LOW: 'low',
	MEDIUM: 'medium',
	HIGH: 'high',
	CRITICAL: 'critical'
} as const;

export type LeadPriority = (typeof LEAD_PRIORITIES)[keyof typeof LEAD_PRIORITIES];

// Lead Status Options
export const LEAD_STATUSES = {
	ACTIVE: 'active',
	IN_PROGRESS: 'in_progress',
	CLOSED: 'closed'
} as const;

// Date Range Options
export const DATE_RANGES = {
	ALL: 'all',
	LAST_7_DAYS: 'last7days',
	LAST_30_DAYS: 'last30days',
	LAST_90_DAYS: 'last90days',
	CUSTOM: 'custom'
} as const;

export type DateRange = (typeof DATE_RANGES)[keyof typeof DATE_RANGES];

// Team Member Role Options
export const TEAM_MEMBER_ROLES = {
	OWNER: 'owner',
	ADMIN: 'admin',
	MEMBER: 'member'
} as const;

// Roles that can be assigned to new team members (excludes owner)
export const ASSIGNABLE_TEAM_MEMBER_ROLES = {
	ADMIN: 'admin',
	MEMBER: 'member'
} as const;

export type TeamMemberRole = (typeof TEAM_MEMBER_ROLES)[keyof typeof TEAM_MEMBER_ROLES];
export type AssignableTeamMemberRole =
	(typeof ASSIGNABLE_TEAM_MEMBER_ROLES)[keyof typeof ASSIGNABLE_TEAM_MEMBER_ROLES];

// Filter Options for UI
export const FILTER_OPTIONS = {
	STAGE: [
		{ value: 'all', label: 'All Stages' },
		{ value: LEAD_STAGES.NEW, label: 'New' },
		{ value: LEAD_STAGES.CONTACTED, label: 'Contacted' },
		{ value: LEAD_STAGES.QUALIFIED, label: 'Qualified' },
		{ value: LEAD_STAGES.PROPOSAL, label: 'Proposal' },
		{ value: LEAD_STAGES.CLOSED_WON, label: 'Closed Won' },
		{ value: LEAD_STAGES.CLOSED_LOST, label: 'Closed Lost' }
	],
	PRIORITY: [
		{ value: 'all', label: 'All Priorities' },
		{ value: LEAD_PRIORITIES.LOW, label: 'Low' },
		{ value: LEAD_PRIORITIES.MEDIUM, label: 'Medium' },
		{ value: LEAD_PRIORITIES.HIGH, label: 'High' },
		{ value: LEAD_PRIORITIES.CRITICAL, label: 'Critical' }
	],
	STATUS: [
		{ value: 'all', label: 'All Statuses' },
		{ value: LEAD_STATUSES.ACTIVE, label: 'Active' },
		{ value: LEAD_STATUSES.IN_PROGRESS, label: 'In Progress' },
		{ value: LEAD_STATUSES.CLOSED, label: 'Closed' }
	],
	DATE_RANGE: [
		{ value: DATE_RANGES.ALL, label: 'All Time' },
		{ value: DATE_RANGES.LAST_7_DAYS, label: 'Last 7 Days' },
		{ value: DATE_RANGES.LAST_30_DAYS, label: 'Last 30 Days' },
		{ value: DATE_RANGES.LAST_90_DAYS, label: 'Last 90 Days' },
		{ value: DATE_RANGES.CUSTOM, label: 'Custom Range' }
	]
} as const;
