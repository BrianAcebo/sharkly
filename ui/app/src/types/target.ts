/** Persisted from DataForSEO Labs on target save — matches KeywordIntentKind in seoUtils */
export type TargetPrimarySearchIntent =
	| 'informational'
	| 'commercial'
	| 'transactional'
	| 'navigational';

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
	primarySearchIntent: TargetPrimarySearchIntent | null;
	searchIntentProbability: number | null;
	searchIntentSource: 'dataforseo' | 'fallback' | null;
	searchIntentPhrase: string | null;
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
