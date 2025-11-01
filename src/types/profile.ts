export interface UserProfile {
	id: string;
	first_name: string;
	last_name: string;
	avatar: string;
	completed_onboarding: boolean;
}

export interface TeamMember {
	id: string;
	email?: string;
	role: string;
	createdAt?: string;
	updatedAt?: string;
	profile: UserProfile;
	organization_id: string;
}

