import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createStemSeparation,
	getStemSeparationByType,
	updateStemSeparationTaskId,
	updateStemSeparationStatus,
	type StemSeparationType
} from '$lib/db.server';
import { separateVocals } from '$lib/kie-api.server';
import { notifyStemSeparationClients } from '$lib/sse.server';
import { pollForStemSeparationResults } from '$lib/polling.server';
import { requireFields, requireGeneration, getErrorMessage } from '$lib/api-helpers.server';

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
	startStemSeparation(separation.id, generation.task_id, audioId, type, generationId).catch(
		console.error
	);

	return json(separation);
};

async function startStemSeparation(
	separationId: number,
	taskId: string,
	audioId: string,
	type: StemSeparationType,
	generationId: number
) {
	try {
		// Call KIE API to separate vocals
		const response = await separateVocals({
			taskId,
			audioId,
			type,
			callBackUrl: 'https://api.example.com/callback' // Not used, we poll instead
		});

		if (response.code !== 200) {
			updateStemSeparationStatus(separationId, 'error', response.msg);
			notifyStemSeparationClients(separationId, generationId, audioId, 'stem_separation_error', {
				status: 'error',
				error_message: response.msg
			});
			return;
		}

		const stemTaskId = response.data.taskId;
		updateStemSeparationTaskId(separationId, stemTaskId);
		notifyStemSeparationClients(separationId, generationId, audioId, 'stem_separation_update', {
			status: 'processing',
			task_id: stemTaskId
		});

		// Start polling for results
		pollForStemSeparationResults(separationId, stemTaskId, generationId, audioId);
	} catch (err) {
		const errorMessage = getErrorMessage(err);
		updateStemSeparationStatus(separationId, 'error', errorMessage);
		notifyStemSeparationClients(separationId, generationId, audioId, 'stem_separation_error', {
			status: 'error',
			error_message: errorMessage
		});
	}
}
