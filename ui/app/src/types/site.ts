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
	domainAuthority: number;
	tone?: string | null;
	includeTerms?: string | null;
	avoidTerms?: string | null;
	targetLanguage: string;
	targetRegion: string;
	authorBio?: string | null;
	/** Site-wide original insight / IGS for generated articles when the page has no brief-level igs_opportunity */
	originalInsight?: string | null;
	// S1-5: AggregateRating + sameAs
	googleReviewCount?: number | null;
	googleAverageRating?: number | null;
	gbpUrl?: string | null;
	facebookUrl?: string | null;
	linkedinUrl?: string | null;
	twitterUrl?: string | null;
	yelpUrl?: string | null;
	wikidataUrl?: string | null;
	isYMYL?: boolean;
	gsc_connected?: boolean;
	createdAt: string;
	updatedAt: string;
}
