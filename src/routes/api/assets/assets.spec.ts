import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockIsValidAssetFileName = vi.fn();
const mockGetAssetFilePath = vi.fn();
const mockReadFile = vi.fn();

vi.mock('$lib/server/assets-cache.server', () => ({
	isValidAssetFileName: mockIsValidAssetFileName,
	getAssetFilePath: mockGetAssetFilePath
}));

vi.mock('node:fs/promises', () => ({
	readFile: mockReadFile
}));

describe('GET /api/assets/[assetId]', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
	});

	it('returns 404 for invalid asset id format', async () => {
		mockIsValidAssetFileName.mockReturnValue(false);

		const { GET } = await import('./[assetId]/+server');
		const event = { params: { assetId: '../passwd' } };

		await expect(GET(event as never)).rejects.toMatchObject({ status: 404 });
	});

	it('returns 404 when asset file does not exist', async () => {
		mockIsValidAssetFileName.mockReturnValue(true);
		mockGetAssetFilePath.mockReturnValue('/tmp/asset-cache/g1-t1-audio.mp3');
		mockReadFile.mockRejectedValue(new Error('ENOENT'));

		const { GET } = await import('./[assetId]/+server');
		const event = { params: { assetId: 'g1-t1-audio.mp3' } };

		await expect(GET(event as never)).rejects.toMatchObject({ status: 404 });
	});

	it('serves asset bytes with matching content-type', async () => {
		mockIsValidAssetFileName.mockReturnValue(true);
		mockGetAssetFilePath.mockReturnValue('/tmp/asset-cache/g1-t1-audio.mp3');
		const payload = Buffer.from('audio-bytes');
		mockReadFile.mockResolvedValue(payload);

		const { GET } = await import('./[assetId]/+server');
		const event = { params: { assetId: 'g1-t1-audio.mp3' } };
		const response = await GET(event as never);

		expect(response.status).toBe(200);
		expect(response.headers.get('Content-Type')).toBe('audio/mpeg');
		expect(response.headers.get('Cache-Control')).toContain('immutable');

		const buffer = Buffer.from(await response.arrayBuffer());
		expect(buffer.toString()).toBe('audio-bytes');
	});
});
