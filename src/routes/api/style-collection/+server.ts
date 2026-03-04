import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllStyles, createStyle, searchStyles } from '$lib/db.server';

export const GET: RequestHandler = async ({ url }) => {
	const query = url.searchParams.get('q') ?? '';
	const limitParam = url.searchParams.get('limit');
	const limit = limitParam ? Number(limitParam) : 20;

	if (Number.isNaN(limit) || limit < 1 || limit > 100) {
		throw error(400, 'limit must be between 1 and 100');
	}

	if (query.trim().length > 256) {
		throw error(400, 'query must be 256 characters or less');
	}

	const styles = query.trim() ? searchStyles(query.trim(), limit) : getAllStyles();
	return json({ styles });
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	if (!body || typeof body !== 'object') {
		throw error(400, 'Invalid request body');
	}

	const { name, style, description = '' } = body as Record<string, unknown>;

	if (typeof name !== 'string' || !name.trim()) {
		throw error(400, 'name is required');
	}
	if (typeof style !== 'string' || !style.trim()) {
		throw error(400, 'style is required');
	}
	if (typeof description !== 'string') {
		throw error(400, 'description must be a string');
	}

	if (name.trim().length > 100) {
		throw error(400, 'name must be 100 characters or less');
	}
	if (style.trim().length > 2000) {
		throw error(400, 'style must be 2000 characters or less');
	}
	if (description.trim().length > 500) {
		throw error(400, 'description must be 500 characters or less');
	}

	const created = createStyle(name, style, description);
	return json(created, { status: 201 });
};
