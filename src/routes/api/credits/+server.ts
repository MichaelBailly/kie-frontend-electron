import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getApiKey } from '$lib/db.server';
import { getCreditInfo } from '$lib/kie-api.server';

export const GET: RequestHandler = async () => {
	const apiKey = getApiKey();

	if (!apiKey) {
		return json({ error: 'No API key configured' }, { status: 401 });
	}

	try {
		const creditInfo = await getCreditInfo();
		return json(creditInfo);
	} catch (err) {
		return json(
			{ error: err instanceof Error ? err.message : 'Failed to fetch credit information' },
			{ status: 502 }
		);
	}
};
