export interface Target {
	id: string;
	siteId: string;
	name: string;
	destinationPageUrl: string | null;
	destinationPageLabel: string | null;
	seedKeywords: string[];
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
}

export interface CreateTargetInput {
	name: string;
	destinationPageUrl?: string;
	destinationPageLabel?: string;
	seedKeywords?: string[];
}

export interface UpdateTargetInput {
	name?: string;
	destinationPageUrl?: string;
	destinationPageLabel?: string;
	seedKeywords?: string[];
	sortOrder?: number;
}
