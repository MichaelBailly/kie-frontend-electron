import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KIE_CALLBACK_URL } from '$lib/constants.server';
import {
	createGeneration,
	createRequestEvent,
	flushPromises,
	resetFixtureIds
} from '$lib/test-utils';

const {
	mockCreateUploadVocalsGeneration,
	mockGetGeneration,
	mockGetSunoModel,
	mockSetGenerationSourceAudioLocalUrl,
	mockSetGenerationTaskStarted,
	mockSetGenerationErrored,
	mockSetStemSeparationErrored,
	mockSetStemSeparationTaskStarted,
	mockSetWavConversionErrored,
	mockSetWavConversionTaskStarted,
	mockAddVocals,
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
	mockCreateUploadVocalsGeneration: vi.fn(),
	mockGetGeneration: vi.fn(),
	mockGetSunoModel: vi.fn(() => 'V5'),
	mockSetGenerationSourceAudioLocalUrl: vi.fn(),
	mockSetGenerationTaskStarted: vi.fn(),
	mockSetGenerationErrored: vi.fn(),
	mockSetStemSeparationErrored: vi.fn(),
	mockSetStemSeparationTaskStarted: vi.fn(),
	mockSetWavConversionErrored: vi.fn(),
	mockSetWavConversionTaskStarted: vi.fn(),
	mockAddVocals: vi.fn(),
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
	createUploadVocalsGeneration: mockCreateUploadVocalsGeneration,
	setGenerationSourceAudioLocalUrl: mockSetGenerationSourceAudioLocalUrl,
	setGenerationTaskStarted: mockSetGenerationTaskStarted,
	setGenerationErrored: mockSetGenerationErrored,
	setStemSeparationErrored: mockSetStemSeparationErrored,
	setStemSeparationTaskStarted: mockSetStemSeparationTaskStarted,
	setWavConversionErrored: mockSetWavConversionErrored,
	setWavConversionTaskStarted: mockSetWavConversionTaskStarted
}));

vi.mock('$lib/kie-api.server', () => ({
	addVocals: mockAddVocals
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

describe('POST /api/generations/retry-upload-vocals', () => {
	beforeEach(() => {
		resetFixtureIds();
		vi.clearAllMocks();

		mockGetAssetFileNameFromLocalUrl.mockReturnValue('source-audio.mp3');
		mockGetAssetFilePath.mockReturnValue('/tmp/source-audio.mp3');
		mockReadFile.mockResolvedValue(Buffer.from('audio-data'));
		mockCreateTemporaryUploadedAudio.mockResolvedValue('temp-audio.mp3');
		mockUploadToTemporaryHost.mockResolvedValue('https://uploads.example.com/source-audio.mp3');
		mockFinalizeTemporaryUploadedAudio.mockResolvedValue('/api/assets/generation-55-source.mp3');
		mockAddVocals.mockResolvedValue({
			code: 200,
			msg: 'success',
			data: { taskId: 'task-retry-upload-vocals' }
		});
	});

	it('rejects negative tags longer than 200 characters', async () => {
		const { POST } = await import('./+server');
		const event = createRequestEvent({
			body: {
				projectId: 1,
				sourceGenerationId: 8,
				title: 'Retry Vocals',
				prompt: '[Verse] Bright lights',
				style: 'dream pop',
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
			id: 8,
			project_id: 1,
			generation_type: 'upload_vocals',
			source_audio_local_url: '/api/assets/source-audio.mp3'
		});
		const createdGeneration = createGeneration({
			id: 55,
			project_id: 1,
			generation_type: 'upload_vocals',
			negative_tags: 'mumble rap'
		});

		mockGetGeneration.mockReturnValue(sourceGeneration);
		mockCreateUploadVocalsGeneration.mockReturnValue(createdGeneration);

		const { POST } = await import('./+server');
		const event = createRequestEvent({
			body: {
				projectId: 1,
				sourceGenerationId: 8,
				title: 'Retry Vocals',
				prompt: '[Verse] Bright lights',
				style: 'dream pop',
				negativeTags: '  mumble rap  '
			}
		});

		const response = await POST(event as never);
		const body = await response.json();

		expect(body.id).toBe(55);
		expect(mockCreateUploadVocalsGeneration).toHaveBeenCalledWith(
			1,
			'Retry Vocals',
			'dream pop',
			'[Verse] Bright lights',
			'mumble rap',
			null,
			'V5'
		);
		expect(mockSetGenerationSourceAudioLocalUrl).toHaveBeenCalledWith(
			55,
			'/api/assets/generation-55-source.mp3'
		);

		await flushPromises();

		expect(mockAddVocals).toHaveBeenCalledWith({
			uploadUrl: 'https://uploads.example.com/source-audio.mp3',
			title: 'Retry Vocals',
			prompt: '[Verse] Bright lights',
			style: 'dream pop',
			negativeTags: 'mumble rap',
			model: 'V5',
			callBackUrl: KIE_CALLBACK_URL
		});
		expect(mockSetGenerationTaskStarted).toHaveBeenCalledWith(55, 'task-retry-upload-vocals');
		expect(mockPollForResults).toHaveBeenCalledWith(55, 'task-retry-upload-vocals');
	});

	it('sends empty negative tags when the retry form leaves them blank', async () => {
		const sourceGeneration = createGeneration({
			id: 8,
			project_id: 1,
			generation_type: 'upload_instrumental',
			source_audio_local_url: '/api/assets/source-audio.mp3'
		});
		const createdGeneration = createGeneration({
			id: 56,
			project_id: 1,
			generation_type: 'upload_vocals',
			negative_tags: ''
		});

		mockGetGeneration.mockReturnValue(sourceGeneration);
		mockCreateUploadVocalsGeneration.mockReturnValue(createdGeneration);

		const { POST } = await import('./+server');
		const event = createRequestEvent({
			body: {
				projectId: 1,
				sourceGenerationId: 8,
				title: 'Retry Vocals',
				prompt: '[Verse] Bright lights',
				style: 'dream pop',
				negativeTags: ''
			}
		});

		await POST(event as never);
		await flushPromises();

		expect(mockCreateUploadVocalsGeneration).toHaveBeenCalledWith(
			1,
			'Retry Vocals',
			'dream pop',
			'[Verse] Bright lights',
			'',
			null,
			'V5'
		);
		expect(mockAddVocals).toHaveBeenCalledWith(expect.objectContaining({ negativeTags: '' }));
	});
});
