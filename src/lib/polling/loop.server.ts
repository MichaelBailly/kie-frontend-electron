import { buildTerminalErrorLog, emitPollLog } from './logging.server';

export interface PollLoopController {
	cancel: () => void;
}

export interface PollConfig<TDetails extends { code: number; msg: string }> {
	taskId: string;
	label: string;
	logTag: string;
	isRecovery?: boolean;
	maxAttempts?: number;
	intervalMs?: number;
	timeoutMessage?: string;
	fetchDetails: (taskId: string) => Promise<TDetails>;
	getStatus: (details: TDetails) => string | undefined;
	getStatusErrorMessage: (details: TDetails) => string | undefined;
	isError: (status: string) => boolean;
	isComplete: (status: string) => boolean;
	onError: (errorMessage: string) => void;
	onComplete: (details: TDetails) => boolean;
	onProgress: (details: TDetails) => void;
}

export function runPollLoop<TDetails extends { code: number; msg: string }>(
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
		if (cancelled) return;

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
			if (cancelled) return;

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
				emitPollLog(
					'log',
					buildTerminalErrorLog({
						config,
						details,
						status,
						attempt: attempts,
						prefix
					})
				);
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

			config.onProgress(details);

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
			if (cancelled) return;

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

	return { cancel };
}
