import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createExtendGeneration,
	updateGenerationTaskId,
	updateGenerationStatus
} from '$lib/db.server';
import { extendMusic } from '$lib/kie-api.server';
import { notifyClients } from '$lib/sse.server';
import { pollForResults } from '$lib/polling.server';
import {
	requireFields,
	requireProject,
	requireGeneration,
	getErrorMessage
} from '$lib/api-helpers.server';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { projectId, title, style, lyrics, extendsGenerationId, extendsAudioId, continueAt } =
		body;

	requireFields(body, ['projectId', 'title', 'style', 'lyrics', 'extendsGenerationId', 'extendsAudioId']);

	if (continueAt === undefined || continueAt === null || continueAt < 0) {
		throw error(400, 'Invalid continueAt value');
	}

	requireProject(projectId);
	requireGeneration(extendsGenerationId, 'Parent generation');

	// Create extend generation record
	const generation = createExtendGeneration(
		projectId,
		title,
		style,
		lyrics,
		extendsGenerationId,
		extendsAudioId,
		continueAt
	);

	// Start async extend generation process
	startExtendGeneration(generation.id, title, style, lyrics, extendsAudioId, continueAt).catch(
		console.error
	);

	return json(generation);
};

async function startExtendGeneration(
	generationId: number,
	title: string,
	style: string,
	lyrics: string,
	audioId: string,
	continueAt: number
) {
	try {
		// Call KIE API to extend music
		const response = await extendMusic({
			defaultParamFlag: true,
			audioId,
			prompt: lyrics,
			style,
			title,
			continueAt,
			model: 'V5',
			callBackUrl: 'https://api.example.com/callback',
			negativeTags: ''
		});

		if (response.code !== 200) {
			updateGenerationStatus(generationId, 'error', response.msg);
			notifyClients(generationId, 'generation_error', {
				status: 'error',
				error_message: response.msg
			});
			return;
		}

		const taskId = response.data.taskId;
		updateGenerationTaskId(generationId, taskId);
		notifyClients(generationId, 'generation_update', { status: 'processing', task_id: taskId });

		// Start polling for results (same as regular generation)
		pollForResults(generationId, taskId);
	} catch (err) {
		const errorMessage = getErrorMessage(err);
		updateGenerationStatus(generationId, 'error', errorMessage);
		notifyClients(generationId, 'generation_error', {
			status: 'error',
			error_message: errorMessage
		});
	}
}
