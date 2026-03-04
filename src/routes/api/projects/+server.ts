import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createProject, getAllProjects } from '$lib/db.server';
import { asOptionalString, parseJsonBody } from '$lib/api-helpers.server';

export const GET: RequestHandler = async () => {
	const projects = getAllProjects();
	return json(projects);
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await parseJsonBody(request);
	const name = asOptionalString(body.name, 'name').trim();
	const project = createProject(name || 'New Project');
	return json(project);
};
