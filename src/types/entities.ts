import type { PersonRecord } from './person';
import type { BusinessRecord } from './business';
import type { EmailRecord } from './email';
import type { PhoneRecord } from './phone';
import type { UsernameRecord, SocialProfileRecord } from './social';
import type { ImageRecord } from './image';
import type { IPRecord } from './ip';
import type { DomainRecord } from './domain';
import type { PropertyRecord } from './property';
import type { LeakRecord } from './leak';
import type { DocumentRecord } from './document';
import type { Case as CaseRecord } from './case';

// Core provenance attached to nodes and edges
export interface Provenance {
	source: string; // e.g., 'google_pse', 'hibp', 'shodan'
	url?: string | null;
	retrieved_at: string; // ISO timestamp
	method?: string | null; // e.g., 'api', 'scrape', 'manual'
	confidence_score?: number | null; // 0..1
	raw_payload_reference?: string | null; // storage key or external id
}

// Entity node types supported by the graph
export type EntityType =
	| 'person'
	| 'email'
	| 'phone'
	| 'username'
	| 'social_profile'
	| 'image'
	| 'ip'
	| 'domain'
	| 'leak'
	| 'document'
	| 'business'
	| 'property'
	| 'case';

export interface BaseNode {
	id: string;
	type: EntityType;
	label?: string;
	first_seen?: string | null; // ISO
	last_seen?: string | null; // ISO
	confidence?: number | null; // 0..1
	provenance?: Provenance[];
}

export type EntityRef<T extends BaseNode = BaseNode> = {
	id: string;
	type: T['type'];
};

// Property
export interface PropertyNode extends BaseNode {
    type: 'property';
    record?: PropertyRecord | null;
}

// Person
export interface PersonNode extends PersonRecord {
    type: 'person';
}

// Email
export interface EmailNode extends BaseNode {
    type: 'email';
    record?: EmailRecord | null;
}

// Phone
export interface PhoneNode extends BaseNode, PhoneRecord {
    type: 'phone';
    record?: PhoneRecord | null;
}

// Username
export interface UsernameNode extends BaseNode, UsernameRecord {
    type: 'username';
    record?: UsernameRecord | null;
}

// Social Profile
export interface SocialProfileNode extends BaseNode, SocialProfileRecord {
    type: 'social_profile';
    record?: SocialProfileRecord | null;
}

// Image
export interface ImageNode extends BaseNode, ImageRecord {
    type: 'image';
    record?: ImageRecord | null;
}

// IP Address
export interface IPNode extends BaseNode, IPRecord {
    type: 'ip';
    record?: IPRecord | null;
}

// Domain
export interface DomainNode extends BaseNode, DomainRecord {
    type: 'domain';
    record?: DomainRecord | null;
}

// Leak
export interface LeakNode extends BaseNode {
    type: 'leak';
    record?: LeakRecord | null;
}

// Document / LegalRecord
export interface DocumentNode extends BaseNode, DocumentRecord {
    type: 'document';
    record?: DocumentRecord | null;
}

// Business / Company
export interface CompanyRegistration {
	state?: string | null;
	sec_data?: Record<string, unknown> | null; // flexible SEC/SoS data
}

export interface BusinessNode extends BaseNode, BusinessRecord {
    type: 'business';
    record?: BusinessRecord | null;
}

// Case (internal)
export interface CaseNode extends BaseNode, CaseRecord {
    type: 'case';
    record?: CaseRecord | null;
}

export type EntityNode =
	| PersonNode
	| EmailNode
	| PhoneNode
	| UsernameNode
	| SocialProfileNode
	| ImageNode
	| IPNode
	| DomainNode
	| LeakNode
	| DocumentNode
	| BusinessNode
	| PropertyNode
	| CaseNode;

// Transform edge with provenance
export interface TransformEdge {
	id: string;
	transform_type: string; // e.g., 'search_web_mentions', 'breach_check'
	source_node_id: string;
	target_node_id: string;
	retrieved_at: string; // ISO
	source_api?: string | null; // e.g., 'google_pse', 'hibp'
	source_url?: string | null;
	confidence_score?: number | null; // 0..1
	raw_reference_id?: string | null;
	provenance?: Provenance[];
}


