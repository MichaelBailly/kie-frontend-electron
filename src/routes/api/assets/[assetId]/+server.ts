import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { open } from 'node:fs/promises';
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

export const GET: RequestHandler = async ({ params, request }) => {
	const assetId = params.assetId;
	if (!assetId || !isValidAssetFileName(assetId)) {
		throw error(404, 'Asset not found');
	}

	const assetPath = getAssetFilePath(assetId);
	const contentType = getContentType(assetId);

	let fd: Awaited<ReturnType<typeof open>> | null = null;
	try {
		fd = await open(assetPath, 'r');
		const { size } = await fd.stat();

		const rangeHeader = request.headers.get('Range');
		if (rangeHeader) {
			const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
			if (!match) {
				throw error(416, 'Range Not Satisfiable');
			}
			const start = match[1] ? parseInt(match[1], 10) : 0;
			const end = match[2] ? parseInt(match[2], 10) : size - 1;

			if (start > end || end >= size) {
				return new Response(null, {
					status: 416,
					headers: { 'Content-Range': `bytes */${size}` }
				});
			}

			const chunkSize = end - start + 1;
			const buffer = Buffer.allocUnsafe(chunkSize);
			await fd.read(buffer, 0, chunkSize, start);
			await fd.close();
			fd = null;

			return new Response(buffer, {
				status: 206,
				headers: {
					'Content-Type': contentType,
					'Content-Range': `bytes ${start}-${end}/${size}`,
					'Content-Length': String(chunkSize),
					'Accept-Ranges': 'bytes',
					'Cache-Control': 'public, max-age=31536000, immutable'
				}
			});
		}

		// Full file response
		const buffer = Buffer.allocUnsafe(size);
		await fd.read(buffer, 0, size, 0);
		await fd.close();
		fd = null;

		return new Response(buffer, {
			headers: {
				'Content-Type': contentType,
				'Content-Length': String(size),
				'Accept-Ranges': 'bytes',
				'Cache-Control': 'public, max-age=31536000, immutable'
			}
		});
	} catch (err) {
		if (fd) await fd.close().catch(() => {});
		if (err && typeof err === 'object' && 'status' in err) throw err;
		throw error(404, 'Asset not found');
	}
};
