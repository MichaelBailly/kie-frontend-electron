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
	setGenerationErrored: vi.fn(),
	setGenerationStatus: vi.fn(),
	updateGenerationTracks: vi.fn(),
	setGenerationCompleted: vi.fn(),
	setStemSeparationErrored: vi.fn(),
	setStemSeparationStatus: vi.fn(),
	setStemSeparationCompleted: vi.fn()
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
	recoverIncompleteStemSeparations,
	cancelGenerationPoll,
	cancelStemSeparationPoll,
	cancelAllPolls
} from '$lib/polling.server';

import { getMusicDetails, getStemSeparationDetails } from '$lib/kie-api.server';
import {
	setGenerationErrored,
	setGenerationStatus,
	setGenerationCompleted,
	setStemSeparationErrored,
	setStemSeparationCompleted
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
	cancelAllPolls();
	cleanupTimers();
});

// ============================================================================
// pollForResults — generation polling
// ============================================================================

describe('pollForResults', () => {
	it('emits structured poll logs with metadata fields', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		const pendingDetails = createPendingMusicDetailsResponse();
		vi.mocked(getMusicDetails).mockResolvedValue(pendingDetails);

		await pollForResults(1, 'task-log-meta');
		await vi.advanceTimersByTimeAsync(0);

		expect(logSpy).toHaveBeenCalledWith(
			expect.stringContaining(
				'"tag":"Poll","phase":"check","taskId":"task-log-meta","entity":"generation 1"'
			)
		);
		expect(logSpy).toHaveBeenCalledWith(
			expect.stringContaining(
				'"tag":"Poll","phase":"status","taskId":"task-log-meta","entity":"generation 1"'
			)
		);

		logSpy.mockRestore();
	});

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

		expect(setGenerationCompleted).toHaveBeenCalledTimes(1);
		expect(setGenerationCompleted).toHaveBeenCalledWith(
			1,
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

		expect(setGenerationErrored).toHaveBeenCalledWith(1, 'Task creation failed');
		expect(notifyClients).toHaveBeenCalledWith(
			1,
			'generation_error',
			expect.objectContaining({ status: 'error' })
		);
		expect(setGenerationCompleted).not.toHaveBeenCalled();
	});

	it('marks generation as error when API returns non-200 code', async () => {
		vi.mocked(getMusicDetails).mockResolvedValue({
			code: 500,
			msg: 'Internal Server Error',
			data: {} as MusicDetailsResponse['data']
		} as MusicDetailsResponse);

		await pollForResults(1, 'task-1');
		await vi.advanceTimersByTimeAsync(0);

		expect(setGenerationErrored).toHaveBeenCalledWith(1, 'Internal Server Error');
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

		expect(setGenerationStatus).toHaveBeenCalledWith(1, 'processing');
		expect(notifyClients).toHaveBeenCalledWith(
			1,
			'generation_update',
			expect.objectContaining({ status: 'processing' })
		);
		expect(setGenerationCompleted).not.toHaveBeenCalled();

		// Second poll after 5s (SUCCESS)
		await vi.advanceTimersByTimeAsync(5000);

		expect(setGenerationCompleted).toHaveBeenCalledTimes(1);
	});

	it('retries on fetch exception and succeeds on next poll', async () => {
		const successDetails = createMusicDetailsResponse();

		vi.mocked(getMusicDetails)
			.mockRejectedValueOnce(new Error('Network error'))
			.mockResolvedValueOnce(successDetails);

		await pollForResults(1, 'task-1');
		// First poll throws
		await vi.advanceTimersByTimeAsync(0);

		expect(setGenerationCompleted).not.toHaveBeenCalled();

		// Retry after 5s
		await vi.advanceTimersByTimeAsync(5000);

		expect(setGenerationCompleted).toHaveBeenCalledTimes(1);
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
		expect(setGenerationCompleted).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(5000);
		expect(setGenerationCompleted).toHaveBeenCalledTimes(1);
	});

	it('deduplicates poll loop start for same generation taskId', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		const pendingDetails = createPendingMusicDetailsResponse();
		vi.mocked(getMusicDetails).mockResolvedValue(pendingDetails);

		await pollForResults(1, 'task-dedupe');
		await pollForResults(1, 'task-dedupe');
		await vi.advanceTimersByTimeAsync(0);

		expect(getMusicDetails).toHaveBeenCalledTimes(1);
		expect(logSpy).toHaveBeenCalledWith(
			expect.stringContaining('"tag":"PollRegistry","phase":"dedupe","taskId":"task-dedupe"')
		);

		logSpy.mockRestore();
	});

	it('cancels active generation poll loop', async () => {
		const pendingDetails = createPendingMusicDetailsResponse();
		vi.mocked(getMusicDetails).mockResolvedValue(pendingDetails);

		await pollForResults(1, 'task-cancel');
		await vi.advanceTimersByTimeAsync(0);

		expect(cancelGenerationPoll('task-cancel')).toBe(true);
		await vi.advanceTimersByTimeAsync(5000);

		expect(getMusicDetails).toHaveBeenCalledTimes(1);
		expect(cancelGenerationPoll('task-cancel')).toBe(false);
	});
});

// ============================================================================
// recoverIncompleteGenerations
// ============================================================================

describe('recoverIncompleteGenerations', () => {
	it('marks generations without task_id as error', () => {
		const gen = createGeneration({ id: 5, task_id: null, status: 'pending' });

		recoverIncompleteGenerations([gen]);

		expect(setGenerationErrored).toHaveBeenCalledWith(
			5,
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
		expect(setGenerationCompleted).toHaveBeenCalledTimes(1);
	});

	it('does nothing for empty array', () => {
		recoverIncompleteGenerations([]);

		expect(setGenerationErrored).not.toHaveBeenCalled();
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

		expect(setStemSeparationCompleted).toHaveBeenCalledTimes(1);
		expect(setStemSeparationCompleted).toHaveBeenCalledWith(
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

		expect(setStemSeparationErrored).toHaveBeenCalledWith(1, 'Stem task failed');
		expect(notifyStemSeparationClients).toHaveBeenCalledWith(
			1,
			10,
			'audio-1',
			'stem_separation_error',
			expect.objectContaining({ status: 'error' })
		);
		expect(setStemSeparationCompleted).not.toHaveBeenCalled();
	});

	it('deduplicates poll loop start for same stem taskId', async () => {
		const pendingStemDetails = createStemSeparationDetailsResponse({
			data: {
				taskId: 'stem-dedupe',
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
		});
		vi.mocked(getStemSeparationDetails).mockResolvedValue(pendingStemDetails);

		await pollForStemSeparationResults(1, 'stem-dedupe', 10, 'audio-1');
		await pollForStemSeparationResults(1, 'stem-dedupe', 10, 'audio-1');
		await vi.advanceTimersByTimeAsync(0);

		expect(getStemSeparationDetails).toHaveBeenCalledTimes(1);
	});

	it('cancels active stem poll loop', async () => {
		const pendingStemDetails = createStemSeparationDetailsResponse({
			data: {
				taskId: 'stem-cancel',
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
		});
		vi.mocked(getStemSeparationDetails).mockResolvedValue(pendingStemDetails);

		await pollForStemSeparationResults(1, 'stem-cancel', 10, 'audio-1');
		await vi.advanceTimersByTimeAsync(0);

		expect(cancelStemSeparationPoll('stem-cancel')).toBe(true);
		await vi.advanceTimersByTimeAsync(5000);

		expect(getStemSeparationDetails).toHaveBeenCalledTimes(1);
		expect(cancelStemSeparationPoll('stem-cancel')).toBe(false);
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

		expect(setStemSeparationErrored).toHaveBeenCalledWith(
			7,
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
		expect(setStemSeparationCompleted).toHaveBeenCalledTimes(1);
	});

	it('does nothing for empty array', () => {
		recoverIncompleteStemSeparations([]);

		expect(setStemSeparationErrored).not.toHaveBeenCalled();
		expect(getStemSeparationDetails).not.toHaveBeenCalled();
	});
});
