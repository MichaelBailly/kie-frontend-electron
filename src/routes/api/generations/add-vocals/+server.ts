import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAddVocalsGeneration } from '$lib/db.server';
import { addVocals } from '$lib/kie-api.server';
import { KIE_CALLBACK_URL } from '$lib/constants.server';
import {
	asOptionalString,
	asNonEmptyString,
	asPositiveInt,
	normalizeNegativeTags,
	parseJsonBody,
	requireGeneration,
	requireProject,
	startGenerationTask
} from '$lib/api-helpers.server';

export const POST: RequestHandler = async ({ request }) => {
	const body = await parseJsonBody(request);
	const projectId = asPositiveInt(body.projectId, 'projectId');
	const sourceGenerationId = asPositiveInt(body.sourceGenerationId, 'sourceGenerationId');
	const sourceAudioId = asNonEmptyString(body.sourceAudioId, 'sourceAudioId');
	const stemType = asNonEmptyString(body.stemType, 'stemType');
	const stemUrl = asNonEmptyString(body.stemUrl, 'stemUrl');
	const title = asNonEmptyString(body.title, 'title');
	const prompt = asNonEmptyString(body.prompt, 'prompt');
	const style = asNonEmptyString(body.style, 'style');
	const negativeTags = asOptionalString(body.negativeTags, 'negativeTags').trim();
	const negativeTagsForApi = normalizeNegativeTags(negativeTags);

	requireProject(projectId);
	requireGeneration(sourceGenerationId, 'Source generation');

	const generation = createAddVocalsGeneration(
		projectId,
		title,
		style,
		prompt,
		negativeTags,
		sourceGenerationId,
		sourceAudioId,
		stemType,
		stemUrl
	);

	startGenerationTask(generation.id, () =>
		addVocals({
			uploadUrl: stemUrl,
			title,
			prompt,
			style,
			negativeTags: negativeTagsForApi,
			model: 'V5',
			callBackUrl: KIE_CALLBACK_URL
		})
	).catch((err) =>
		console.error(`[AsyncTask] add vocals generation ${generation.id} failed to start:`, err)
	);

	return json(generation);
};
