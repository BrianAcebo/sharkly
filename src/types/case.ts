export type PriorityFilter = 'all' | 'low' | 'medium' | 'high' | 'critical';
export type CaseStatus = 'active' | 'in_progress' | 'closed';
export type CasePriority = 'low' | 'medium' | 'high' | 'critical';

export type CaseStatusFilter = 'all' | 'active' | 'closed' | 'in_progress';

export interface ListCasesParams {
	organizationId: string;
	search?: string;
	status?: CaseStatus | 'all';
	priority?: CasePriority | 'all';
	page?: number;
	perPage?: number;
	includeArchived?: boolean;
	archivedOnly?: boolean;
	from?: string; // ISO date
	to?: string;   // ISO date
	sortBy?: 'recent' | 'priority' | 'alphabetical';
  }

export interface SubjectDevice {
	type: string;
	os: string;
	last_used?: string;
}

export interface SubjectSocialProfile {
	platform: string;
	username: string;
	url?: string;
}

export interface Subject {
	id: string;
	name: string;
	email: string;
	type: 'person' | 'company';
	location: {
		city: string;
		country: string;
		ip: string;
	};
	devices: SubjectDevice[];
	social_profiles: SubjectSocialProfile[];
	avatar: string;
}

export interface Case {
    id: string;
    organization_id?: string;
    created_by?: string;
    title: string;
    description: string | null;
    category: string | null;
    status: CaseStatus;
    priority: CasePriority;
    tags: string[] | null;
    subject?: Subject | null;
    subject_id?: string | null;
    assigned_to: Investigator[] | null;
    graph_id: string | null;
    archived_at: string | null;
    created_at: Date | string; // ISO string
    updated_at: Date | string; // ISO string
}

export interface Evidence {
    id: string;
    case_id: string;
    subject_id?: string | null;
    organization_id: string;
    uploader_id?: string | null;
    file_name: string;
    file_type: string;
    file_size: number;
    storage_path: string;
    checksum?: string | null;
    description?: string | null;
    tags?: string[] | null;
    created_at: string; // ISO string
}

export interface SearchFilter {
	status?: 'active' | 'inactive' | 'in progress' | 'all';
	priorityLevel?: PriorityFilter;
	dateRange?: {
		from: Date | undefined;
		to: Date | undefined;
	};
	sortBy?: 'recent' | 'priority' | 'alphabetical';
	includeArchived?: boolean;
	archivedOnly?: boolean;
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
	summary: string;
	findings: string; // Full narrative
	recommendations: string;
	attachedFiles: string[]; // Links to PDFs, images, logs
	submittedAt: Date;
	submittedBy: Investigator;
}

export interface UserProfile {
	id: string;
	first_name: string;
	last_name: string;
	avatar: string;
	completed_onboarding: boolean;
}

export interface Investigator {
	id: string;
	organizationId: string;
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
