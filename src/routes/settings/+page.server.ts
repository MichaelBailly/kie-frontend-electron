import type { PageServerLoad } from './$types';
import { getApiKey } from '$lib/db.server';

export const load: PageServerLoad = async () => {
	const apiKey = getApiKey();

	return {
		hasApiKey: !!apiKey && apiKey.length > 0,
		maskedApiKey: apiKey ? maskApiKey(apiKey) : null
	};
};

function maskApiKey(apiKey: string): string {
	if (apiKey.length <= 8) {
		return '*'.repeat(apiKey.length);
	}
	return apiKey.slice(0, 4) + '*'.repeat(apiKey.length - 8) + apiKey.slice(-4);
}
