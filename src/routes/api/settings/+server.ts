import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getApiKey, getSunoModel, setApiKey, setSetting, setSunoModel } from '$lib/db.server';
import { asEnum, asNullableString, parseJsonBody } from '$lib/api-helpers.server';
import { SUNO_MODELS } from '$lib/types';
import { maskApiKey } from '$lib/utils/mask-api-key';

const SUNO_MODEL_VALUES = SUNO_MODELS.map((model) => model.value);

export const GET: RequestHandler = async () => {
	const apiKey = getApiKey();

	return json({
		apiKey: apiKey ? maskApiKey(apiKey) : null,
		hasApiKey: !!apiKey,
		sunoModel: getSunoModel()
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

	if (body.sunoModel !== undefined) {
		setSunoModel(asEnum(body.sunoModel, SUNO_MODEL_VALUES, 'sunoModel'));
	}

	const apiKey = getApiKey();

	return json({
		apiKey: apiKey ? maskApiKey(apiKey) : null,
		hasApiKey: !!apiKey,
		sunoModel: getSunoModel(),
		success: true
	});
};
