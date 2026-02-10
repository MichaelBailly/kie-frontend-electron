import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAnnotation, setAnnotationLabels, toggleStar, updateComment } from '$lib/db.server';
import { notifyAnnotationClients } from '$lib/sse.server';
import { parseIntParam, requireGeneration } from '$lib/api-helpers.server';

export const GET: RequestHandler = async ({ params, url }) => {
	const generationId = parseIntParam(params.id);
	const audioId = url.searchParams.get('audioId');

	if (!audioId) {
		throw error(400, 'audioId query parameter is required');
	}

	requireGeneration(generationId);

	const annotation = getAnnotation(generationId, audioId);
	return json(
		annotation ?? {
			generation_id: generationId,
			audio_id: audioId,
			starred: 0,
			comment: null,
			labels: []
		}
	);
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	const generationId = parseIntParam(params.id);
	const body = await request.json();
	const { audioId, action, comment } = body as {
		audioId: string;
		action?: 'toggle_star' | 'set_labels';
		comment?: string;
		labels?: string[];
	};

	if (!audioId) {
		throw error(400, 'audioId is required');
	}

	const generation = requireGeneration(generationId);

	// Validate audioId belongs to this generation
	if (audioId !== generation.track1_audio_id && audioId !== generation.track2_audio_id) {
		throw error(400, 'audioId does not belong to this generation');
	}

	let annotation;

	if (action === 'toggle_star') {
		annotation = toggleStar(generationId, audioId);
	} else if (action === 'set_labels') {
		if (!Array.isArray(body.labels)) {
			throw error(400, 'labels must be an array');
		}
		for (const label of body.labels) {
			if (typeof label !== 'string') {
				throw error(400, 'labels must be strings');
			}
			if (label.trim().length > 128) {
				throw error(400, 'labels must be 128 characters or less');
			}
		}
		annotation = setAnnotationLabels(generationId, audioId, body.labels);
	} else if (comment !== undefined) {
		annotation = updateComment(generationId, audioId, comment);
	} else {
		throw error(400, 'Must provide action or comment');
	}

	// Broadcast update via SSE
	notifyAnnotationClients(generationId, audioId, annotation);

	return json(annotation);
};
