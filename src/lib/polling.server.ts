import type { Generation, StemSeparation, WavConversion } from '$lib/types';
import {
	setGenerationErrored,
	setGenerationStatus,
	updateGenerationTracks,
	setGenerationCompleted,
	setStemSeparationErrored,
	setStemSeparationStatus,
	setStemSeparationCompleted,
	setWavConversionCompleted,
	setWavConversionErrored,
	setWavConversionStatus
} from '$lib/db.server';
import type {
	MusicDetailsResponse,
	StemSeparationDetailsResponse,
	WavDetailsResponse
} from '$lib/kie-api.server';
import {
	getMusicDetails,
	isErrorStatus,
	isCompleteStatus,
	getStemSeparationDetails,
	isStemSeparationErrorStatus,
	isStemSeparationCompleteStatus,
	getWavDetails,
	isWavErrorStatus,
	isWavCompleteStatus
} from '$lib/kie-api.server';
import {
	notifyClients,
	notifyStemSeparationClients,
	notifyWavConversionClients
} from '$lib/sse.server';
import {
	mapGenerationCompletion,
	mapGenerationProgress
} from '$lib/polling/generation-mapper.server';
import { runPollLoop, type PollLoopController } from '$lib/polling/loop.server';
import { emitPollLog } from '$lib/polling/logging.server';
import { mapStemCompletion } from '$lib/polling/stem-mapper.server';
import { mapWavCompletion } from '$lib/polling/wav-mapper.server';

const activeGenerationPolls = new Map<string, PollLoopController>();
const activeStemPolls = new Map<string, PollLoopController>();
const activeWavPolls = new Map<string, PollLoopController>();

export function cancelGenerationPoll(taskId: string): boolean {
	const loop = activeGenerationPolls.get(taskId);
	if (!loop) {
		return false;
	}

	loop.cancel();
	activeGenerationPolls.delete(taskId);
	return true;
}

export function cancelStemSeparationPoll(taskId: string): boolean {
	const loop = activeStemPolls.get(taskId);
	if (!loop) {
		return false;
	}

	loop.cancel();
	activeStemPolls.delete(taskId);
	return true;
}

export function cancelAllPolls(): void {
	for (const loop of activeGenerationPolls.values()) {
		loop.cancel();
	}
	activeGenerationPolls.clear();

	for (const loop of activeStemPolls.values()) {
		loop.cancel();
	}
	activeStemPolls.clear();

	for (const loop of activeWavPolls.values()) {
		loop.cancel();
	}
	activeWavPolls.clear();
}

// ============================================================================
// Generation polling
// ============================================================================

/**
 * Poll for generation results from the KIE API.
 * This function is extracted to be reusable for both new generations and recovery.
 */
export async function pollForResults(
	generationId: number,
	taskId: string,
	options: { isRecovery?: boolean } = {}
): Promise<void> {
	if (activeGenerationPolls.has(taskId)) {
		emitPollLog('log', {
			tag: 'PollRegistry',
			phase: 'dedupe',
			taskId,
			entity: `generation ${generationId}`,
			isRecovery: !!options.isRecovery,
			detail: `[PollRegistry] Poll already active for generation taskId: ${taskId}`
		});
		return;
	}

	const loop = runPollLoop<MusicDetailsResponse>({
		taskId,
		label: `generation ${generationId}`,
		logTag: 'Poll',
		isRecovery: options.isRecovery,
		timeoutMessage: 'Generation timed out',

		fetchDetails: getMusicDetails,
		getStatus: (d) => d.data?.status,
		getStatusErrorMessage: (d) => d.data?.errorMessage ?? undefined,
		isError: isErrorStatus,
		isComplete: isCompleteStatus,

		onError(msg) {
			activeGenerationPolls.delete(taskId);
			setGenerationErrored(generationId, msg);
			notifyClients(generationId, 'generation_error', {
				status: 'error',
				error_message: msg
			});
		},

		onComplete(details) {
			const completion = mapGenerationCompletion(details);
			if (!completion) return false;

			activeGenerationPolls.delete(taskId);

			setGenerationCompleted(
				generationId,
				completion.track1,
				completion.track2,
				completion.responseData
			);

			notifyClients(generationId, 'generation_complete', completion.ssePayload);
			return true;
		},

		onProgress(details) {
			const progress = mapGenerationProgress(details);
			setGenerationStatus(generationId, progress.status);

			if (progress.trackUpdate) {
				updateGenerationTracks(
					generationId,
					progress.trackUpdate.track1,
					progress.trackUpdate.track2
				);
				notifyClients(generationId, 'generation_update', progress.trackUpdate.ssePayload);
				return;
			}

			notifyClients(generationId, 'generation_update', progress.ssePayload);
		}
	});

	activeGenerationPolls.set(taskId, loop);
}

/**
 * Recover incomplete generations by resuming polling.
 * Called on server startup to handle generations interrupted by server shutdown.
 */
export function recoverIncompleteGenerations(generations: Generation[]): void {
	if (generations.length === 0) {
		emitPollLog('log', {
			tag: 'Recovery',
			phase: 'scan_none',
			entity: 'generation',
			isRecovery: true,
			detail: '[Recovery] No incomplete generations to recover'
		});
		return;
	}

	emitPollLog('log', {
		tag: 'Recovery',
		phase: 'scan_found',
		entity: 'generation',
		status: String(generations.length),
		isRecovery: true,
		detail: `[Recovery] Found ${generations.length} incomplete generation(s) to recover`
	});

	for (const generation of generations) {
		if (!generation.task_id) {
			emitPollLog('log', {
				tag: 'Recovery',
				phase: 'missing_task_id',
				entity: `generation ${generation.id}`,
				isRecovery: true,
				detail: `[Recovery] Generation ${generation.id} has no task_id, marking as error`
			});
			setGenerationErrored(generation.id, 'Generation interrupted before task creation');
			continue;
		}

		emitPollLog('log', {
			tag: 'Recovery',
			phase: 'resume',
			taskId: generation.task_id,
			entity: `generation ${generation.id}`,
			status: generation.status,
			isRecovery: true,
			detail: `[Recovery] Resuming polling for generation ${generation.id} (taskId: ${generation.task_id}, status: ${generation.status})`
		});
		pollForResults(generation.id, generation.task_id, { isRecovery: true });
	}
}

// ============================================================================
// Stem separation polling
// ============================================================================

/**
 * Poll for stem separation results from the KIE API.
 */
export async function pollForStemSeparationResults(
	stemSeparationId: number,
	taskId: string,
	generationId: number,
	audioId: string,
	options: { isRecovery?: boolean } = {}
): Promise<void> {
	if (activeStemPolls.has(taskId)) {
		emitPollLog('log', {
			tag: 'PollRegistry',
			phase: 'dedupe',
			taskId,
			entity: `stem separation ${stemSeparationId}`,
			isRecovery: !!options.isRecovery,
			detail: `[PollRegistry] Poll already active for stem taskId: ${taskId}`
		});
		return;
	}

	const loop = runPollLoop<StemSeparationDetailsResponse>({
		taskId,
		label: `stem separation ${stemSeparationId}`,
		logTag: 'StemPoll',
		isRecovery: options.isRecovery,
		timeoutMessage: 'Stem separation timed out',

		fetchDetails: getStemSeparationDetails,
		getStatus: (d) => d.data?.successFlag,
		getStatusErrorMessage: (d) => d.data?.errorMessage ?? undefined,
		isError: isStemSeparationErrorStatus,
		isComplete: isStemSeparationCompleteStatus,

		onError(msg) {
			activeStemPolls.delete(taskId);
			setStemSeparationErrored(stemSeparationId, msg);
			notifyStemSeparationClients(
				stemSeparationId,
				generationId,
				audioId,
				'stem_separation_error',
				{ status: 'error', error_message: msg }
			);
		},

		onComplete(details) {
			const completion = mapStemCompletion(details);
			if (!completion) return false;

			activeStemPolls.delete(taskId);

			setStemSeparationCompleted(stemSeparationId, completion.data, completion.responseData);

			notifyStemSeparationClients(
				stemSeparationId,
				generationId,
				audioId,
				'stem_separation_complete',
				completion.ssePayload
			);
			return true;
		},

		onProgress() {
			setStemSeparationStatus(stemSeparationId, 'processing');
			notifyStemSeparationClients(
				stemSeparationId,
				generationId,
				audioId,
				'stem_separation_update',
				{ status: 'processing' }
			);
		}
	});

	activeStemPolls.set(taskId, loop);
}

/**
 * Recover incomplete stem separations by resuming polling.
 */
export function recoverIncompleteStemSeparations(separations: StemSeparation[]): void {
	if (separations.length === 0) {
		emitPollLog('log', {
			tag: 'Recovery',
			phase: 'scan_none',
			entity: 'stem separation',
			isRecovery: true,
			detail: '[Recovery] No incomplete stem separations to recover'
		});
		return;
	}

	emitPollLog('log', {
		tag: 'Recovery',
		phase: 'scan_found',
		entity: 'stem separation',
		status: String(separations.length),
		isRecovery: true,
		detail: `[Recovery] Found ${separations.length} incomplete stem separation(s) to recover`
	});

	for (const separation of separations) {
		if (!separation.task_id) {
			emitPollLog('log', {
				tag: 'Recovery',
				phase: 'missing_task_id',
				entity: `stem separation ${separation.id}`,
				isRecovery: true,
				detail: `[Recovery] Stem separation ${separation.id} has no task_id, marking as error`
			});
			setStemSeparationErrored(separation.id, 'Stem separation interrupted before task creation');
			continue;
		}

		emitPollLog('log', {
			tag: 'Recovery',
			phase: 'resume',
			taskId: separation.task_id,
			entity: `stem separation ${separation.id}`,
			status: separation.status,
			isRecovery: true,
			detail: `[Recovery] Resuming polling for stem separation ${separation.id} (taskId: ${separation.task_id}, status: ${separation.status})`
		});
		pollForStemSeparationResults(
			separation.id,
			separation.task_id,
			separation.generation_id,
			separation.audio_id,
			{ isRecovery: true }
		);
	}
}

// ============================================================================
// WAV conversion polling
// ============================================================================

export async function pollForWavResults(
	wavConversionId: number,
	taskId: string,
	generationId: number,
	audioId: string,
	options: { isRecovery?: boolean } = {}
): Promise<void> {
	if (activeWavPolls.has(taskId)) {
		emitPollLog('log', {
			tag: 'PollRegistry',
			phase: 'dedupe',
			taskId,
			entity: `wav conversion ${wavConversionId}`,
			isRecovery: !!options.isRecovery,
			detail: `[PollRegistry] Poll already active for wav taskId: ${taskId}`
		});
		return;
	}

	const loop = runPollLoop<WavDetailsResponse>({
		taskId,
		label: `wav conversion ${wavConversionId}`,
		logTag: 'WavPoll',
		isRecovery: options.isRecovery,
		timeoutMessage: 'WAV conversion timed out',

		fetchDetails: getWavDetails,
		getStatus: (d) => d.data?.successFlag,
		getStatusErrorMessage: (d) => d.data?.errorMessage ?? undefined,
		isError: isWavErrorStatus,
		isComplete: isWavCompleteStatus,

		onError(msg) {
			activeWavPolls.delete(taskId);
			setWavConversionErrored(wavConversionId, msg);
			notifyWavConversionClients(wavConversionId, generationId, audioId, 'wav_conversion_error', {
				status: 'error',
				error_message: msg
			});
		},

		onComplete(details) {
			const completion = mapWavCompletion(details);
			if (!completion) return false;

			activeWavPolls.delete(taskId);
			setWavConversionCompleted(wavConversionId, completion.wavUrl, completion.responseData);
			notifyWavConversionClients(
				wavConversionId,
				generationId,
				audioId,
				'wav_conversion_complete',
				completion.ssePayload
			);
			return true;
		},

		onProgress() {
			setWavConversionStatus(wavConversionId, 'processing');
			notifyWavConversionClients(wavConversionId, generationId, audioId, 'wav_conversion_update', {
				status: 'processing'
			});
		}
	});

	activeWavPolls.set(taskId, loop);
}

export function recoverIncompleteWavConversions(conversions: WavConversion[]): void {
	if (conversions.length === 0) {
		emitPollLog('log', {
			tag: 'Recovery',
			phase: 'scan_none',
			entity: 'wav conversion',
			isRecovery: true,
			detail: '[Recovery] No incomplete wav conversions to recover'
		});
		return;
	}

	emitPollLog('log', {
		tag: 'Recovery',
		phase: 'scan_found',
		entity: 'wav conversion',
		status: String(conversions.length),
		isRecovery: true,
		detail: `[Recovery] Found ${conversions.length} incomplete wav conversion(s) to recover`
	});

	for (const conversion of conversions) {
		if (!conversion.task_id) {
			emitPollLog('log', {
				tag: 'Recovery',
				phase: 'missing_task_id',
				entity: `wav conversion ${conversion.id}`,
				isRecovery: true,
				detail: `[Recovery] WAV conversion ${conversion.id} has no task_id, marking as error`
			});
			setWavConversionErrored(conversion.id, 'WAV conversion interrupted before task creation');
			continue;
		}

		emitPollLog('log', {
			tag: 'Recovery',
			phase: 'resume',
			taskId: conversion.task_id,
			entity: `wav conversion ${conversion.id}`,
			status: conversion.status,
			isRecovery: true,
			detail: `[Recovery] Resuming polling for wav conversion ${conversion.id} (taskId: ${conversion.task_id}, status: ${conversion.status})`
		});

		pollForWavResults(
			conversion.id,
			conversion.task_id,
			conversion.generation_id,
			conversion.audio_id,
			{
				isRecovery: true
			}
		);
	}
}
