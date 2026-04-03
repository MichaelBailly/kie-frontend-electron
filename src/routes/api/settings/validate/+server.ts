import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getApiKey } from '$lib/db.server';
import { asOptionalString, parseJsonBody } from '$lib/api-helpers.server';
import { KIE_API_BASE } from '$lib/constants';

export const POST: RequestHandler = async ({ request }) => {
	const body = await parseJsonBody(request);
	const providedApiKey = asOptionalString(body.apiKey, 'apiKey').trim();
	const apiKey = providedApiKey || getApiKey();

	if (!apiKey) {
		return json({
			valid: false,
			error: 'No API key provided'
		});
	}

	try {
		// Test the API key by making a simple request
		// We'll use the account/balance endpoint if available, or try a lightweight endpoint
		const response = await fetch(`${KIE_API_BASE}/account/info`, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${apiKey}`
			}
		});

		const data = await response.json();

		if (data.code === 200) {
			return json({
				valid: true,
				message: 'API key is valid'
			});
		} else if (data.code === 401 || data.msg?.toLowerCase().includes('permission')) {
			return json({
				valid: false,
				error: 'Invalid API key or insufficient permissions'
			});
		} else {
			// Some other response - key might still be valid
			return json({
				valid: true,
				message: 'API key accepted',
				warning: data.msg
			});
		}
	} catch (err) {
		return json({
			valid: false,
			error: err instanceof Error ? err.message : 'Failed to validate API key'
		});
	}
};
