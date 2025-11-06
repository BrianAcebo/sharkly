export interface WebMention {
	title: string | null;
	link: string | null;
	snippet?: string | null;
	displayLink?: string | null;
	favicon?: string | null;
	image?: string | null;
	source?: 'google_pse' | string;
	retrieved_at?: string; // ISO
}
