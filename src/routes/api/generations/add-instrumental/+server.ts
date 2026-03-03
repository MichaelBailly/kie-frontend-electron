import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAddInstrumentalGeneration } from '$lib/db.server';
import { addInstrumental } from '$lib/kie-api.server';
import { KIE_CALLBACK_URL } from '$lib/constants.server';
import {
	asNonEmptyString,
	asPositiveInt,
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
	const tags = asNonEmptyString(body.tags, 'tags');
	const negativeTags = typeof body.negativeTags === 'string' ? body.negativeTags.trim() : '';
	const negativeTagsForApi = negativeTags || 'none';

	requireProject(projectId);
	requireGeneration(sourceGenerationId, 'Source generation');

	const generation = createAddInstrumentalGeneration(
		projectId,
		title,
		tags,
		negativeTags,
		sourceGenerationId,
		sourceAudioId,
		stemType,
		stemUrl
	);

	startGenerationTask(generation.id, () =>
		addInstrumental({
			uploadUrl: stemUrl,
			title,
			tags,
			negativeTags: negativeTagsForApi,
			model: 'V4_5PLUS',
			callBackUrl: KIE_CALLBACK_URL
		})
	).catch((err) =>
		console.error(`[AsyncTask] add instrumental generation ${generation.id} failed to start:`, err)
	);

	return json(generation);
};
