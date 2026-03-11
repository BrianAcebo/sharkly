/**
 * S2-17: 8 Laws of SEO — Contextual education (O1)
 * From The Complete SEO System §4.5. Each law appears as a tooltip where its feature is used.
 */

export const LAWS_OF_SEO = {
	technical_first: {
		id: 'technical_first',
		title: 'Law 1: Technical First',
		statement:
			'Google must be able to discover, render, and trust a page before any ranking is possible.',
		patent: 'US7346839B2'
	},
	intent_before_keywords: {
		id: 'intent_before_keywords',
		title: 'Law 2: Intent Before Keywords',
		statement:
			'A page that matches the right intent but uses different words will outrank a page that matches the keywords but answers the wrong question.',
		patent: 'Query understanding system (BERT/MUM)'
	},
	quality_before_volume: {
		id: 'quality_before_volume',
		title: 'Law 3: Quality Before Volume',
		statement:
			'One piece of content with genuine original insight outranks ten pieces of high-volume, low-novelty content.',
		patent: 'US20190155948A1'
	},
	structure_enables_passage: {
		id: 'structure_enables_passage',
		title: 'Law 4: Structure Enables Passage Ranking',
		statement:
			'H2 headings are not just keyword signals — they define passage context. Clear question-format H2s with first-sentence answers get independently scored and ranked.',
		patent: 'US9940367B1 + US9959315B1'
	},
	placement_determines_link_value: {
		id: 'placement_determines_link_value',
		title: 'Law 5: Placement Determines Link Value',
		statement:
			'Where a link sits on a page determines how much equity it passes — not just which page it links to.',
		patent: 'US8117209B1'
	},
	behaviour_confirms_authority: {
		id: 'behaviour_confirms_authority',
		title: 'Law 6: Behaviour Confirms Authority',
		statement:
			'User click and dwell time signals have been Google\'s most important ranking input for 20 years — they cause rankings, not just correlate with them.',
		patent: 'US8595225B1 (Navboost, DOJ confirmed 2023)'
	},
	trust_takes_time: {
		id: 'trust_takes_time',
		title: 'Law 7: Trust Takes Time',
		statement:
			'Every trust signal Google uses — inception date, link velocity, anchor text consistency, content update history — is measured over time. There is no shortcut.',
		patent: 'US7346839B2'
	},
	brand_search_is_algorithmic: {
		id: 'brand_search_is_algorithmic',
		title: 'Law 8: Brand Search Is Algorithmic',
		statement:
			'Growing branded search volume is not a PR activity — it is a direct input into the multiplier that affects every page\'s score across your site.',
		patent: 'US8682892B1'
	}
} as const;

export type LawId = keyof typeof LAWS_OF_SEO;

export function getLawTooltipContent(lawId: LawId): string {
	const law = LAWS_OF_SEO[lawId];
	if (!law) return '';
	return `${law.statement} [${law.patent}]`;
}
