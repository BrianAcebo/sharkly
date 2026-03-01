export interface Site {
	id: string;
	name: string;
	description: string;
	logo: string | null; // public URL for display
	logoPath?: string | null; // storage path for delete/update (internal)
	url: string;
	platform: string;
	niche: string;
	customerDescription: string;
	competitorUrls: string[];
	createdAt: string;
	updatedAt: string;
}
