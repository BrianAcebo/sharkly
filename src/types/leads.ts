import { LEAD_STAGES, LEAD_PRIORITIES, LEAD_STATUSES } from '../utils/constants';

export type PriorityFilter = 'all' | typeof LEAD_PRIORITIES[keyof typeof LEAD_PRIORITIES];
export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  title?: string;
  stage: typeof LEAD_STAGES[keyof typeof LEAD_STAGES];
  value?: number;
  status: typeof LEAD_STATUSES[keyof typeof LEAD_STATUSES];
  priority: typeof LEAD_PRIORITIES[keyof typeof LEAD_PRIORITIES];
  category?: string;
  tags?: string[];
  notes?: string;
  organization_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_contact?: string;
  assigned_to: TeamMember;
  created_by_user?: {
    id: string;
    email: string;
    user_metadata: Record<string, unknown>;
  };
  communications: Communication[];
}

export interface CreateLeadData {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  stage: typeof LEAD_STAGES[keyof typeof LEAD_STAGES];
  value?: number;
  title?: string;
  description?: string;
  category?: string;
  status?: typeof LEAD_STATUSES[keyof typeof LEAD_STATUSES];
  priority?: typeof LEAD_PRIORITIES[keyof typeof LEAD_PRIORITIES];
  tags?: string[];
  notes?: string;
  assigned_to?: TeamMember;
}

export type UpdateLeadData = Partial<CreateLeadData>;

export interface Communication {
  id: string;
  lead_id: string;
  type: 'email' | 'text' | 'call';
  direction: 'inbound' | 'outbound';
  subject?: string;
  content: string;
  duration?: number;
  status?: 'sent' | 'delivered' | 'read' | 'failed';
  created_by: string;
  created_at: string;
  updated_at: string;
  timestamp: string;
  created_by_user?: {
    id: string;
    email: string;
    user_metadata: Record<string, unknown>;
  };
}

export interface Entity {
	id: string;
	name: string;
	email: string;
	type: 'person' | 'company';
	location: {
		city: string;
		country: string;
		ip: string;
	};
	devices: {
		type: string;
		os: string;
		lastUsed: string;
	}[];
	socialProfiles: {
		platform: string;
		username: string;
		url: string;
	}[];
	avatar: string;
}

export interface Case {
	id: string;
	title: string;
	description: string;
	category: string;
	status: 'active' | 'in_progress' | 'closed';
	priority: 'low' | 'medium' | 'high' | 'critical';
	entity: Entity;
	tags: string[]; // ex: ["fraud", "cyber", "surveillance"]
	assignedTo: TeamMember[];
	createdAt: Date;
	updatedAt: Date;
	graphId: string; // Reference to associated lead graph
}

export interface SearchFilter {
	status?: typeof LEAD_STATUSES[keyof typeof LEAD_STATUSES] | 'inactive' | 'in progress' | 'all';
	priorityLevel?: PriorityFilter;
	dateRange?: {
		from: Date | undefined;
		to: Date | undefined;
	};
	sortBy?: 'recent' | 'priority' | 'alphabetical';
}

export interface GraphEntity {
	id: string;
	type:
		| 'person'
		| 'email'
		| 'username'
		| 'ip'
		| 'domain'
		| 'social'
		| 'phone'
		| 'image'
		| 'location'
		| 'document';
	value: string; // The actual identifier (e.g., john@example.com)
	metadata: object; // Flexible structure for details (DOB, platform, source, etc.)
	source: string; // How/where it was found
	confidence: number; // 0–100 score of reliability
	createdAt: Date;
	tags?: string[];
	linkedEntities: string[]; // Optional, if manually specified outside the graph
}

export interface Graph {
	id: string;
	caseId: string;
	nodes: GraphEntityNode[]; // Nodes are just Entity references
	edges: GraphEdge[];
	layout: 'circle' | 'force' | 'tree' | 'custom';
	savedAt: Date;
}

export interface GraphEntityNode {
	id: string;
	position: { x: number; y: number };
	pinned?: boolean;
}

export interface GraphEdge {
	id: string;
	source: string;
	target: string;
	label?: string; // e.g., “Registered to”, “Communicated with”
	type?: string; // “email”, “ownership”, “activity”
}

export interface Report {
	id: string;
	caseId: string;
	title: string;
	content: string;
	attachedFiles: string[]; // Links to PDFs, images, logs
	submittedAt: Date;
	submittedBy: TeamMember;
}

export interface UserProfile {
	id: string;
	first_name: string;
	last_name: string;
	avatar: string;
	completed_onboarding: boolean;
}

export interface TeamMember {
	id: string;
	user_id?: string;
	organization_id: string;
	role: 'admin' | 'analyst' | 'viewer';
	profile: UserProfile;
}

export interface Organization {
	id: string;
	ownerId: string;
	name: string;
	maxSeats: number;
	createdAt: Date;
	updatedAt: Date;
	status: 'active' | 'inactive' | 'pending';
}