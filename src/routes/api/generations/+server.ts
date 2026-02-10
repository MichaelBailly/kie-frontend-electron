import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createGeneration } from '$lib/db.server';
import { generateMusic } from '$lib/kie-api.server';
import { requireFields, requireProject, startGenerationTask } from '$lib/api-helpers.server';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { projectId, title, style, lyrics } = body;
	requireFields(body, ['projectId', 'title', 'style', 'lyrics']);
	requireProject(projectId);

	// Create generation record
	const generation = createGeneration(projectId, title, style, lyrics);

	// Start async generation process
	startGenerationTask(generation.id, () =>
		generateMusic({
			prompt: lyrics,
			style,
			title,
			customMode: true,
			instrumental: false,
			model: 'V5',
			callBackUrl: 'https://api.example.com/callback',
			negativeTags: ''
		})
	).catch(console.error);

	return json(generation);
};
