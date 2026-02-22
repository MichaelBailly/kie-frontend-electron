import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCompletedGeneration, flushPromises } from '$lib/test-utils';

const mockSetGenerationLocalAssetUrls = vi.fn();

const mockFsAccess = vi.fn();
const mockFsMkdir = vi.fn();
const mockFsWriteFile = vi.fn();
const mockFsRename = vi.fn();
const mockFsRm = vi.fn();

vi.mock('$lib/db.server', () => ({
	setGenerationLocalAssetUrls: mockSetGenerationLocalAssetUrls
}));

vi.mock('node:fs', () => ({
	promises: {
		access: mockFsAccess,
		mkdir: mockFsMkdir,
		writeFile: mockFsWriteFile,
		rename: mockFsRename,
		rm: mockFsRm
	}
}));

describe('assets-cache.server', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
		process.env.DATABASE_PATH = '/tmp/kie-music.db';
		vi.stubGlobal('fetch', vi.fn());
	});

	it('prefers local URL over remote URL', async () => {
		const { getPreferredTrackAssetUrl } = await import('./assets-cache.server');

		const generation = createCompletedGeneration({
			track1_audio_url: 'https://remote/audio.mp3',
			track1_audio_local_url: '/api/assets/g1-t1-audio.mp3'
		});

		expect(getPreferredTrackAssetUrl(generation, 1, 'audio')).toBe('/api/assets/g1-t1-audio.mp3');
	});

	it('queues caching and persists local audio URL when download succeeds', async () => {
		const { queueTrackAssetKindCaching } = await import('./assets-cache.server');

		mockFsAccess.mockRejectedValue(new Error('not found'));
		const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
		fetchMock.mockResolvedValue({
			ok: true,
			status: 200,
			statusText: 'OK',
			headers: { get: () => 'audio/mpeg' },
			arrayBuffer: async () => new TextEncoder().encode('audio-data').buffer
		} as Response);

		const generation = createCompletedGeneration({
			id: 42,
			track1_audio_local_url: null,
			track1_audio_url: 'https://cdn.example.com/audio/42/track1.mp3'
		});

		queueTrackAssetKindCaching(generation, 1, 'audio');
		await flushPromises();
		await flushPromises();

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(mockFsMkdir).toHaveBeenCalledWith('/tmp/asset-cache', { recursive: true });
		expect(mockSetGenerationLocalAssetUrls).toHaveBeenCalledWith(42, {
			track1AudioLocalUrl: '/api/assets/g42-t1-audio.mp3'
		});
	});

	it('deduplicates concurrent caching for same generation/track/kind', async () => {
		const { queueTrackAssetKindCaching } = await import('./assets-cache.server');

		mockFsAccess.mockRejectedValue(new Error('not found'));
		let resolveFetch: ((value: Response) => void) | null = null;
		const fetchPromise = new Promise<Response>((resolve) => {
			resolveFetch = resolve;
		});
		const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
		fetchMock.mockReturnValue(fetchPromise);

		const generation = createCompletedGeneration({
			id: 7,
			track1_audio_local_url: null,
			track1_audio_url: 'https://cdn.example.com/audio/7/track1.mp3'
		});

		queueTrackAssetKindCaching(generation, 1, 'audio');
		queueTrackAssetKindCaching(generation, 1, 'audio');
		await flushPromises();

		expect(fetchMock).toHaveBeenCalledTimes(1);

		resolveFetch?.({
			ok: true,
			status: 200,
			statusText: 'OK',
			headers: { get: () => 'audio/mpeg' },
			arrayBuffer: async () => new TextEncoder().encode('audio').buffer
		} as Response);

		await flushPromises();
		await flushPromises();

		expect(mockSetGenerationLocalAssetUrls).toHaveBeenCalled();
	});

	it('deletes cached generation assets from local disk', async () => {
		const { deleteGenerationCachedAssets } = await import('./assets-cache.server');

		const generation = createCompletedGeneration({
			track1_audio_local_url: '/api/assets/g9-t1-audio.mp3',
			track1_image_local_url: '/api/assets/g9-t1-image.jpg',
			track2_audio_local_url: null,
			track2_image_local_url: 'https://not-local.example/image.jpg'
		});

		await deleteGenerationCachedAssets(generation);

		expect(mockFsRm).toHaveBeenCalledWith('/tmp/asset-cache/g9-t1-audio.mp3', { force: true });
		expect(mockFsRm).toHaveBeenCalledWith('/tmp/asset-cache/g9-t1-image.jpg', { force: true });
		expect(mockFsRm).toHaveBeenCalledTimes(2);
	});
});
