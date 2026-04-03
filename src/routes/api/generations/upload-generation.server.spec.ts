import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGeneration } from '$lib/test-utils';

const {
	mockSetGenerationSourceAudioLocalUrl,
	mockStartGenerationTask,
	mockCreateTemporaryUploadedAudio,
	mockFinalizeTemporaryUploadedAudio,
	mockGetAssetFileNameFromLocalUrl,
	mockGetAssetFilePath,
	mockRemoveTemporaryUploadedAudio,
	mockUploadToTemporaryHost,
	mockReadFile
} = vi.hoisted(() => ({
	mockSetGenerationSourceAudioLocalUrl: vi.fn(),
	mockStartGenerationTask: vi.fn(),
	mockCreateTemporaryUploadedAudio: vi.fn(),
	mockFinalizeTemporaryUploadedAudio: vi.fn(),
	mockGetAssetFileNameFromLocalUrl: vi.fn(),
	mockGetAssetFilePath: vi.fn(),
	mockRemoveTemporaryUploadedAudio: vi.fn(),
	mockUploadToTemporaryHost: vi.fn(),
	mockReadFile: vi.fn()
}));

vi.mock('$lib/db.server', () => ({
	setGenerationSourceAudioLocalUrl: mockSetGenerationSourceAudioLocalUrl
}));

vi.mock('$lib/api-helpers.server', async () => {
	const actual = await vi.importActual<object>('$lib/api-helpers.server');
	return {
		...actual,
		startGenerationTask: mockStartGenerationTask
	};
});

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

describe('upload-generation helpers', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('builds upload project names with fallback prefix', async () => {
		const { buildUploadProjectName } = await import('./upload-generation.server');

		expect(buildUploadProjectName('Vocals', 'My Song', '  ')).toBe('Vocals: My Song');
		expect(buildUploadProjectName('Vocals', 'My Song', '  Custom Name  ')).toBe('Custom Name');
	});

	it('finalizes local upload and persists the source asset url', async () => {
		const { finalizeGenerationSourceUpload } = await import('./upload-generation.server');
		const generation = createGeneration({ id: 33, source_audio_local_url: null });

		mockFinalizeTemporaryUploadedAudio.mockResolvedValue('/api/assets/g33-source-audio.mp3');

		await finalizeGenerationSourceUpload(generation, 'upload-temp.mp3');

		expect(mockFinalizeTemporaryUploadedAudio).toHaveBeenCalledWith(33, 'upload-temp.mp3');
		expect(mockSetGenerationSourceAudioLocalUrl).toHaveBeenCalledWith(
			33,
			'/api/assets/g33-source-audio.mp3'
		);
		expect(generation.source_audio_local_url).toBe('/api/assets/g33-source-audio.mp3');
	});

	it('cleans up temporary files when finalization fails', async () => {
		const { finalizeGenerationSourceUpload } = await import('./upload-generation.server');
		const generation = createGeneration({ id: 33, source_audio_local_url: null });

		mockFinalizeTemporaryUploadedAudio.mockRejectedValue(new Error('rename failed'));

		await expect(finalizeGenerationSourceUpload(generation, 'upload-temp.mp3')).rejects.toThrow(
			'rename failed'
		);
		expect(mockRemoveTemporaryUploadedAudio).toHaveBeenCalledWith('upload-temp.mp3');
	});

	it('starts upload generation tasks with a shared logger', async () => {
		const { startLoggedUploadGenerationTask } = await import('./upload-generation.server');
		const apiCall = vi.fn();

		startLoggedUploadGenerationTask(10, 'upload vocals', apiCall);

		expect(mockStartGenerationTask).toHaveBeenCalledWith(10, apiCall);
	});

	it('prepares retry uploads from cached source audio', async () => {
		const { prepareRetryUploadSource } = await import('./upload-generation.server');
		const sourceGeneration = createGeneration({
			id: 8,
			generation_type: 'upload_vocals',
			source_audio_local_url: '/api/assets/g8-source-audio.mp3'
		});

		mockGetAssetFileNameFromLocalUrl.mockReturnValue('g8-source-audio.mp3');
		mockGetAssetFilePath.mockReturnValue('/tmp/g8-source-audio.mp3');
		mockReadFile.mockResolvedValue(Buffer.from('audio-data'));
		mockCreateTemporaryUploadedAudio.mockResolvedValue('upload-temp.mp3');
		mockUploadToTemporaryHost.mockResolvedValue('https://uploads.example.com/audio.mp3');

		await expect(
			prepareRetryUploadSource({ sourceGeneration, logLabel: 'RetryUploadVocals' })
		).resolves.toEqual({
			remoteUrl: 'https://uploads.example.com/audio.mp3',
			temporaryFileName: 'upload-temp.mp3'
		});
	});

	it('cleans up temporary retry copies when remote upload fails', async () => {
		const { prepareRetryUploadSource } = await import('./upload-generation.server');
		const sourceGeneration = createGeneration({
			id: 8,
			generation_type: 'upload_instrumental',
			source_audio_local_url: '/api/assets/g8-source-audio.mp3'
		});

		mockGetAssetFileNameFromLocalUrl.mockReturnValue('g8-source-audio.mp3');
		mockGetAssetFilePath.mockReturnValue('/tmp/g8-source-audio.mp3');
		mockReadFile.mockResolvedValue(Buffer.from('audio-data'));
		mockCreateTemporaryUploadedAudio.mockResolvedValue('upload-temp.mp3');
		mockUploadToTemporaryHost.mockRejectedValue(new Error('tmp host down'));

		await expect(
			prepareRetryUploadSource({ sourceGeneration, logLabel: 'RetryUploadInstrumental' })
		).rejects.toMatchObject({ status: 502 });
		expect(mockRemoveTemporaryUploadedAudio).toHaveBeenCalledWith('upload-temp.mp3');
	});
});
