/**
 * Tests for polling.server.ts — generation and stem separation polling logic,
 * plus recovery functions for incomplete tasks.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MusicDetailsResponse } from '$lib/kie-api.server';
import {
	createMusicDetailsResponse,
	createErrorMusicDetailsResponse,
	createPendingMusicDetailsResponse,
	createStemSeparationDetailsResponse,
	createGeneration,
	createStemSeparation,
	createSunoTrack
} from '$lib/test-utils/fixtures';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('$lib/kie-api.server', () => ({
	getMusicDetails: vi.fn(),
	getStemSeparationDetails: vi.fn(),
	// Use real logic for status checks so routing works correctly
	isErrorStatus: vi.fn((s: string) =>
		[
			'CREATE_TASK_FAILED',
			'GENERATE_AUDIO_FAILED',
			'CALLBACK_EXCEPTION',
			'SENSITIVE_WORD_ERROR'
		].includes(s)
	),
	isCompleteStatus: vi.fn((s: string) => s === 'SUCCESS'),
	isStemSeparationErrorStatus: vi.fn((s: string) =>
		['CREATE_TASK_FAILED', 'GENERATE_AUDIO_FAILED', 'CALLBACK_EXCEPTION'].includes(s)
	),
	isStemSeparationCompleteStatus: vi.fn((s: string) => s === 'SUCCESS')
}));

vi.mock('$lib/db.server', () => ({
	updateGenerationStatus: vi.fn(),
	updateGenerationTracks: vi.fn(),
	completeGeneration: vi.fn(),
	updateStemSeparationStatus: vi.fn(),
	completeStemSeparation: vi.fn()
}));

vi.mock('$lib/sse.server', () => ({
	notifyClients: vi.fn(),
	notifyStemSeparationClients: vi.fn()
}));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import {
	pollForResults,
	recoverIncompleteGenerations,
	pollForStemSeparationResults,
	recoverIncompleteStemSeparations
} from '$lib/polling.server';

import { getMusicDetails, getStemSeparationDetails } from '$lib/kie-api.server';
import {
	updateGenerationStatus,
	completeGeneration,
	updateStemSeparationStatus,
	completeStemSeparation
} from '$lib/db.server';
import { notifyClients, notifyStemSeparationClients } from '$lib/sse.server';

// ============================================================================
// Setup
// ============================================================================

let cleanupTimers: () => void;

beforeEach(() => {
	vi.useFakeTimers();
	cleanupTimers = () => vi.useRealTimers();
	vi.clearAllMocks();
});

afterEach(() => {
	cleanupTimers();
});

// ============================================================================
// pollForResults — generation polling
// ============================================================================

describe('pollForResults', () => {
	it('completes generation when API returns SUCCESS with tracks', async () => {
		const track1 = createSunoTrack({ id: 'track-1' });
		const track2 = createSunoTrack({ id: 'track-2' });
		const details = createMusicDetailsResponse({
			data: {
				taskId: 'task-1',
				parentMusicId: '',
				param: '',
				response: { taskId: 'task-1', sunoData: [track1, track2] },
				status: 'SUCCESS',
				type: 'generate',
				errorCode: null,
				errorMessage: null
			}
		});

		vi.mocked(getMusicDetails).mockResolvedValue(details);

		await pollForResults(1, 'task-1');
		// First poll fires immediately — advance to flush the async call
		await vi.advanceTimersByTimeAsync(0);

		expect(completeGeneration).toHaveBeenCalledTimes(1);
		expect(completeGeneration).toHaveBeenCalledWith(
			1,
			'success',
			expect.objectContaining({ audioId: 'track-1' }),
			expect.objectContaining({ audioId: 'track-2' }),
			expect.any(String)
		);
		expect(notifyClients).toHaveBeenCalledWith(
			1,
			'generation_complete',
			expect.objectContaining({ status: 'success' })
		);
	});

	it('marks generation as error when API returns error status', async () => {
		const details = createErrorMusicDetailsResponse();

		vi.mocked(getMusicDetails).mockResolvedValue(details);

		await pollForResults(1, 'task-1');
		await vi.advanceTimersByTimeAsync(0);

		expect(updateGenerationStatus).toHaveBeenCalledWith(1, 'error', 'Task creation failed');
		expect(notifyClients).toHaveBeenCalledWith(
			1,
			'generation_error',
			expect.objectContaining({ status: 'error' })
		);
		expect(completeGeneration).not.toHaveBeenCalled();
	});

	it('marks generation as error when API returns non-200 code', async () => {
		vi.mocked(getMusicDetails).mockResolvedValue({
			code: 500,
			msg: 'Internal Server Error',
			data: {} as MusicDetailsResponse['data']
		} as MusicDetailsResponse);

		await pollForResults(1, 'task-1');
		await vi.advanceTimersByTimeAsync(0);

		expect(updateGenerationStatus).toHaveBeenCalledWith(1, 'error', 'Internal Server Error');
		expect(notifyClients).toHaveBeenCalledWith(
			1,
			'generation_error',
			expect.objectContaining({ status: 'error', error_message: 'Internal Server Error' })
		);
	});

	it('continues polling on PENDING status and updates to processing', async () => {
		const pendingDetails = createPendingMusicDetailsResponse();
		const successDetails = createMusicDetailsResponse();

		vi.mocked(getMusicDetails)
			.mockResolvedValueOnce(pendingDetails)
			.mockResolvedValueOnce(successDetails);

		await pollForResults(1, 'task-1');
		// First poll (PENDING)
		await vi.advanceTimersByTimeAsync(0);

		expect(updateGenerationStatus).toHaveBeenCalledWith(1, 'processing');
		expect(notifyClients).toHaveBeenCalledWith(
			1,
			'generation_update',
			expect.objectContaining({ status: 'processing' })
		);
		expect(completeGeneration).not.toHaveBeenCalled();

		// Second poll after 5s (SUCCESS)
		await vi.advanceTimersByTimeAsync(5000);

		expect(completeGeneration).toHaveBeenCalledTimes(1);
	});

	it('retries on fetch exception and succeeds on next poll', async () => {
		const successDetails = createMusicDetailsResponse();

		vi.mocked(getMusicDetails)
			.mockRejectedValueOnce(new Error('Network error'))
			.mockResolvedValueOnce(successDetails);

		await pollForResults(1, 'task-1');
		// First poll throws
		await vi.advanceTimersByTimeAsync(0);

		expect(completeGeneration).not.toHaveBeenCalled();

		// Retry after 5s
		await vi.advanceTimersByTimeAsync(5000);

		expect(completeGeneration).toHaveBeenCalledTimes(1);
	});

	it('continues polling when SUCCESS but tracks are missing', async () => {
		const incompleteDetails = createMusicDetailsResponse({
			data: {
				taskId: 'task-1',
				parentMusicId: '',
				param: '',
				response: { taskId: 'task-1', sunoData: [createSunoTrack({ id: 'track-1' })] },
				status: 'SUCCESS',
				type: 'generate',
				errorCode: null,
				errorMessage: null
			}
		});
		const completeDetails = createMusicDetailsResponse();

		vi.mocked(getMusicDetails)
			.mockResolvedValueOnce(incompleteDetails)
			.mockResolvedValueOnce(completeDetails);

		await pollForResults(1, 'task-1');
		await vi.advanceTimersByTimeAsync(0);

		// onComplete returned false (only 1 track), should keep polling
		expect(completeGeneration).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(5000);
		expect(completeGeneration).toHaveBeenCalledTimes(1);
	});
});

// ============================================================================
// recoverIncompleteGenerations
// ============================================================================

describe('recoverIncompleteGenerations', () => {
	it('marks generations without task_id as error', () => {
		const gen = createGeneration({ id: 5, task_id: null, status: 'pending' });

		recoverIncompleteGenerations([gen]);

		expect(updateGenerationStatus).toHaveBeenCalledWith(
			5,
			'error',
			'Generation interrupted before task creation'
		);
	});

	it('resumes polling for generations with task_id', async () => {
		const gen = createGeneration({ id: 3, task_id: 'task-abc', status: 'processing' });
		const details = createMusicDetailsResponse();
		vi.mocked(getMusicDetails).mockResolvedValue(details);

		recoverIncompleteGenerations([gen]);
		await vi.advanceTimersByTimeAsync(0);

		expect(getMusicDetails).toHaveBeenCalledWith('task-abc');
		expect(completeGeneration).toHaveBeenCalledTimes(1);
	});

	it('does nothing for empty array', () => {
		recoverIncompleteGenerations([]);

		expect(updateGenerationStatus).not.toHaveBeenCalled();
		expect(getMusicDetails).not.toHaveBeenCalled();
	});
});

// ============================================================================
// pollForStemSeparationResults
// ============================================================================

describe('pollForStemSeparationResults', () => {
	it('completes stem separation when API returns SUCCESS', async () => {
		const details = createStemSeparationDetailsResponse();

		vi.mocked(getStemSeparationDetails).mockResolvedValue(details);

		await pollForStemSeparationResults(1, 'stem-task-1', 10, 'audio-1');
		await vi.advanceTimersByTimeAsync(0);

		expect(completeStemSeparation).toHaveBeenCalledTimes(1);
		expect(completeStemSeparation).toHaveBeenCalledWith(
			1,
			expect.objectContaining({
				vocalUrl: expect.any(String),
				instrumentalUrl: expect.any(String)
			}),
			expect.any(String)
		);
		expect(notifyStemSeparationClients).toHaveBeenCalledWith(
			1,
			10,
			'audio-1',
			'stem_separation_complete',
			expect.objectContaining({ status: 'success' })
		);
	});

	it('marks stem separation as error on error status', async () => {
		const details = createStemSeparationDetailsResponse({
			data: {
				taskId: 'stem-task-1',
				musicId: 'music-1',
				callbackUrl: '',
				audioId: 'audio-1',
				completeTime: null,
				response: null,
				successFlag: 'CREATE_TASK_FAILED',
				createTime: Date.now(),
				errorCode: null,
				errorMessage: 'Stem task failed'
			}
		});

		vi.mocked(getStemSeparationDetails).mockResolvedValue(details);

		await pollForStemSeparationResults(1, 'stem-task-1', 10, 'audio-1');
		await vi.advanceTimersByTimeAsync(0);

		expect(updateStemSeparationStatus).toHaveBeenCalledWith(1, 'error', 'Stem task failed');
		expect(notifyStemSeparationClients).toHaveBeenCalledWith(
			1,
			10,
			'audio-1',
			'stem_separation_error',
			expect.objectContaining({ status: 'error' })
		);
		expect(completeStemSeparation).not.toHaveBeenCalled();
	});
});

// ============================================================================
// recoverIncompleteStemSeparations
// ============================================================================

describe('recoverIncompleteStemSeparations', () => {
	it('marks separations without task_id as error', () => {
		const sep = createStemSeparation({
			id: 7,
			task_id: null,
			status: 'pending',
			generation_id: 10,
			audio_id: 'audio-1'
		});

		recoverIncompleteStemSeparations([sep]);

		expect(updateStemSeparationStatus).toHaveBeenCalledWith(
			7,
			'error',
			'Stem separation interrupted before task creation'
		);
	});

	it('resumes polling for separations with task_id', async () => {
		const sep = createStemSeparation({
			id: 7,
			task_id: 'stem-task-abc',
			status: 'processing',
			generation_id: 10,
			audio_id: 'audio-1'
		});
		const details = createStemSeparationDetailsResponse();
		vi.mocked(getStemSeparationDetails).mockResolvedValue(details);

		recoverIncompleteStemSeparations([sep]);
		await vi.advanceTimersByTimeAsync(0);

		expect(getStemSeparationDetails).toHaveBeenCalledWith('stem-task-abc');
		expect(completeStemSeparation).toHaveBeenCalledTimes(1);
	});

	it('does nothing for empty array', () => {
		recoverIncompleteStemSeparations([]);

		expect(updateStemSeparationStatus).not.toHaveBeenCalled();
		expect(getStemSeparationDetails).not.toHaveBeenCalled();
	});
});
