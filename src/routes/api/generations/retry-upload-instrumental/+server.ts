import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createUploadInstrumentalGeneration, getGeneration, getSunoModel } from '$lib/db.server';
import { addInstrumental } from '$lib/kie-api.server';
import { KIE_CALLBACK_URL } from '$lib/constants.server';
import {
	asNonEmptyString,
	asOptionalString,
	normalizeNegativeTags,
	parseJsonBody
} from '$lib/api-helpers.server';
import {
	finalizeGenerationSourceUpload,
	prepareRetryUploadSource,
	startLoggedUploadGenerationTask
} from '../upload-generation.server';

export const POST: RequestHandler = async ({ request }) => {
	const body = await parseJsonBody(request);
	const sourceGenerationId = body.sourceGenerationId;
	if (typeof sourceGenerationId !== 'number' || !Number.isInteger(sourceGenerationId)) {
		throw error(400, 'Invalid sourceGenerationId: must be an integer');
	}

	const projectId = body.projectId;
	if (typeof projectId !== 'number' || !Number.isInteger(projectId)) {
		throw error(400, 'Invalid projectId: must be an integer');
	}

	const title = asNonEmptyString(body.title, 'title');
	const tags = asNonEmptyString(body.tags, 'tags');
	const negativeTags = normalizeNegativeTags(asOptionalString(body.negativeTags, 'negativeTags'));
	const sunoModel = getSunoModel();

	const sourceGeneration = getGeneration(sourceGenerationId);
	if (!sourceGeneration) {
		throw error(404, 'Source generation not found');
	}
	const { remoteUrl, temporaryFileName } = await prepareRetryUploadSource({
		sourceGeneration,
		logLabel: 'RetryUploadInstrumental'
	});

	const generation = createUploadInstrumentalGeneration(
		projectId,
		title,
		tags,
		negativeTags,
		null,
		sunoModel
	);

	await finalizeGenerationSourceUpload(generation, temporaryFileName);

	startLoggedUploadGenerationTask(generation.id, 'retry upload instrumental', () =>
		addInstrumental({
			uploadUrl: remoteUrl,
			title,
			tags,
			negativeTags,
			model: sunoModel,
			callBackUrl: KIE_CALLBACK_URL
		})
	);

	return json(generation);
};
