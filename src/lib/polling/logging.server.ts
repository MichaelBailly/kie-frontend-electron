export type PollLogLevel = 'log' | 'error';

export interface PollLogEvent {
	tag: string;
	phase: string;
	taskId?: string;
	entity?: string;
	attempt?: number;
	status?: string;
	intervalSeconds?: number;
	isRecovery?: boolean;
	detail?: string;
	errorCode?: string | null;
	errorMessage?: string | null;
	apiMessage?: string;
}

export interface TerminalErrorDetails {
	code: number;
	msg: string;
	data?: unknown;
}

export interface TerminalErrorLogConfig<TDetails extends TerminalErrorDetails> {
	taskId: string;
	label: string;
	logTag: string;
	isRecovery?: boolean;
	getStatusErrorMessage: (details: TDetails) => string | undefined;
}

export function buildTerminalErrorLog<TDetails extends TerminalErrorDetails>(options: {
	config: TerminalErrorLogConfig<TDetails>;
	details: TDetails;
	status: string;
	attempt: number;
	prefix: string;
}): PollLogEvent {
	const errorMessage = options.config.getStatusErrorMessage(options.details) ?? null;
	const errorCode =
		typeof options.details === 'object' &&
		options.details !== null &&
		'data' in options.details &&
		typeof options.details.data === 'object' &&
		options.details.data !== null &&
		'errorCode' in options.details.data
			? String((options.details.data as { errorCode?: unknown }).errorCode ?? '') || null
			: null;

	const detailParts = [
		`${options.prefix}[${options.config.logTag} #${options.attempt}] ERROR status detected: ${options.status}`
	];
	if (errorCode) detailParts.push(`errorCode=${errorCode}`);
	if (errorMessage) detailParts.push(`errorMessage=${errorMessage}`);
	if (options.details.msg) detailParts.push(`apiMessage=${options.details.msg}`);

	return {
		tag: options.config.logTag,
		phase: 'terminal_error',
		taskId: options.config.taskId,
		entity: options.config.label,
		attempt: options.attempt,
		status: options.status,
		isRecovery: !!options.config.isRecovery,
		errorCode,
		errorMessage,
		apiMessage: options.details.msg,
		detail: detailParts.join(' | ')
	};
}

export function emitPollLog(level: PollLogLevel, event: PollLogEvent): void {
	const payload = JSON.stringify(event);
	if (level === 'error') {
		console.error(`[PollEvent] ${payload}`);
		return;
	}

	console.log(`[PollEvent] ${payload}`);
}
