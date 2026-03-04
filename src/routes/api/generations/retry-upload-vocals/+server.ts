import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createUploadVocalsGeneration,
	getGeneration,
	setGenerationSourceAudioLocalUrl
} from '$lib/db.server';
import { addVocals } from '$lib/kie-api.server';
import { KIE_CALLBACK_URL } from '$lib/constants.server';
import {
	asNonEmptyString,
	asOptionalString,
	normalizeNegativeTags,
	parseJsonBody,
	startGenerationTask
} from '$lib/api-helpers.server';
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

export const POST: RequestHandler = async ({ request }) => {
	const body = await parseJsonBody(request);
	const sourceGenerationId = body.sourceGenerationId;
	if (typeof sourceGenerationId !== 'number' || !Number.isInteger(sourceGenerationId)) {
		throw error(400, 'Invalid sourceGenerationId: must be an integer');
	}

	const projectId = body.projectId;
	if (typeof projectId !== 'number' || !Number.isInteger(projectId)) {
		throw error(400, 'Invalid projectId: must be an integer');
	}

	const title = asNonEmptyString(body.title, 'title');
	const prompt = asNonEmptyString(body.prompt, 'prompt');
	const style = asNonEmptyString(body.style, 'style');
	const negativeTags = asOptionalString(body.negativeTags, 'negativeTags').trim();
	const negativeTagsForApi = normalizeNegativeTags(negativeTags);

	// Retrieve source generation and verify it has local audio
	const sourceGeneration = getGeneration(sourceGenerationId);
	if (!sourceGeneration) {
		throw error(404, 'Source generation not found');
	}
	if (
		sourceGeneration.generation_type !== 'upload_instrumental' &&
		sourceGeneration.generation_type !== 'upload_vocals'
	) {
		throw error(400, 'Source generation is not an upload-based generation');
	}
	if (!sourceGeneration.source_audio_local_url) {
		throw error(400, 'Source generation has no local audio file available for retry');
	}

	// Read local audio file
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
	const mimeType = extension === '.mp3' ? 'audio/mpeg' : 'audio/mpeg';

	// Create a temporary copy then upload to remote host
	const temporaryFileName = await createTemporaryUploadedAudio(fileBuffer, extension);
	let remoteUrl: string;
	try {
		remoteUrl = await uploadToTemporaryHost(fileBuffer, fileName, mimeType);
	} catch (uploadErr) {
		await removeTemporaryUploadedAudio(temporaryFileName);
		console.error('[RetryUploadVocals] Failed to upload audio to remote host:', uploadErr);
		throw error(502, 'Failed to upload source audio to remote host');
	}

	// Create the new generation in the same project
	const generation = createUploadVocalsGeneration(projectId, title, style, prompt, negativeTags);

	// Finalize the local file copy for the new generation
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

	startGenerationTask(generation.id, () =>
		addVocals({
			uploadUrl: remoteUrl,
			title,
			prompt,
			style,
			negativeTags: negativeTagsForApi,
			model: 'V5',
			callBackUrl: KIE_CALLBACK_URL
		})
	).catch((err) =>
		console.error(
			`[AsyncTask] retry upload vocals generation ${generation.id} failed to start:`,
			err
		)
	);

	return json(generation);
};
