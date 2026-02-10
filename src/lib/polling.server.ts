import type { Generation, StemSeparation } from '$lib/types';
import {
	updateGenerationStatus,
	updateGenerationTracks,
	completeGeneration,
	updateStemSeparationStatus,
	completeStemSeparation
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

/**
 * Generic polling engine for KIE API async tasks.
 *
 * Polls the API at regular intervals until the task reaches a terminal state
 * (complete or error), a timeout is hit, or max retries are exhausted on
 * consecutive exceptions.
 */
async function runPollLoop<TDetails extends { code: number; msg: string }>(
	config: PollConfig<TDetails>
): Promise<void> {
	const maxAttempts = config.maxAttempts ?? 120;
	const intervalMs = config.intervalMs ?? 5000;
	const timeoutMessage = config.timeoutMessage ?? `${config.label} timed out`;
	let attempts = 0;
	const prefix = config.isRecovery ? '[Recovery]' : '';

	const poll = async () => {
		attempts++;
		console.log(
			`${prefix}[${config.logTag} #${attempts}] Checking taskId: ${config.taskId} for ${config.label}`
		);

		try {
			const details = await config.fetchDetails(config.taskId);
			const status = config.getStatus(details);
			console.log(`${prefix}[${config.logTag} #${attempts}] Status: ${status}`);

			if (details.code !== 200) {
				config.onError(details.msg);
				return;
			}

			if (status && config.isError(status)) {
				console.log(`${prefix}[${config.logTag} #${attempts}] ERROR status detected: ${status}`);
				config.onError(config.getStatusErrorMessage(details) || status);
				return;
			}

			if (status && config.isComplete(status)) {
				console.log(`${prefix}[${config.logTag} #${attempts}] COMPLETE status detected: ${status}`);
				if (config.onComplete(details)) {
					return;
				}
			}

			// Intermediate update
			config.onProgress(details);

			// Continue polling or timeout
			if (attempts < maxAttempts) {
				console.log(
					`${prefix}[${config.logTag} #${attempts}] Continuing to poll in ${intervalMs / 1000} seconds...`
				);
				setTimeout(poll, intervalMs);
			} else {
				config.onError(timeoutMessage);
			}
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Unknown error';
			console.error(`${prefix}[${config.logTag} #${attempts}] Error:`, errorMessage);
			if (attempts < maxAttempts) {
				setTimeout(poll, intervalMs);
			} else {
				config.onError(errorMessage);
			}
		}
	};

	poll();
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
	runPollLoop<MusicDetailsResponse>({
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
			updateGenerationStatus(generationId, 'error', msg);
			notifyClients(generationId, 'generation_error', {
				status: 'error',
				error_message: msg
			});
		},

		onComplete(details) {
			const sunoData = details.data.response?.sunoData || [];
			const track1 = sunoData[0];
			const track2 = sunoData[1];

			if (!track1 || !track2) return false;

			completeGeneration(
				generationId,
				'success',
				{
					streamUrl: track1.streamAudioUrl,
					audioUrl: track1.audioUrl,
					imageUrl: track1.imageUrl,
					duration: track1.duration,
					audioId: track1.id
				},
				{
					streamUrl: track2.streamAudioUrl,
					audioUrl: track2.audioUrl,
					imageUrl: track2.imageUrl,
					duration: track2.duration,
					audioId: track2.id
				},
				JSON.stringify(details.data)
			);

			notifyClients(generationId, 'generation_complete', {
				status: 'success',
				track1_stream_url: track1.streamAudioUrl,
				track1_audio_url: track1.audioUrl,
				track1_image_url: track1.imageUrl,
				track1_duration: track1.duration,
				track1_audio_id: track1.id,
				track2_stream_url: track2.streamAudioUrl,
				track2_audio_url: track2.audioUrl,
				track2_image_url: track2.imageUrl,
				track2_duration: track2.duration,
				track2_audio_id: track2.id,
				response_data: JSON.stringify(details.data)
			});
			return true;
		},

		onProgress(details) {
			const status = details.data.status;
			const statusMap: Record<string, string> = {
				PENDING: 'processing',
				TEXT_SUCCESS: 'text_success',
				FIRST_SUCCESS: 'first_success'
			};
			const newStatus = statusMap[status] || 'processing';
			updateGenerationStatus(generationId, newStatus);

			if (
				(status === 'TEXT_SUCCESS' || status === 'FIRST_SUCCESS') &&
				details.data.response?.sunoData
			) {
				const sunoData = details.data.response.sunoData;
				const track1 = sunoData[0];
				const track2 = sunoData[1];

				if (track1?.streamAudioUrl || track2?.streamAudioUrl) {
					updateGenerationTracks(
						generationId,
						{
							streamUrl: track1?.streamAudioUrl,
							imageUrl: track1?.imageUrl,
							audioId: track1?.id
						},
						{
							streamUrl: track2?.streamAudioUrl,
							imageUrl: track2?.imageUrl,
							audioId: track2?.id
						}
					);

					notifyClients(generationId, 'generation_update', {
						status: newStatus,
						track1_stream_url: track1?.streamAudioUrl,
						track1_image_url: track1?.imageUrl,
						track2_stream_url: track2?.streamAudioUrl,
						track2_image_url: track2?.imageUrl
					});
					return;
				}
			}

			notifyClients(generationId, 'generation_update', { status: newStatus });
		}
	});
}

/**
 * Recover incomplete generations by resuming polling.
 * Called on server startup to handle generations interrupted by server shutdown.
 */
export function recoverIncompleteGenerations(generations: Generation[]): void {
	if (generations.length === 0) {
		console.log('[Recovery] No incomplete generations to recover');
		return;
	}

	console.log(`[Recovery] Found ${generations.length} incomplete generation(s) to recover`);

	for (const generation of generations) {
		if (!generation.task_id) {
			console.log(`[Recovery] Generation ${generation.id} has no task_id, marking as error`);
			updateGenerationStatus(generation.id, 'error', 'Generation interrupted before task creation');
			continue;
		}

		console.log(
			`[Recovery] Resuming polling for generation ${generation.id} (taskId: ${generation.task_id}, status: ${generation.status})`
		);
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
	runPollLoop<StemSeparationDetailsResponse>({
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
			updateStemSeparationStatus(stemSeparationId, 'error', msg);
			notifyStemSeparationClients(
				stemSeparationId,
				generationId,
				audioId,
				'stem_separation_error',
				{ status: 'error', error_message: msg }
			);
		},

		onComplete(details) {
			const { response } = details.data;
			if (!response) return false;

			completeStemSeparation(
				stemSeparationId,
				{
					vocalUrl: response.vocalUrl || undefined,
					instrumentalUrl: response.instrumentalUrl || undefined,
					backingVocalsUrl: response.backingVocalsUrl || undefined,
					drumsUrl: response.drumsUrl || undefined,
					bassUrl: response.bassUrl || undefined,
					guitarUrl: response.guitarUrl || undefined,
					keyboardUrl: response.keyboardUrl || undefined,
					pianoUrl: response.pianoUrl || undefined,
					percussionUrl: response.percussionUrl || undefined,
					stringsUrl: response.stringsUrl || undefined,
					synthUrl: response.synthUrl || undefined,
					fxUrl: response.fxUrl || undefined,
					brassUrl: response.brassUrl || undefined,
					woodwindsUrl: response.woodwindsUrl || undefined
				},
				JSON.stringify(details.data)
			);

			notifyStemSeparationClients(
				stemSeparationId,
				generationId,
				audioId,
				'stem_separation_complete',
				{
					status: 'success',
					vocal_url: response.vocalUrl,
					instrumental_url: response.instrumentalUrl,
					backing_vocals_url: response.backingVocalsUrl,
					drums_url: response.drumsUrl,
					bass_url: response.bassUrl,
					guitar_url: response.guitarUrl,
					keyboard_url: response.keyboardUrl,
					piano_url: response.pianoUrl,
					percussion_url: response.percussionUrl,
					strings_url: response.stringsUrl,
					synth_url: response.synthUrl,
					fx_url: response.fxUrl,
					brass_url: response.brassUrl,
					woodwinds_url: response.woodwindsUrl
				}
			);
			return true;
		},

		onProgress() {
			updateStemSeparationStatus(stemSeparationId, 'processing');
			notifyStemSeparationClients(
				stemSeparationId,
				generationId,
				audioId,
				'stem_separation_update',
				{ status: 'processing' }
			);
		}
	});
}

/**
 * Recover incomplete stem separations by resuming polling.
 */
export function recoverIncompleteStemSeparations(separations: StemSeparation[]): void {
	if (separations.length === 0) {
		console.log('[Recovery] No incomplete stem separations to recover');
		return;
	}

	console.log(`[Recovery] Found ${separations.length} incomplete stem separation(s) to recover`);

	for (const separation of separations) {
		if (!separation.task_id) {
			console.log(`[Recovery] Stem separation ${separation.id} has no task_id, marking as error`);
			updateStemSeparationStatus(
				separation.id,
				'error',
				'Stem separation interrupted before task creation'
			);
			continue;
		}

		console.log(
			`[Recovery] Resuming polling for stem separation ${separation.id} (taskId: ${separation.task_id}, status: ${separation.status})`
		);
		pollForStemSeparationResults(
			separation.id,
			separation.task_id,
			separation.generation_id,
			separation.audio_id,
			{ isRecovery: true }
		);
	}
}
