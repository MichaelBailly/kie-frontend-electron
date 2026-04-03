import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { MAX_UPLOAD_AUDIO_BYTES } from '$lib/constants';
import { createTemporaryUploadedAudio } from '$lib/server/assets-cache.server';
import { uploadToTemporaryHost } from '$lib/server/file-upload.server';
import path from 'node:path';

function sanitizeExtension(fileName: string): string {
	const extension = path.extname(fileName).toLowerCase();
	if (/^[.][a-z0-9]{1,6}$/i.test(extension)) {
		return extension;
	}

	return '.mp3';
}

function sanitizeFileName(fileName: string): string {
	const baseName = path.basename(fileName || 'upload-audio');
	return baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export const POST: RequestHandler = async ({ request }) => {
	const formData = await request.formData();
	const file = formData.get('file');

	if (!(file instanceof File)) {
		throw error(400, 'Missing file upload');
	}

	if (file.size <= 0) {
		throw error(400, 'Uploaded file is empty');
	}

	if (file.size > MAX_UPLOAD_AUDIO_BYTES) {
		throw error(
			413,
			`File too large (max ${Math.round(MAX_UPLOAD_AUDIO_BYTES / (1024 * 1024))}MB)`
		);
	}

	if (file.type && !file.type.startsWith('audio/')) {
		throw error(400, 'Only audio files are allowed');
	}

	const safeFileName = sanitizeFileName(file.name);
	const extension = sanitizeExtension(safeFileName);
	const fileBuffer = Buffer.from(await file.arrayBuffer());

	const temporaryFileName = await createTemporaryUploadedAudio(fileBuffer, extension);
	const remoteUrl = await uploadToTemporaryHost(
		fileBuffer,
		safeFileName,
		file.type || 'audio/mpeg'
	);

	return json({
		temporaryFileName,
		remoteUrl,
		originalFileName: safeFileName,
		size: file.size
	});
};
