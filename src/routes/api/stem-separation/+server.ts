import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createStemSeparation,
	getStemSeparationByType,
	type StemSeparationType
} from '$lib/db.server';
import { separateVocals } from '$lib/kie-api.server';
import {
	requireFields,
	requireGeneration,
	startStemSeparationTask
} from '$lib/api-helpers.server';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { generationId, audioId, type } = body;

	requireFields(body, ['generationId', 'audioId', 'type']);

	if (type !== 'separate_vocal' && type !== 'split_stem') {
		throw error(400, 'Invalid type. Must be "separate_vocal" or "split_stem"');
	}

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
