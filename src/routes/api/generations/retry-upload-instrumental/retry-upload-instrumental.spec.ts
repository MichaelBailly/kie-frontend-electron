import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KIE_CALLBACK_URL } from '$lib/constants.server';
import {
	createGeneration,
	createRequestEvent,
	flushPromises,
	resetFixtureIds
} from '$lib/test-utils';

const {
	mockCreateUploadInstrumentalGeneration,
	mockGetGeneration,
	mockGetSunoModel,
	mockSetGenerationSourceAudioLocalUrl,
	mockSetGenerationTaskStarted,
	mockSetGenerationErrored,
	mockSetStemSeparationErrored,
	mockSetStemSeparationTaskStarted,
	mockSetWavConversionErrored,
	mockSetWavConversionTaskStarted,
	mockAddInstrumental,
	mockNotifyClients,
	mockNotifyStemSeparationClients,
	mockNotifyWavConversionClients,
	mockPollForResults,
	mockPollForStemSeparationResults,
	mockPollForWavResults,
	mockCreateTemporaryUploadedAudio,
	mockFinalizeTemporaryUploadedAudio,
	mockGetAssetFileNameFromLocalUrl,
	mockGetAssetFilePath,
	mockRemoveTemporaryUploadedAudio,
	mockUploadToTemporaryHost,
	mockReadFile
} = vi.hoisted(() => ({
	mockCreateUploadInstrumentalGeneration: vi.fn(),
	mockGetGeneration: vi.fn(),
	mockGetSunoModel: vi.fn(() => 'V5'),
	mockSetGenerationSourceAudioLocalUrl: vi.fn(),
	mockSetGenerationTaskStarted: vi.fn(),
	mockSetGenerationErrored: vi.fn(),
	mockSetStemSeparationErrored: vi.fn(),
	mockSetStemSeparationTaskStarted: vi.fn(),
	mockSetWavConversionErrored: vi.fn(),
	mockSetWavConversionTaskStarted: vi.fn(),
	mockAddInstrumental: vi.fn(),
	mockNotifyClients: vi.fn(),
	mockNotifyStemSeparationClients: vi.fn(),
	mockNotifyWavConversionClients: vi.fn(),
	mockPollForResults: vi.fn(),
	mockPollForStemSeparationResults: vi.fn(),
	mockPollForWavResults: vi.fn(),
	mockCreateTemporaryUploadedAudio: vi.fn(),
	mockFinalizeTemporaryUploadedAudio: vi.fn(),
	mockGetAssetFileNameFromLocalUrl: vi.fn(),
	mockGetAssetFilePath: vi.fn(),
	mockRemoveTemporaryUploadedAudio: vi.fn(),
	mockUploadToTemporaryHost: vi.fn(),
	mockReadFile: vi.fn()
}));

vi.mock('$lib/db.server', () => ({
	getProject: vi.fn(),
	getGeneration: mockGetGeneration,
	getSunoModel: mockGetSunoModel,
	createUploadInstrumentalGeneration: mockCreateUploadInstrumentalGeneration,
	setGenerationSourceAudioLocalUrl: mockSetGenerationSourceAudioLocalUrl,
	setGenerationTaskStarted: mockSetGenerationTaskStarted,
	setGenerationErrored: mockSetGenerationErrored,
	setStemSeparationErrored: mockSetStemSeparationErrored,
	setStemSeparationTaskStarted: mockSetStemSeparationTaskStarted,
	setWavConversionErrored: mockSetWavConversionErrored,
	setWavConversionTaskStarted: mockSetWavConversionTaskStarted
}));

vi.mock('$lib/kie-api.server', () => ({
	addInstrumental: mockAddInstrumental
}));

vi.mock('$lib/sse.server', () => ({
	notifyClients: mockNotifyClients,
	notifyStemSeparationClients: mockNotifyStemSeparationClients,
	notifyWavConversionClients: mockNotifyWavConversionClients
}));

vi.mock('$lib/polling.server', () => ({
	pollForResults: mockPollForResults,
	pollForStemSeparationResults: mockPollForStemSeparationResults,
	pollForWavResults: mockPollForWavResults
}));

vi.mock('$lib/server/assets-cache.server', () => ({
	createTemporaryUploadedAudio: mockCreateTemporaryUploadedAudio,
	finalizeTemporaryUploadedAudio: mockFinalizeTemporaryUploadedAudio,
	getAssetFileNameFromLocalUrl: mockGetAssetFileNameFromLocalUrl,
	getAssetFilePath: mockGetAssetFilePath,
	removeTemporaryUploadedAudio: mockRemoveTemporaryUploadedAudio
}));

vi.mock('$lib/server/file-upload.server', () => ({
	uploadToTemporaryHost: mockUploadToTemporaryHost
}));

vi.mock('node:fs', () => ({
	promises: {
		readFile: mockReadFile
	}
}));

describe('POST /api/generations/retry-upload-instrumental', () => {
	beforeEach(() => {
		resetFixtureIds();
		vi.clearAllMocks();

		mockGetAssetFileNameFromLocalUrl.mockReturnValue('source-audio.mp3');
		mockGetAssetFilePath.mockReturnValue('/tmp/source-audio.mp3');
		mockReadFile.mockResolvedValue(Buffer.from('audio-data'));
		mockCreateTemporaryUploadedAudio.mockResolvedValue('temp-audio.mp3');
		mockUploadToTemporaryHost.mockResolvedValue('https://uploads.example.com/source-audio.mp3');
		mockFinalizeTemporaryUploadedAudio.mockResolvedValue('/api/assets/generation-99-source.mp3');
		mockAddInstrumental.mockResolvedValue({
			code: 200,
			msg: 'success',
			data: { taskId: 'task-retry-upload-instrumental' }
		});
	});

	it('rejects negative tags longer than 200 characters', async () => {
		const { POST } = await import('./+server');
		const event = createRequestEvent({
			body: {
				projectId: 1,
				sourceGenerationId: 7,
				title: 'Retry Instrumental',
				tags: 'ambient',
				negativeTags: 'x'.repeat(201)
			}
		});

		await expect(POST(event as never)).rejects.toMatchObject({
			status: 400,
			body: { message: 'Invalid negativeTags: must be at most 200 characters' }
		});
	});

	it('passes trimmed negative tags to the repository and KIE API', async () => {
		const sourceGeneration = createGeneration({
			id: 7,
			project_id: 1,
			generation_type: 'upload_instrumental',
			source_audio_local_url: '/api/assets/source-audio.mp3'
		});
		const createdGeneration = createGeneration({
			id: 99,
			project_id: 1,
			generation_type: 'upload_instrumental',
			negative_tags: 'crowd noise'
		});

		mockGetGeneration.mockReturnValue(sourceGeneration);
		mockCreateUploadInstrumentalGeneration.mockReturnValue(createdGeneration);

		const { POST } = await import('./+server');
		const event = createRequestEvent({
			body: {
				projectId: 1,
				sourceGenerationId: 7,
				title: 'Retry Instrumental',
				tags: 'ambient, cinematic',
				negativeTags: '  crowd noise  '
			}
		});

		const response = await POST(event as never);
		const body = await response.json();

		expect(body.id).toBe(99);
		expect(mockCreateUploadInstrumentalGeneration).toHaveBeenCalledWith(
			1,
			'Retry Instrumental',
			'ambient, cinematic',
			'crowd noise',
			null,
			'V5'
		);
		expect(mockSetGenerationSourceAudioLocalUrl).toHaveBeenCalledWith(
			99,
			'/api/assets/generation-99-source.mp3'
		);

		await flushPromises();

		expect(mockAddInstrumental).toHaveBeenCalledWith({
			uploadUrl: 'https://uploads.example.com/source-audio.mp3',
			title: 'Retry Instrumental',
			tags: 'ambient, cinematic',
			negativeTags: 'crowd noise',
			model: 'V5',
			callBackUrl: KIE_CALLBACK_URL
		});
		expect(mockSetGenerationTaskStarted).toHaveBeenCalledWith(99, 'task-retry-upload-instrumental');
		expect(mockPollForResults).toHaveBeenCalledWith(99, 'task-retry-upload-instrumental');
	});

	it('sends empty negative tags when the retry form leaves them blank', async () => {
		const sourceGeneration = createGeneration({
			id: 7,
			project_id: 1,
			generation_type: 'upload_vocals',
			source_audio_local_url: '/api/assets/source-audio.mp3'
		});
		const createdGeneration = createGeneration({
			id: 100,
			project_id: 1,
			generation_type: 'upload_instrumental',
			negative_tags: ''
		});

		mockGetGeneration.mockReturnValue(sourceGeneration);
		mockCreateUploadInstrumentalGeneration.mockReturnValue(createdGeneration);

		const { POST } = await import('./+server');
		const event = createRequestEvent({
			body: {
				projectId: 1,
				sourceGenerationId: 7,
				title: 'Retry Instrumental',
				tags: 'ambient',
				negativeTags: ''
			}
		});

		await POST(event as never);
		await flushPromises();

		expect(mockCreateUploadInstrumentalGeneration).toHaveBeenCalledWith(
			1,
			'Retry Instrumental',
			'ambient',
			'',
			null,
			'V5'
		);
		expect(mockAddInstrumental).toHaveBeenCalledWith(expect.objectContaining({ negativeTags: '' }));
	});
});
