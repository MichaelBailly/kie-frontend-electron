import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createExtendGeneration } from '$lib/db.server';
import { extendMusic } from '$lib/kie-api.server';
import { KIE_CALLBACK_URL } from '$lib/constants.server';
import {
	asNonEmptyString,
	asNonNegativeNumber,
	asPositiveInt,
	parseJsonBody,
	requireProject,
	requireGeneration,
	startGenerationTask
} from '$lib/api-helpers.server';

export const POST: RequestHandler = async ({ request }) => {
	const body = await parseJsonBody(request);
	const projectId = asPositiveInt(body.projectId, 'projectId');
	const title = asNonEmptyString(body.title, 'title');
	const style = asNonEmptyString(body.style, 'style');
	const lyrics = asNonEmptyString(body.lyrics, 'lyrics');
	const extendsGenerationId = asPositiveInt(body.extendsGenerationId, 'extendsGenerationId');
	const extendsAudioId = asNonEmptyString(body.extendsAudioId, 'extendsAudioId');

	if (body.continueAt === undefined || body.continueAt === null) {
		throw error(400, 'Invalid continueAt value');
	}

	const continueAt = asNonNegativeNumber(body.continueAt, 'continueAt');

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
			callBackUrl: KIE_CALLBACK_URL,
			negativeTags: ''
		})
	).catch((err) =>
		console.error(`[AsyncTask] extend generation ${generation.id} failed to start:`, err)
	);

	return json(generation);
};
