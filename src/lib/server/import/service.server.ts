import { error } from '@sveltejs/kit';
import { createImportedGeneration, createProject } from '$lib/db.server';
import { getMusicDetails } from '$lib/kie-api.server';
import type { ImportRequestInput } from './parse.server';
import { validateImportableMusicDetails } from './validate-kie-response.server';

interface ImportServiceResult {
	project: {
		id: number;
		name: string;
	};
	generation: {
		id: number;
		title: string;
	};
}

function mapKieFetchErrorToHttpError(message: string): never {
	console.error('Failed to fetch music details from KIE:', message);

	if (message.includes('404')) {
		throw error(404, 'Task ID not found. Please verify the ID is correct.');
	}
	if (message.includes('401') || message.includes('403')) {
		throw error(502, 'API authentication failed. Please check server configuration.');
	}
	throw error(502, 'Failed to fetch song data from KIE API. Please try again later.');
}

export async function importSongFromTask(input: ImportRequestInput): Promise<ImportServiceResult> {
	let details: unknown;
	try {
		details = await getMusicDetails(input.taskId);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		mapKieFetchErrorToHttpError(message);
	}

	const { responseData, track1, track2 } = validateImportableMusicDetails(details);

	try {
		const defaultName = input.projectName?.trim() || `Imported: ${track1.title || 'Unknown Song'}`;
		const project = createProject(defaultName);

		const generation = createImportedGeneration(
			project.id,
			input.taskId,
			track1.title || 'Imported Song',
			track1.tags || '',
			track1.prompt || '',
			{
				streamUrl: track1.streamAudioUrl || '',
				audioUrl: track1.audioUrl,
				imageUrl: track1.imageUrl || '',
				duration: track1.duration || 0,
				audioId: track1.id
			},
			{
				streamUrl: track2?.streamAudioUrl || '',
				audioUrl: track2?.audioUrl || '',
				imageUrl: track2?.imageUrl || '',
				duration: track2?.duration || 0,
				audioId: track2?.id || ''
			},
			JSON.stringify(responseData)
		);

		return {
			project: {
				id: project.id,
				name: project.name
			},
			generation: {
				id: generation.id,
				title: generation.title
			}
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		console.error('Database error during import:', message);
		throw error(500, 'Failed to save imported song to database. Please try again.');
	}
}
