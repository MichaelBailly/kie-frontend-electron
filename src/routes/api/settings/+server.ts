import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getApiKey, setApiKey, setSetting } from '$lib/db.server';
import { asNullableString, parseJsonBody } from '$lib/api-helpers.server';
import { maskApiKey } from '$lib/utils/mask-api-key';

export const GET: RequestHandler = async () => {
	const apiKey = getApiKey();

	return json({
		apiKey: apiKey ? maskApiKey(apiKey) : null,
		hasApiKey: !!apiKey
	});
};

export const PUT: RequestHandler = async ({ request }) => {
	const body = await parseJsonBody(request);

	if (body.apiKey !== undefined) {
		const apiKey = asNullableString(body.apiKey, 'apiKey');

		if (apiKey === null || apiKey === '') {
			// Clear the API key
			setSetting('kie_api_key', '');
		} else {
			setApiKey(apiKey);
		}
	}

	const apiKey = getApiKey();

	return json({
		apiKey: apiKey ? maskApiKey(apiKey) : null,
		hasApiKey: !!apiKey,
		success: true
	});
};
