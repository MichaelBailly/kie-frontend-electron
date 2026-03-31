import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createExtendGeneration, getSunoModel } from '$lib/db.server';
import { extendMusic, uploadExtendMusic } from '$lib/kie-api.server';
import { KIE_CALLBACK_URL } from '$lib/constants.server';
import {
	asNonEmptyString,
	asNonNegativeNumber,
	asOptionalString,
	asPositiveInt,
	normalizeNegativeTags,
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
	const instrumental = body.instrumental === true;
	const lyrics = instrumental ? String(body.lyrics ?? '') : asNonEmptyString(body.lyrics, 'lyrics');
	const negativeTags = asOptionalString(body.negativeTags, 'negativeTags').trim();
	const extendsGenerationId = asPositiveInt(body.extendsGenerationId, 'extendsGenerationId');
	const extendsAudioId = asNonEmptyString(body.extendsAudioId, 'extendsAudioId');
	const hasStemUrl = body.stemUrl !== undefined && body.stemUrl !== null && body.stemUrl !== '';
	const hasStemType = body.stemType !== undefined && body.stemType !== null && body.stemType !== '';

	if (hasStemUrl !== hasStemType) {
		throw error(400, 'stemUrl and stemType must be provided together');
	}

	const stemUrl = hasStemUrl ? asNonEmptyString(body.stemUrl, 'stemUrl') : null;
	const stemType = hasStemType ? asNonEmptyString(body.stemType, 'stemType') : null;

	if (body.continueAt === undefined || body.continueAt === null) {
		throw error(400, 'Invalid continueAt value');
	}

	const continueAt = asNonNegativeNumber(body.continueAt, 'continueAt');

	requireProject(projectId);
	requireGeneration(extendsGenerationId, 'Parent generation');
	const sunoModel = getSunoModel();

	// Create extend generation record
	const generation = createExtendGeneration(
		projectId,
		title,
		style,
		lyrics,
		extendsGenerationId,
		extendsAudioId,
		continueAt,
		instrumental,
		{
			negativeTags,
			stemType: stemType ?? undefined,
			stemUrl: stemUrl ?? undefined,
			model: sunoModel
		}
	);

	// Start async extend generation process
	startGenerationTask(generation.id, () => {
		if (stemUrl) {
			return uploadExtendMusic({
				defaultParamFlag: true,
				uploadUrl: stemUrl,
				prompt: lyrics,
				style,
				title,
				continueAt,
				instrumental,
				model: sunoModel,
				callBackUrl: KIE_CALLBACK_URL,
				negativeTags: normalizeNegativeTags(negativeTags)
			});
		}

		return extendMusic({
			defaultParamFlag: true,
			audioId: extendsAudioId,
			prompt: lyrics,
			style,
			title,
			continueAt,
			instrumental,
			model: sunoModel,
			callBackUrl: KIE_CALLBACK_URL,
			negativeTags: normalizeNegativeTags(negativeTags)
		});
	}).catch((err) =>
		console.error(`[AsyncTask] extend generation ${generation.id} failed to start:`, err)
	);

	return json(generation);
};
