import type { Generation, StemSeparation } from '$lib/types';
import {
	setGenerationErrored,
	setGenerationStatus,
	updateGenerationTracks,
	setGenerationCompleted,
	setStemSeparationErrored,
	setStemSeparationStatus,
	setStemSeparationCompleted
} from '$lib/db.server';
import type { MusicDetailsResponse, StemSeparationDetailsResponse } from '$lib/kie-api.server';
import {
	getMusicDetails,
	isErrorStatus,
	isCompleteStatus,
	getStemSeparationDetails,
	isStemSeparationErrorStatus,
	isStemSeparationCompleteStatus
} from '$lib/kie-api.server';
import { notifyClients, notifyStemSeparationClients } from '$lib/sse.server';
import {
	mapGenerationCompletion,
	mapGenerationProgress
} from '$lib/polling/generation-mapper.server';
import { mapStemCompletion } from '$lib/polling/stem-mapper.server';

// ============================================================================
// Generic polling engine
// ============================================================================

/**
 * Configuration for the generic polling engine.
 *
 * @typeParam TDetails - The full API response type (e.g., MusicDetailsResponse)
 */
interface PollConfig<TDetails extends { code: number; msg: string }> {
	/** The KIE API task ID to poll */
	taskId: string;
	/** Human-readable label for logging (e.g., "generation 5") */
	label: string;
	/** Short tag for log lines (e.g., "Poll", "StemPoll") */
	logTag: string;
	/** Whether this is a recovery poll (prepends [Recovery] to logs) */
	isRecovery?: boolean;
	/** Maximum polling attempts before timeout. Default: 120 (10 min at 5s intervals) */
	maxAttempts?: number;
	/** Polling interval in milliseconds. Default: 5000 */
	intervalMs?: number;
	/** Error message on timeout. Default: "<label> timed out" */
	timeoutMessage?: string;

	/** Fetch current task details from the KIE API */
	fetchDetails: (taskId: string) => Promise<TDetails>;
	/** Extract the status string from the response (e.g., data.status or data.successFlag) */
	getStatus: (details: TDetails) => string | undefined;
	/** Extract a human-readable error message from the response data */
	getStatusErrorMessage: (details: TDetails) => string | undefined;
	/** Returns true if the status indicates an error */
	isError: (status: string) => boolean;
	/** Returns true if the status indicates completion */
	isComplete: (status: string) => boolean;

	/** Called on any error (API error, status error, timeout, unrecoverable exception) */
	onError: (errorMessage: string) => void;
	/** Called when completion status is detected. Return true to stop polling, false to continue. */
	onComplete: (details: TDetails) => boolean;
	/** Called for intermediate status updates */
	onProgress: (details: TDetails) => void;
}

interface PollLoopController {
	cancel: () => void;
}

const activeGenerationPolls = new Map<string, PollLoopController>();
const activeStemPolls = new Map<string, PollLoopController>();

type PollLogLevel = 'log' | 'error';

interface PollLogEvent {
	tag: string;
	phase: string;
	taskId?: string;
	entity?: string;
	attempt?: number;
	status?: string;
	intervalSeconds?: number;
	isRecovery?: boolean;
	detail?: string;
}

function emitPollLog(level: PollLogLevel, event: PollLogEvent): void {
	const payload = JSON.stringify(event);
	if (level === 'error') {
		console.error(`[PollEvent] ${payload}`);
		return;
	}

	console.log(`[PollEvent] ${payload}`);
}

/**
 * Generic polling engine for KIE API async tasks.
 *
 * Polls the API at regular intervals until the task reaches a terminal state
 * (complete or error), a timeout is hit, or max retries are exhausted on
 * consecutive exceptions.
 */
function runPollLoop<TDetails extends { code: number; msg: string }>(
	config: PollConfig<TDetails>
): PollLoopController {
	const maxAttempts = config.maxAttempts ?? 120;
	const intervalMs = config.intervalMs ?? 5000;
	const timeoutMessage = config.timeoutMessage ?? `${config.label} timed out`;
	let attempts = 0;
	let cancelled = false;
	let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
	const prefix = config.isRecovery ? '[Recovery]' : '';

	const cancel = () => {
		cancelled = true;
		if (timeoutHandle) {
			clearTimeout(timeoutHandle);
			timeoutHandle = null;
		}
	};

	const poll = async () => {
		if (cancelled) {
			return;
		}

		attempts++;
		emitPollLog('log', {
			tag: config.logTag,
			phase: 'check',
			taskId: config.taskId,
			entity: config.label,
			attempt: attempts,
			isRecovery: !!config.isRecovery,
			detail: `${prefix}[${config.logTag} #${attempts}] Checking taskId: ${config.taskId} for ${config.label}`
		});

		try {
			const details = await config.fetchDetails(config.taskId);
			if (cancelled) {
				return;
			}

			const status = config.getStatus(details);
			emitPollLog('log', {
				tag: config.logTag,
				phase: 'status',
				taskId: config.taskId,
				entity: config.label,
				attempt: attempts,
				status,
				isRecovery: !!config.isRecovery,
				detail: `${prefix}[${config.logTag} #${attempts}] Status: ${status}`
			});

			if (details.code !== 200) {
				config.onError(details.msg);
				cancel();
				return;
			}

			if (status && config.isError(status)) {
				emitPollLog('log', {
					tag: config.logTag,
					phase: 'terminal_error',
					taskId: config.taskId,
					entity: config.label,
					attempt: attempts,
					status,
					isRecovery: !!config.isRecovery,
					detail: `${prefix}[${config.logTag} #${attempts}] ERROR status detected: ${status}`
				});
				config.onError(config.getStatusErrorMessage(details) || status);
				cancel();
				return;
			}

			if (status && config.isComplete(status)) {
				emitPollLog('log', {
					tag: config.logTag,
					phase: 'terminal_complete',
					taskId: config.taskId,
					entity: config.label,
					attempt: attempts,
					status,
					isRecovery: !!config.isRecovery,
					detail: `${prefix}[${config.logTag} #${attempts}] COMPLETE status detected: ${status}`
				});
				if (config.onComplete(details)) {
					cancel();
					return;
				}
			}

			// Intermediate update
			config.onProgress(details);

			// Continue polling or timeout
			if (attempts < maxAttempts) {
				emitPollLog('log', {
					tag: config.logTag,
					phase: 'schedule_next',
					taskId: config.taskId,
					entity: config.label,
					attempt: attempts,
					intervalSeconds: intervalMs / 1000,
					isRecovery: !!config.isRecovery,
					detail: `${prefix}[${config.logTag} #${attempts}] Continuing to poll in ${intervalMs / 1000} seconds...`
				});
				timeoutHandle = setTimeout(poll, intervalMs);
			} else {
				config.onError(timeoutMessage);
				cancel();
			}
		} catch (err) {
			if (cancelled) {
				return;
			}

			const errorMessage = err instanceof Error ? err.message : 'Unknown error';
			emitPollLog('error', {
				tag: config.logTag,
				phase: 'exception',
				taskId: config.taskId,
				entity: config.label,
				attempt: attempts,
				isRecovery: !!config.isRecovery,
				detail: `${prefix}[${config.logTag} #${attempts}] Error: ${errorMessage}`
			});
			if (attempts < maxAttempts) {
				timeoutHandle = setTimeout(poll, intervalMs);
			} else {
				config.onError(errorMessage);
				cancel();
			}
		}
	};

	void poll();

	return {
		cancel
	};
}

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
