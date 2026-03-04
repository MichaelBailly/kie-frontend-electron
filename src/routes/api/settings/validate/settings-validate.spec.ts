import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequestEvent } from '$lib/test-utils';

const mockGetApiKey = vi.fn<() => string | null>();

vi.mock('$lib/db.server', () => ({
	getApiKey: mockGetApiKey
}));

describe('POST /api/settings/validate', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
		mockGetApiKey.mockReturnValue('db-key');
		vi.stubGlobal('fetch', vi.fn());
	});

	it('returns 400 for invalid JSON body', async () => {
		const { POST } = await import('./+server');
		const event = {
			request: new Request('http://localhost/test', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: '{invalid-json'
			}),
			params: {},
			url: new URL('http://localhost/test')
		};

		await expect(POST(event as never)).rejects.toMatchObject({
			status: 400,
			body: { message: 'Invalid JSON body' }
		});
	});

	it('returns invalid when apiKey has wrong type', async () => {
		const { POST } = await import('./+server');
		const event = createRequestEvent({
			method: 'POST',
			body: { apiKey: 123 }
		});

		await expect(POST(event as never)).rejects.toMatchObject({
			status: 400,
			body: { message: 'Invalid apiKey: must be a string, null, or undefined' }
		});
	});

	it('uses provided apiKey against KIE account info endpoint', async () => {
		const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
		fetchMock.mockResolvedValue({
			json: async () => ({ code: 200, msg: 'ok' })
		} as Response);

		const { POST } = await import('./+server');
		const event = createRequestEvent({
			method: 'POST',
			body: { apiKey: 'provided-key' }
		});
		const response = await POST(event as never);
		const data = await response.json();

		expect(data).toMatchObject({ valid: true, message: 'API key is valid' });
		expect(fetchMock).toHaveBeenCalledWith(
			'https://api.kie.ai/api/v1/account/info',
			expect.objectContaining({
				headers: expect.objectContaining({ Authorization: 'Bearer provided-key' })
			})
		);
	});

	it('falls back to db api key when request key is empty', async () => {
		const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
		fetchMock.mockResolvedValue({
			json: async () => ({ code: 200, msg: 'ok' })
		} as Response);

		const { POST } = await import('./+server');
		const event = createRequestEvent({
			method: 'POST',
			body: { apiKey: '   ' }
		});
		await POST(event as never);

		expect(fetchMock).toHaveBeenCalledWith(
			'https://api.kie.ai/api/v1/account/info',
			expect.objectContaining({
				headers: expect.objectContaining({ Authorization: 'Bearer db-key' })
			})
		);
	});
});
