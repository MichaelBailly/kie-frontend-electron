import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createGeneration } from '$lib/db.server';
import { generateMusic } from '$lib/kie-api.server';
import { KIE_CALLBACK_URL } from '$lib/constants.server';
import {
	asNonEmptyString,
	asPositiveInt,
	parseJsonBody,
	requireProject,
	startGenerationTask
} from '$lib/api-helpers.server';

export const POST: RequestHandler = async ({ request }) => {
	const body = await parseJsonBody(request);
	const projectId = asPositiveInt(body.projectId, 'projectId');
	const title = asNonEmptyString(body.title, 'title');
	const style = asNonEmptyString(body.style, 'style');
	const lyrics = asNonEmptyString(body.lyrics, 'lyrics');
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
			callBackUrl: KIE_CALLBACK_URL,
			negativeTags: ''
		})
	).catch((err) => console.error(`[AsyncTask] generation ${generation.id} failed to start:`, err));

	return json(generation);
};
