import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createStemSeparation,
	getStemSeparationByType,
	type StemSeparationType
} from '$lib/db.server';
import { separateVocals } from '$lib/kie-api.server';
import {
	asEnum,
	asNonEmptyString,
	asPositiveInt,
	parseJsonBody,
	requireGeneration,
	startStemSeparationTask
} from '$lib/api-helpers.server';

const STEM_SEPARATION_TYPES = ['separate_vocal', 'split_stem'] as const;

export const POST: RequestHandler = async ({ request }) => {
	const body = await parseJsonBody(request);
	const generationId = asPositiveInt(body.generationId, 'generationId');
	const audioId = asNonEmptyString(body.audioId, 'audioId');
	const type = asEnum(body.type, STEM_SEPARATION_TYPES, 'type');

	const generation = requireGeneration(generationId);

	if (!generation.task_id) {
		throw error(400, 'Generation has no task_id - it may still be processing');
	}

	// Check if this exact separation already exists and is not an error
	const existingSeparation = getStemSeparationByType(
		generationId,
		audioId,
		type as StemSeparationType
	);
	if (existingSeparation && existingSeparation.status !== 'error') {
		// Return existing separation instead of creating a new one
		return json(existingSeparation);
	}

	// Create stem separation record
	const separation = createStemSeparation(generationId, audioId, type as StemSeparationType);

	// Start async stem separation process
	startStemSeparationTask(separation.id, generationId, audioId, () =>
		separateVocals({
			taskId: generation.task_id!,
			audioId,
			type,
			callBackUrl: 'https://api.example.com/callback'
		})
	).catch(console.error);

	return json(separation);
};
