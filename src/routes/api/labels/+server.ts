import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getLabelSuggestions } from '$lib/db.server';

export const GET: RequestHandler = async ({ url }) => {
	const query = url.searchParams.get('query') ?? '';
	const limitParam = url.searchParams.get('limit');
	const limit = limitParam ? Number(limitParam) : 8;

	if (Number.isNaN(limit) || limit < 1 || limit > 50) {
		throw error(400, 'limit must be between 1 and 50');
	}

	if (query.trim().length > 128) {
		throw error(400, 'query must be 128 characters or less');
	}

	const suggestions = getLabelSuggestions(query, limit);
	return json({ suggestions });
};
