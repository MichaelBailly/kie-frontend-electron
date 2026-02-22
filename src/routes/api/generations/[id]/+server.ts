import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteGeneration } from '$lib/db.server';
import { parseIntParam, requireGeneration } from '$lib/api-helpers.server';
import { deleteGenerationCachedAssets } from '$lib/server/assets-cache.server';

export const GET: RequestHandler = async ({ params }) => {
	const id = parseIntParam(params.id);
	const generation = requireGeneration(id);

	return json(generation);
};

export const DELETE: RequestHandler = async ({ params }) => {
	const id = parseIntParam(params.id);
	const generation = requireGeneration(id);

	await deleteGenerationCachedAssets(generation);

	deleteGeneration(id);
	return json({ success: true });
};
