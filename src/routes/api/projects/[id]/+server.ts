import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateProjectName, setProjectOpen, getGenerationsByProject } from '$lib/db.server';
import { parseIntParam, requireProject } from '$lib/api-helpers.server';

export const GET: RequestHandler = async ({ params }) => {
	const id = parseIntParam(params.id);
	const project = requireProject(id);

	const generations = getGenerationsByProject(id);

	return json({ project, generations });
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	const id = parseIntParam(params.id);
	const body = await request.json();

	requireProject(id);

	// Update name if provided
	if (body.name !== undefined) {
		updateProjectName(id, body.name);
	}

	// Update is_open if provided
	if (body.is_open !== undefined) {
		setProjectOpen(id, body.is_open);
	}

	return json({ success: true });
};
