import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createExtendGeneration } from '$lib/db.server';
import { extendMusic } from '$lib/kie-api.server';
import {
	requireFields,
	requireProject,
	requireGeneration,
	startGenerationTask
} from '$lib/api-helpers.server';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { projectId, title, style, lyrics, extendsGenerationId, extendsAudioId, continueAt } =
		body;

	requireFields(body, ['projectId', 'title', 'style', 'lyrics', 'extendsGenerationId', 'extendsAudioId']);

	if (continueAt === undefined || continueAt === null || continueAt < 0) {
		throw error(400, 'Invalid continueAt value');
	}

	requireProject(projectId);
	requireGeneration(extendsGenerationId, 'Parent generation');

	// Create extend generation record
	const generation = createExtendGeneration(
		projectId,
		title,
		style,
		lyrics,
		extendsGenerationId,
		extendsAudioId,
		continueAt
	);

	// Start async extend generation process
	startGenerationTask(generation.id, () =>
		extendMusic({
			defaultParamFlag: true,
			audioId: extendsAudioId,
			prompt: lyrics,
			style,
			title,
			continueAt,
			model: 'V5',
			callBackUrl: 'https://api.example.com/callback',
			negativeTags: ''
		})
	).catch(console.error);

	return json(generation);
};
