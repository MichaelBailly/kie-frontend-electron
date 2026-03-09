import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockIsValidAssetFileName = vi.fn();
const mockGetAssetFilePath = vi.fn();
const mockOpen = vi.fn();

vi.mock('$lib/server/assets-cache.server', () => ({
	isValidAssetFileName: mockIsValidAssetFileName,
	getAssetFilePath: mockGetAssetFilePath
}));

vi.mock('node:fs/promises', () => ({
	open: mockOpen
}));

function makeFd(content: Buffer) {
	return {
		stat: vi.fn().mockResolvedValue({ size: content.length }),
		read: vi
			.fn()
			.mockImplementation((buf: Buffer, offset: number, length: number, position: number) => {
				content.copy(buf, offset, position, position + length);
				return Promise.resolve({ bytesRead: length });
			}),
		close: vi.fn().mockResolvedValue(undefined)
	};
}

describe('GET /api/assets/[assetId]', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
	});

	it('returns 404 for invalid asset id format', async () => {
		mockIsValidAssetFileName.mockReturnValue(false);

		const { GET } = await import('./[assetId]/+server');
		const event = { params: { assetId: '../passwd' }, request: new Request('http://localhost/') };

		await expect(GET(event as never)).rejects.toMatchObject({ status: 404 });
	});

	it('returns 404 when asset file does not exist', async () => {
		mockIsValidAssetFileName.mockReturnValue(true);
		mockGetAssetFilePath.mockReturnValue('/tmp/asset-cache/g1-t1-audio.mp3');
		mockOpen.mockRejectedValue(new Error('ENOENT'));

		const { GET } = await import('./[assetId]/+server');
		const event = {
			params: { assetId: 'g1-t1-audio.mp3' },
			request: new Request('http://localhost/')
		};

		await expect(GET(event as never)).rejects.toMatchObject({ status: 404 });
	});

	it('serves full file with Accept-Ranges header when no Range requested', async () => {
		mockIsValidAssetFileName.mockReturnValue(true);
		mockGetAssetFilePath.mockReturnValue('/tmp/asset-cache/g1-t1-audio.mp3');
		const payload = Buffer.from('audio-bytes');
		mockOpen.mockResolvedValue(makeFd(payload));

		const { GET } = await import('./[assetId]/+server');
		const event = {
			params: { assetId: 'g1-t1-audio.mp3' },
			request: new Request('http://localhost/')
		};
		const response = await GET(event as never);

		expect(response.status).toBe(200);
		expect(response.headers.get('Content-Type')).toBe('audio/mpeg');
		expect(response.headers.get('Accept-Ranges')).toBe('bytes');
		expect(response.headers.get('Cache-Control')).toContain('immutable');

		const buffer = Buffer.from(await response.arrayBuffer());
		expect(buffer.toString()).toBe('audio-bytes');
	});

	it('returns 206 Partial Content for a Range request', async () => {
		mockIsValidAssetFileName.mockReturnValue(true);
		mockGetAssetFilePath.mockReturnValue('/tmp/asset-cache/g1-t1-audio.mp3');
		const payload = Buffer.from('0123456789');
		mockOpen.mockResolvedValue(makeFd(payload));

		const { GET } = await import('./[assetId]/+server');
		const request = new Request('http://localhost/', { headers: { Range: 'bytes=2-5' } });
		const event = { params: { assetId: 'g1-t1-audio.mp3' }, request };
		const response = await GET(event as never);

		expect(response.status).toBe(206);
		expect(response.headers.get('Content-Range')).toBe('bytes 2-5/10');
		expect(response.headers.get('Content-Length')).toBe('4');
		expect(response.headers.get('Accept-Ranges')).toBe('bytes');

		const buffer = Buffer.from(await response.arrayBuffer());
		expect(buffer.toString()).toBe('2345');
	});

	it('returns 416 when Range is out of bounds', async () => {
		mockIsValidAssetFileName.mockReturnValue(true);
		mockGetAssetFilePath.mockReturnValue('/tmp/asset-cache/g1-t1-audio.mp3');
		const payload = Buffer.from('0123456789');
		mockOpen.mockResolvedValue(makeFd(payload));

		const { GET } = await import('./[assetId]/+server');
		const request = new Request('http://localhost/', { headers: { Range: 'bytes=5-20' } });
		const event = { params: { assetId: 'g1-t1-audio.mp3' }, request };
		const response = await GET(event as never);

		expect(response.status).toBe(416);
	});
});
