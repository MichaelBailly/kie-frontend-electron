import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFetch = vi.fn();

vi.stubGlobal('fetch', mockFetch);

describe('GET /api/media', () => {
	beforeEach(() => {
		vi.resetModules();
		mockFetch.mockReset();
	});

	it('returns 400 when the media url is missing', async () => {
		const { GET } = await import('./+server');

		await expect(
			GET({
				url: new URL('http://localhost/api/media'),
				request: new Request('http://localhost/api/media')
			} as never)
		).rejects.toMatchObject({ status: 400 });
	});

	it('forwards range requests to the remote server', async () => {
		mockFetch.mockResolvedValue(
			new Response('audio-bytes', {
				status: 206,
				headers: {
					'Content-Type': 'audio/mpeg',
					'Content-Length': '11',
					'Content-Range': 'bytes 0-10/20',
					'Accept-Ranges': 'bytes'
				}
			})
		);

		const { GET } = await import('./+server');
		const request = new Request(
			'http://localhost/api/media?url=https%3A%2F%2Ftempfile.aiquickdraw.com%2Fr%2Ffile.mp3',
			{ headers: { Range: 'bytes=0-10', Accept: 'audio/mpeg' } }
		);

		const response = await GET({ url: new URL(request.url), request } as never);

		expect(mockFetch).toHaveBeenCalledWith(expect.any(URL), {
			headers: expect.any(Headers),
			redirect: 'follow'
		});
		expect(String(mockFetch.mock.calls[0][0])).toBe('https://tempfile.aiquickdraw.com/r/file.mp3');
		const forwardedHeaders = mockFetch.mock.calls[0][1].headers as Headers;
		expect(forwardedHeaders.get('range')).toBe('bytes=0-10');
		expect(forwardedHeaders.get('accept')).toBe('audio/mpeg');
		expect(response.status).toBe(206);
		expect(response.headers.get('Content-Range')).toBe('bytes 0-10/20');
		expect(response.headers.get('Accept-Ranges')).toBe('bytes');
		expect(await response.text()).toBe('audio-bytes');
	});

	it('returns 502 when the remote fetch fails', async () => {
		mockFetch.mockRejectedValue(new Error('network down'));

		const { GET } = await import('./+server');

		await expect(
			GET({
				url: new URL(
					'http://localhost/api/media?url=https%3A%2F%2Ftempfile.aiquickdraw.com%2Fr%2Ffile.mp3'
				),
				request: new Request(
					'http://localhost/api/media?url=https%3A%2F%2Ftempfile.aiquickdraw.com%2Fr%2Ffile.mp3'
				)
			} as never)
		).rejects.toMatchObject({ status: 502 });
	});
});
