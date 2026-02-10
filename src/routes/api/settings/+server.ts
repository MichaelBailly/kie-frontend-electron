import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getApiKey, setApiKey, setSetting } from '$lib/db.server';

export const GET: RequestHandler = async () => {
	const apiKey = getApiKey();

	return json({
		apiKey: apiKey ? maskApiKey(apiKey) : null,
		hasApiKey: !!apiKey
	});
};

export const PUT: RequestHandler = async ({ request }) => {
	const body = await request.json();

	if (body.apiKey !== undefined) {
		if (body.apiKey === null || body.apiKey === '') {
			// Clear the API key
			setSetting('kie_api_key', '');
		} else {
			setApiKey(body.apiKey);
		}
	}

	const apiKey = getApiKey();

	return json({
		apiKey: apiKey ? maskApiKey(apiKey) : null,
		hasApiKey: !!apiKey,
		success: true
	});
};

function maskApiKey(apiKey: string): string {
	if (apiKey.length <= 8) {
		return '*'.repeat(apiKey.length);
	}
	return apiKey.slice(0, 4) + '*'.repeat(apiKey.length - 8) + apiKey.slice(-4);
}
