import { setGenerationLocalAssetUrls, type Generation } from '$lib/db.server';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ASSET_URL_PREFIX = '/api/assets/';
const CACHE_DIR_NAME = 'asset-cache';

const inflightDownloads = new Map<string, Promise<string | null>>();

type TrackNumber = 1 | 2;
type AssetKind = 'audio' | 'image';

function getAssetCacheDir(): string {
	const dbPath = process.env.DATABASE_PATH;
	if (dbPath && dbPath.length > 0) {
		return path.join(path.dirname(dbPath), CACHE_DIR_NAME);
	}

	return path.join(process.cwd(), CACHE_DIR_NAME);
}

function getTrackRemoteUrl(
	generation: Generation,
	track: TrackNumber,
	kind: AssetKind
): string | null {
	if (track === 1 && kind === 'audio') return generation.track1_audio_url;
	if (track === 1 && kind === 'image') return generation.track1_image_url;
	if (track === 2 && kind === 'audio') return generation.track2_audio_url;
	return generation.track2_image_url;
}

function getTrackLocalUrl(
	generation: Generation,
	track: TrackNumber,
	kind: AssetKind
): string | null {
	if (track === 1 && kind === 'audio') return generation.track1_audio_local_url ?? null;
	if (track === 1 && kind === 'image') return generation.track1_image_local_url ?? null;
	if (track === 2 && kind === 'audio') return generation.track2_audio_local_url ?? null;
	return generation.track2_image_local_url ?? null;
}

export function getPreferredTrackAssetUrl(
	generation: Generation,
	track: TrackNumber,
	kind: AssetKind
): string | null {
	return getTrackLocalUrl(generation, track, kind) || getTrackRemoteUrl(generation, track, kind);
}

function getExtensionFromContentType(contentType: string | null, kind: AssetKind): string {
	if (contentType) {
		const normalized = contentType.toLowerCase();
		if (normalized.includes('audio/mpeg')) return '.mp3';
		if (normalized.includes('audio/mp3')) return '.mp3';
		if (normalized.includes('audio/wav')) return '.wav';
		if (normalized.includes('audio/ogg')) return '.ogg';
		if (normalized.includes('audio/mp4')) return '.m4a';
		if (normalized.includes('image/jpeg')) return '.jpg';
		if (normalized.includes('image/png')) return '.png';
		if (normalized.includes('image/webp')) return '.webp';
		if (normalized.includes('image/gif')) return '.gif';
	}

	return kind === 'audio' ? '.mp3' : '.jpg';
}

function getExtensionFromUrl(url: string): string | null {
	try {
		const pathname = new URL(url).pathname;
		const ext = path.extname(pathname).toLowerCase();
		if (!ext || !/^[.][a-z0-9]{1,6}$/i.test(ext)) {
			return null;
		}
		return ext;
	} catch {
		return null;
	}
}

function buildAssetFileName(
	generationId: number,
	track: TrackNumber,
	kind: AssetKind,
	extension: string
): string {
	return `g${generationId}-t${track}-${kind}${extension}`;
}

function buildAssetUrl(fileName: string): string {
	return `${ASSET_URL_PREFIX}${fileName}`;
}

function getFilePathForName(fileName: string): string {
	return path.join(getAssetCacheDir(), fileName);
}

export function getAssetFileNameFromLocalUrl(localUrl: string | null | undefined): string | null {
	if (!localUrl || !localUrl.startsWith(ASSET_URL_PREFIX)) {
		return null;
	}

	const fileName = localUrl.slice(ASSET_URL_PREFIX.length);
	if (!isValidAssetFileName(fileName)) {
		return null;
	}

	return fileName;
}

export function isValidAssetFileName(fileName: string): boolean {
	return /^g\d+-t[12]-(audio|image)\.[a-z0-9]{1,6}$/i.test(fileName);
}

export function getAssetFilePath(fileName: string): string {
	if (!isValidAssetFileName(fileName)) {
		throw new Error('Invalid asset file name');
	}

	return getFilePathForName(fileName);
}

async function ensureCachedAsset(
	generationId: number,
	track: TrackNumber,
	kind: AssetKind,
	remoteUrl: string
): Promise<string | null> {
	const inflightKey = `${generationId}:${track}:${kind}`;
	const existing = inflightDownloads.get(inflightKey);
	if (existing) {
		return existing;
	}

	const provisionalExtension =
		getExtensionFromUrl(remoteUrl) ?? (kind === 'audio' ? '.mp3' : '.jpg');
	const provisionalName = buildAssetFileName(generationId, track, kind, provisionalExtension);
	const provisionalPath = getFilePathForName(provisionalName);

	const task = (async (): Promise<string | null> => {
		try {
			try {
				await fs.access(provisionalPath);
				return buildAssetUrl(provisionalName);
			} catch {
				// Not present, continue.
			}

			await fs.mkdir(getAssetCacheDir(), { recursive: true });

			const response = await fetch(remoteUrl);
			if (!response.ok) {
				throw new Error(`Failed to download asset: ${response.status} ${response.statusText}`);
			}

			const extension =
				getExtensionFromContentType(response.headers.get('content-type'), kind) ||
				provisionalExtension;
			const fileName = buildAssetFileName(generationId, track, kind, extension);
			const filePath = getFilePathForName(fileName);
			const tempPath = `${filePath}.tmp`;

			const arrayBuffer = await response.arrayBuffer();
			await fs.writeFile(tempPath, Buffer.from(arrayBuffer));
			await fs.rename(tempPath, filePath);

			if (filePath !== provisionalPath) {
				await fs.rm(provisionalPath, { force: true });
			}

			return buildAssetUrl(fileName);
		} catch (error) {
			console.error('[AssetCache] Failed to cache asset', {
				generationId,
				track,
				kind,
				remoteUrl,
				error: error instanceof Error ? error.message : String(error)
			});
			return null;
		} finally {
			inflightDownloads.delete(inflightKey);
		}
	})();

	inflightDownloads.set(inflightKey, task);
	return task;
}

export function queueTrackAssetCaching(generation: Generation, track: TrackNumber): void {
	const audioRemote = getTrackRemoteUrl(generation, track, 'audio');
	const imageRemote = getTrackRemoteUrl(generation, track, 'image');
	const audioLocal = getTrackLocalUrl(generation, track, 'audio');
	const imageLocal = getTrackLocalUrl(generation, track, 'image');

	const needsAudio = !!audioRemote && !audioLocal;
	const needsImage = !!imageRemote && !imageLocal;

	if (!needsAudio && !needsImage) {
		return;
	}

	void (async () => {
		const updates: {
			track1AudioLocalUrl?: string | null;
			track1ImageLocalUrl?: string | null;
			track2AudioLocalUrl?: string | null;
			track2ImageLocalUrl?: string | null;
		} = {};

		if (needsAudio && audioRemote) {
			const localAudioUrl = await ensureCachedAsset(generation.id, track, 'audio', audioRemote);
			if (localAudioUrl) {
				if (track === 1) updates.track1AudioLocalUrl = localAudioUrl;
				if (track === 2) updates.track2AudioLocalUrl = localAudioUrl;
			}
		}

		if (needsImage && imageRemote) {
			const localImageUrl = await ensureCachedAsset(generation.id, track, 'image', imageRemote);
			if (localImageUrl) {
				if (track === 1) updates.track1ImageLocalUrl = localImageUrl;
				if (track === 2) updates.track2ImageLocalUrl = localImageUrl;
			}
		}

		if (Object.keys(updates).length > 0) {
			setGenerationLocalAssetUrls(generation.id, updates);
		}
	})();
}

export function queueTrackAssetKindCaching(
	generation: Generation,
	track: TrackNumber,
	kind: AssetKind
): void {
	const remoteUrl = getTrackRemoteUrl(generation, track, kind);
	const localUrl = getTrackLocalUrl(generation, track, kind);

	if (!remoteUrl || localUrl) {
		return;
	}

	void (async () => {
		const cachedUrl = await ensureCachedAsset(generation.id, track, kind, remoteUrl);
		if (!cachedUrl) {
			return;
		}

		if (track === 1 && kind === 'audio') {
			setGenerationLocalAssetUrls(generation.id, { track1AudioLocalUrl: cachedUrl });
			return;
		}

		if (track === 1 && kind === 'image') {
			setGenerationLocalAssetUrls(generation.id, { track1ImageLocalUrl: cachedUrl });
			return;
		}

		if (track === 2 && kind === 'audio') {
			setGenerationLocalAssetUrls(generation.id, { track2AudioLocalUrl: cachedUrl });
			return;
		}

		setGenerationLocalAssetUrls(generation.id, { track2ImageLocalUrl: cachedUrl });
	})();
}

export async function deleteGenerationCachedAssets(generation: Generation): Promise<void> {
	const candidates = [
		generation.track1_audio_local_url,
		generation.track1_image_local_url,
		generation.track2_audio_local_url,
		generation.track2_image_local_url
	];

	for (const localUrl of candidates) {
		const fileName = getAssetFileNameFromLocalUrl(localUrl);
		if (!fileName) {
			continue;
		}

		const filePath = getFilePathForName(fileName);
		try {
			await fs.rm(filePath, { force: true });
		} catch (error) {
			console.error('[AssetCache] Failed to delete cached asset', {
				filePath,
				error: error instanceof Error ? error.message : String(error)
			});
		}
	}
}
