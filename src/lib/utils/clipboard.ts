type CopyFeedbackOptions = {
	resetDelayMs?: number;
	onError?: (error: unknown) => void;
};

export function createCopyWithFeedback(
	setCopied: (copied: boolean) => void,
	options: CopyFeedbackOptions = {}
) {
	const resetDelayMs = options.resetDelayMs ?? 2000;
	let resetTimer: ReturnType<typeof setTimeout> | undefined;

	return async (text: string): Promise<void> => {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);

			if (resetTimer) {
				clearTimeout(resetTimer);
			}

			resetTimer = setTimeout(() => {
				setCopied(false);
			}, resetDelayMs);
		} catch (error) {
			options.onError?.(error);
		}
	};
}
