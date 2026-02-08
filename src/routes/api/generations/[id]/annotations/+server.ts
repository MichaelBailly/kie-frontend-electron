import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getAnnotation,
	getGeneration,
	toggleStar,
	updateComment
} from '$lib/db.server';
import { notifyAnnotationClients } from '$lib/sse.server';

export const GET: RequestHandler = async ({ params, url }) => {
	const generationId = parseInt(params.id);
	const audioId = url.searchParams.get('audioId');

	if (!audioId) {
		throw error(400, 'audioId query parameter is required');
	}

	const generation = getGeneration(generationId);
	if (!generation) {
		throw error(404, 'Generation not found');
	}

	const annotation = getAnnotation(generationId, audioId);
	return json(annotation ?? { generation_id: generationId, audio_id: audioId, starred: 0, comment: null });
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	const generationId = parseInt(params.id);
	const body = await request.json();
	const { audioId, action, comment } = body as {
		audioId: string;
		action?: 'toggle_star';
		comment?: string;
	};

	if (!audioId) {
		throw error(400, 'audioId is required');
	}

	const generation = getGeneration(generationId);
	if (!generation) {
		throw error(404, 'Generation not found');
	}

	// Validate audioId belongs to this generation
	if (audioId !== generation.track1_audio_id && audioId !== generation.track2_audio_id) {
		throw error(400, 'audioId does not belong to this generation');
	}

	let annotation;

	if (action === 'toggle_star') {
		annotation = toggleStar(generationId, audioId);
	} else if (comment !== undefined) {
		annotation = updateComment(generationId, audioId, comment);
	} else {
		throw error(400, 'Must provide action or comment');
	}

	// Broadcast update via SSE
	notifyAnnotationClients(generationId, audioId, annotation);

	return json(annotation);
};
