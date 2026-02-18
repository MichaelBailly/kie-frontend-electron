import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetApiKey = vi.fn<() => string | null>();

vi.mock('$lib/db.server', () => ({
	getApiKey: mockGetApiKey
}));

vi.mock('$lib/constants.server', () => ({
	KIE_API_KEY: 'env-fallback-key'
}));

function createOkResponse(data: unknown): Response {
	return {
		ok: true,
		status: 200,
		statusText: 'OK',
		json: async () => data
	} as Response;
}

describe('kie-api.server', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
		mockGetApiKey.mockReturnValue('db-key');
		vi.stubGlobal('fetch', vi.fn());
	});

	it('uses DB API key for authenticated requests', async () => {
		const { generateMusic } = await import('./kie-api.server');
		const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
		fetchMock.mockResolvedValue(
			createOkResponse({ code: 200, msg: 'success', data: { taskId: 't1' } })
		);

		await generateMusic({
			prompt: 'prompt',
			style: 'style',
			title: 'title',
			customMode: true,
			instrumental: false,
			model: 'V5',
			callBackUrl: 'https://example.com/callback',
			negativeTags: ''
		});

		expect(fetchMock).toHaveBeenCalledWith(
			'https://api.kie.ai/api/v1/generate',
			expect.objectContaining({
				method: 'POST',
				headers: expect.objectContaining({
					Authorization: 'Bearer db-key',
					'Content-Type': 'application/json'
				})
			})
		);
	});

	it('falls back to env API key when DB key is empty', async () => {
		mockGetApiKey.mockReturnValue('');
		const { getMusicDetails } = await import('./kie-api.server');
		const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
		fetchMock.mockResolvedValue(
			createOkResponse({
				code: 200,
				msg: 'success',
				data: {
					taskId: 'task-1',
					parentMusicId: '',
					param: '',
					response: { taskId: 'task-1', sunoData: [] },
					status: 'PENDING',
					type: 'generate',
					errorCode: null,
					errorMessage: null
				}
			})
		);

		await getMusicDetails('task-1');

		expect(fetchMock).toHaveBeenCalledWith(
			'https://api.kie.ai/api/v1/generate/record-info?taskId=task-1',
			expect.objectContaining({
				headers: expect.objectContaining({
					Authorization: 'Bearer env-fallback-key'
				})
			})
		);
	});

	it('throws descriptive error on non-ok response', async () => {
		const { extendMusic } = await import('./kie-api.server');
		const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
		fetchMock.mockResolvedValue({
			ok: false,
			status: 502,
			statusText: 'Bad Gateway',
			json: async () => ({})
		} as Response);

		await expect(
			extendMusic({
				defaultParamFlag: true,
				audioId: 'audio-1',
				prompt: 'prompt',
				style: 'style',
				title: 'title',
				continueAt: 10,
				model: 'V5',
				callBackUrl: 'https://example.com/callback',
				negativeTags: ''
			})
		).rejects.toThrow('KIE API error: 502 Bad Gateway');
	});

	it('hits stem details endpoint via shared wrapper', async () => {
		const { getStemSeparationDetails } = await import('./kie-api.server');
		const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
		fetchMock.mockResolvedValue(
			createOkResponse({
				code: 200,
				msg: 'success',
				data: {
					taskId: 'stem-1',
					musicId: 'music-1',
					callbackUrl: '',
					audioId: 'audio-1',
					completeTime: null,
					response: null,
					successFlag: 'PENDING',
					createTime: Date.now(),
					errorCode: null,
					errorMessage: null
				}
			})
		);

		await getStemSeparationDetails('stem-1');

		expect(fetchMock).toHaveBeenCalledWith(
			'https://api.kie.ai/api/v1/vocal-removal/record-info?taskId=stem-1',
			expect.objectContaining({ method: 'GET' })
		);
	});
});
