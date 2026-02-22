import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getAssetFilePath, isValidAssetFileName } from '$lib/server/assets-cache.server';

function getContentType(assetId: string): string {
	const extension = path.extname(assetId).toLowerCase();

	switch (extension) {
		case '.mp3':
			return 'audio/mpeg';
		case '.wav':
			return 'audio/wav';
		case '.ogg':
			return 'audio/ogg';
		case '.m4a':
			return 'audio/mp4';
		case '.png':
			return 'image/png';
		case '.webp':
			return 'image/webp';
		case '.gif':
			return 'image/gif';
		case '.jpg':
		case '.jpeg':
		default:
			return 'image/jpeg';
	}
}

export const GET: RequestHandler = async ({ params }) => {
	const assetId = params.assetId;
	if (!assetId || !isValidAssetFileName(assetId)) {
		throw error(404, 'Asset not found');
	}

	const assetPath = getAssetFilePath(assetId);

	try {
		const fileBuffer = await readFile(assetPath);
		return new Response(fileBuffer, {
			headers: {
				'Content-Type': getContentType(assetId),
				'Cache-Control': 'public, max-age=31536000, immutable'
			}
		});
	} catch {
		throw error(404, 'Asset not found');
	}
};
