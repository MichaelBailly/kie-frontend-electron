import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteGeneration } from '$lib/db.server';
import { parseIntParam, requireGeneration } from '$lib/api-helpers.server';

export const GET: RequestHandler = async ({ params }) => {
	const id = parseIntParam(params.id);
	const generation = requireGeneration(id);

	return json(generation);
};

export const DELETE: RequestHandler = async ({ params }) => {
	const id = parseIntParam(params.id);
	requireGeneration(id);

	deleteGeneration(id);
	return json({ success: true });
};
