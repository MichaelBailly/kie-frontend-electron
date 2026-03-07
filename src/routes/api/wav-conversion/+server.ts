import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createWavConversion, getWavConversionByGenerationAndAudio } from '$lib/db.server';
import { convertToWav } from '$lib/kie-api.server';
import { KIE_CALLBACK_URL } from '$lib/constants.server';
import {
	asNonEmptyString,
	asPositiveInt,
	parseJsonBody,
	requireGeneration,
	startWavConversionTask
} from '$lib/api-helpers.server';

export const POST: RequestHandler = async ({ request }) => {
	const body = await parseJsonBody(request);
	const generationId = asPositiveInt(body.generationId, 'generationId');
	const audioId = asNonEmptyString(body.audioId, 'audioId');

	const generation = requireGeneration(generationId);
	if (!generation.task_id) {
		throw error(400, 'Generation has no task_id - it may still be processing');
	}

	const existingConversion = getWavConversionByGenerationAndAudio(generationId, audioId);
	if (existingConversion && existingConversion.status !== 'error') {
		return json(existingConversion);
	}

	const conversion = createWavConversion(generationId, audioId);

	startWavConversionTask(conversion.id, generationId, audioId, () =>
		convertToWav({
			taskId: generation.task_id!,
			audioId,
			callBackUrl: KIE_CALLBACK_URL
		})
	).catch((err) =>
		console.error(`[AsyncTask] wav conversion ${conversion.id} failed to start:`, err)
	);

	return json(conversion);
};
