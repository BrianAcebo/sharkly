/**
 * Last-resort keyword intent when DataForSEO (or another intent API) is unavailable.
 * Keep minimal — prefer ML/SERP-based intent from DataForSEO Labs search_intent.
 */

export type ApiSearchIntent = 'informational' | 'commercial' | 'transactional';

export function fallbackSearchIntentFromKeyword(keyword: string): ApiSearchIntent {
	const kw = keyword.toLowerCase();
	if (
		/\b(buy|price|pricing|cost|hire|near me|discount|deal|free trial|sign up|get started|order|quote|shop)\b/.test(
			kw
		)
	)
		return 'transactional';
	if (
		/\b(best|top|vs|versus|compare|comparison|review|reviews|worth it|ranking|alternative|alternatives|recommend)\b/.test(
			kw
		)
	)
		return 'commercial';
	return 'informational';
}
