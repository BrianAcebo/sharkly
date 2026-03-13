/**
 * S1-6: YMYL (Your Money or Your Life) Niche Detection
 * Google applies stricter EEAT to YMYL-based content.
 * See docs/product-gaps-master.md V1.4d
 */

const YMYL_TERMS = [
	'law',
	'legal',
	'lawyer',
	'attorney',
	'solicitor',
	'medical',
	'health',
	'doctor',
	'physician',
	'dentist',
	'nurse',
	'financial',
	'finance',
	'investment',
	'insurance',
	'mortgage',
	'mental health',
	'therapy',
	'psychology',
	'psychiatric',
	'counselling',
	'counseling',
	'pharmacy',
	'medication',
	'drugs',
	'supplements'
];

/**
 * Returns true if the given niche text matches YMYL categories.
 * Checks niche (and optionally name/description) for YMYL indicators.
 */
export function isYMYLNiche(niche: string, ...additionalTexts: string[]): boolean {
	const combined = [niche, ...additionalTexts]
		.filter(Boolean)
		.map((s) => String(s).toLowerCase())
		.join(' ');
	if (!combined.trim()) return false;
	return YMYL_TERMS.some((term) => combined.includes(term));
}

/** YMYL-specific generation prompt additions (cite sources, credentials, disclaimers) */
export const YMYL_PROMPT_ADDITIONS = `
YMYL NOTICE — Your niche is classified as "Your Money or Your Life" (health, legal, financial, or similar). Google applies stricter quality standards:

1. CITE SOURCES — Every factual claim (statistics, medical info, legal precedent, financial advice) must cite an authoritative source. Use phrases like "according to [source]" or "studies show [source]."
2. AUTHOR CREDENTIALS — Include or reinforce the author's qualifications prominently where expertise matters.
3. DISCLAIMERS — Add appropriate disclaimers (e.g. "This is not legal/medical/financial advice. Consult a qualified professional.") where the content could influence major life decisions.
4. AVOID ABSOLUTE CLAIMS — Prefer "may," "can help," "often" over definitive statements unless properly cited.
`;
