import type { PageServerLoad } from './$types';
import { getApiKey, getSunoModel } from '$lib/db.server';
import { SUNO_MODELS } from '$lib/types';
import { maskApiKey } from '$lib/utils/mask-api-key';

export const load: PageServerLoad = async () => {
	const apiKey = getApiKey();

	return {
		hasApiKey: !!apiKey && apiKey.length > 0,
		maskedApiKey: apiKey ? maskApiKey(apiKey) : null,
		sunoModel: getSunoModel(),
		sunoModels: SUNO_MODELS
	};
};
