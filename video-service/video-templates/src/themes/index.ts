import type { BrandTheme } from '../types';
import { catholicTheme } from './catholic';
import { salesTheme } from './sales';
import { seoTheme } from './seo';
import { sharklyTheme } from './sharkly';

const themes: Record<string, BrandTheme> = {
	seo_app: seoTheme,
	sharkly: sharklyTheme,
	catholic: catholicTheme,
	word_journal: catholicTheme,
	apologetics: catholicTheme,
	sales: salesTheme,
};

export function getTheme(brandId: string): BrandTheme {
	return themes[brandId] ?? seoTheme;
}

export { catholicTheme, salesTheme, seoTheme, sharklyTheme };
