import { error } from '@sveltejs/kit';
import type { GenerateMusicResponse } from '$lib/kie-api.server';
import type { Generation, GenerationType } from '$lib/types';
import { setGenerationSourceAudioLocalUrl } from '$lib/db.server';
import { startGenerationTask } from '$lib/api-helpers.server';
import {
	createTemporaryUploadedAudio,
	finalizeTemporaryUploadedAudio,
	getAssetFileNameFromLocalUrl,
	getAssetFilePath,
	removeTemporaryUploadedAudio
} from '$lib/server/assets-cache.server';
import { uploadToTemporaryHost } from '$lib/server/file-upload.server';
import { promises as fs } from 'node:fs';
import path from 'node:path';

type UploadGeneration = Pick<Generation, 'id' | 'source_audio_local_url'>;

const RETRYABLE_UPLOAD_GENERATION_TYPES: GenerationType[] = [
	'upload_instrumental',
	'upload_vocals'
];

export function buildUploadProjectName(
	prefix: string,
	title: string,
	projectNameRaw: string
): string {
	const projectName = projectNameRaw.trim();
	return projectName || `${prefix}: ${title}`;
}

export async function finalizeGenerationSourceUpload(
	generation: UploadGeneration,
	temporaryFileName: string
): Promise<void> {
	try {
		const sourceAudioLocalUrl = await finalizeTemporaryUploadedAudio(
			generation.id,
			temporaryFileName
		);
		setGenerationSourceAudioLocalUrl(generation.id, sourceAudioLocalUrl);
		generation.source_audio_local_url = sourceAudioLocalUrl;
	} catch (err) {
		await removeTemporaryUploadedAudio(temporaryFileName);
		throw err;
	}
}

export function startLoggedUploadGenerationTask(
	generationId: number,
	label: string,
	apiCall: () => Promise<GenerateMusicResponse>
): void {
	void Promise.resolve(startGenerationTask(generationId, apiCall)).catch((err) =>
		console.error(`[AsyncTask] ${label} generation ${generationId} failed to start:`, err)
	);
}

function ensureRetryableUploadGeneration(sourceGeneration: Generation): void {
	if (!RETRYABLE_UPLOAD_GENERATION_TYPES.includes(sourceGeneration.generation_type)) {
		throw error(400, 'Source generation is not an upload-based generation');
	}

	if (!sourceGeneration.source_audio_local_url) {
		throw error(400, 'Source generation has no local audio file available for retry');
	}
}

export async function prepareRetryUploadSource(options: {
	sourceGeneration: Generation;
	logLabel: string;
}): Promise<{ remoteUrl: string; temporaryFileName: string }> {
	const { sourceGeneration, logLabel } = options;
	ensureRetryableUploadGeneration(sourceGeneration);

	const fileName = getAssetFileNameFromLocalUrl(sourceGeneration.source_audio_local_url);
	if (!fileName) {
		throw error(400, 'Could not resolve local audio file path');
	}

	const filePath = getAssetFilePath(fileName);
	let fileBuffer: Buffer;
	try {
		fileBuffer = await fs.readFile(filePath);
	} catch {
		throw error(400, 'Source audio file not found on disk');
	}

	const extension = path.extname(fileName) || '.mp3';
	const temporaryFileName = await createTemporaryUploadedAudio(fileBuffer, extension);

	try {
		const remoteUrl = await uploadToTemporaryHost(fileBuffer, fileName, 'audio/mpeg');
		return { remoteUrl, temporaryFileName };
	} catch (uploadErr) {
		await removeTemporaryUploadedAudio(temporaryFileName);
		console.error(`[${logLabel}] Failed to upload audio to remote host:`, uploadErr);
		throw error(502, 'Failed to upload source audio to remote host');
	}
}
