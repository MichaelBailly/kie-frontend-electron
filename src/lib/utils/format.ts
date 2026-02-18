type FormatDateOptions = {
	locale?: string;
	formatOptions?: Intl.DateTimeFormatOptions;
};

type TimeAgoOptions = {
	now?: Date;
	justNowText?: string;
	fallback?: (date: Date) => string;
};

export function formatTime(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds <= 0) {
		return '0:00';
	}

	const totalSeconds = Math.floor(seconds);
	const mins = Math.floor(totalSeconds / 60);
	const secs = totalSeconds % 60;
	return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatDate(dateStr: string, options: FormatDateOptions = {}): string {
	const date = new Date(dateStr);
	if (Number.isNaN(date.getTime())) {
		return '';
	}

	return date.toLocaleDateString(options.locale, options.formatOptions);
}

export function getTimeAgo(dateStr: string, options: TimeAgoOptions = {}): string {
	const date = new Date(dateStr);
	if (Number.isNaN(date.getTime())) {
		return '';
	}

	const now = options.now ?? new Date();
	const justNowText = options.justNowText ?? 'just now';
	const fallback = options.fallback ?? ((inputDate: Date) => formatDate(inputDate.toISOString()));

	const diffMs = now.getTime() - date.getTime();
	if (diffMs < 0) {
		return fallback(date);
	}

	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMins / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffMins < 1) return justNowText;
	if (diffMins < 60) return `${diffMins}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	if (diffDays < 7) return `${diffDays}d ago`;
	return fallback(date);
}
