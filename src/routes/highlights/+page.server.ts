import type { PageServerLoad } from './$types';
import { getHighlightsPageData } from '$lib/routes/highlights-data.server';

export type {
	HighlightSong,
	HighlightVariation,
	HighlightStem,
	HighlightExtension,
	HighlightsPageData
} from '$lib/routes/highlights-data.server';

export const load: PageServerLoad = async () => getHighlightsPageData();
