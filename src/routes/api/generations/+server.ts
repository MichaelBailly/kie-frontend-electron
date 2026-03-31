import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createGeneration, getSunoModel } from '$lib/db.server';
import { generateMusic } from '$lib/kie-api.server';
import { KIE_CALLBACK_URL } from '$lib/constants.server';
import {
	asNonEmptyString,
	asOptionalString,
	asPositiveInt,
	normalizeNegativeTags,
	parseJsonBody,
	requireProject,
	startGenerationTask
} from '$lib/api-helpers.server';

export const POST: RequestHandler = async ({ request }) => {
	const body = await parseJsonBody(request);
	const projectId = asPositiveInt(body.projectId, 'projectId');
	const title = asNonEmptyString(body.title, 'title');
	const style = asNonEmptyString(body.style, 'style');
	const instrumental = body.instrumental === true;
	const lyrics = instrumental ? String(body.lyrics ?? '') : asNonEmptyString(body.lyrics, 'lyrics');
	const negativeTags = asOptionalString(body.negativeTags, 'negativeTags').trim();
	requireProject(projectId);
	const sunoModel = getSunoModel();

	// Create generation record
	const generation = createGeneration(
		projectId,
		title,
		style,
		lyrics,
		instrumental,
		negativeTags,
		sunoModel
	);

	// Start async generation process
	startGenerationTask(generation.id, () =>
		generateMusic({
			prompt: lyrics,
			style,
			title,
			customMode: true,
			instrumental,
			model: sunoModel,
			callBackUrl: KIE_CALLBACK_URL,
			negativeTags: normalizeNegativeTags(negativeTags)
		})
	).catch((err) => console.error(`[AsyncTask] generation ${generation.id} failed to start:`, err));

	return json(generation);
};
