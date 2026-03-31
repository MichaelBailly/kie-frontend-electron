import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAddInstrumentalGeneration, getSunoModel } from '$lib/db.server';
import { addInstrumental } from '$lib/kie-api.server';
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
	const tags = asNonEmptyString(body.tags, 'tags');
	const negativeTags = asOptionalString(body.negativeTags, 'negativeTags').trim();
	const negativeTagsForApi = normalizeNegativeTags(negativeTags);

	requireProject(projectId);
	requireGeneration(sourceGenerationId, 'Source generation');
	const sunoModel = getSunoModel();

	const generation = createAddInstrumentalGeneration(
		projectId,
		title,
		tags,
		negativeTags,
		sourceGenerationId,
		sourceAudioId,
		stemType,
		stemUrl,
		sunoModel
	);

	startGenerationTask(generation.id, () =>
		addInstrumental({
			uploadUrl: stemUrl,
			title,
			tags,
			negativeTags: negativeTagsForApi,
			model: sunoModel,
			callBackUrl: KIE_CALLBACK_URL
		})
	).catch((err) =>
		console.error(`[AsyncTask] add instrumental generation ${generation.id} failed to start:`, err)
	);

	return json(generation);
};
