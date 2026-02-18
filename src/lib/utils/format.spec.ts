import { describe, expect, it } from 'vitest';
import { formatDate, formatTime, getTimeAgo } from './format';

describe('formatTime', () => {
	it('formats seconds as mm:ss', () => {
		expect(formatTime(65)).toBe('1:05');
		expect(formatTime(3599)).toBe('59:59');
	});

	it('returns 0:00 for zero, invalid, and negative values', () => {
		expect(formatTime(0)).toBe('0:00');
		expect(formatTime(Number.NaN)).toBe('0:00');
		expect(formatTime(-4)).toBe('0:00');
	});
});

describe('formatDate', () => {
	it('formats date strings with custom locale/options', () => {
		expect(
			formatDate('2026-02-18T12:34:56Z', {
				locale: 'en-US',
				formatOptions: {
					month: 'short',
					day: 'numeric',
					year: 'numeric',
					timeZone: 'UTC'
				}
			})
		).toBe('Feb 18, 2026');
	});

	it('returns empty string for invalid dates', () => {
		expect(formatDate('not-a-date')).toBe('');
	});
});

describe('getTimeAgo', () => {
	const now = new Date('2026-02-18T12:00:00Z');
	const fallback = (date: Date) =>
		formatDate(date.toISOString(), {
			locale: 'en-US',
			formatOptions: { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }
		});

	it('formats relative thresholds correctly', () => {
		expect(getTimeAgo('2026-02-18T11:59:45Z', { now })).toBe('just now');
		expect(getTimeAgo('2026-02-18T11:20:00Z', { now })).toBe('40m ago');
		expect(getTimeAgo('2026-02-18T09:00:00Z', { now })).toBe('3h ago');
		expect(getTimeAgo('2026-02-16T12:00:00Z', { now })).toBe('2d ago');
	});

	it('uses custom just-now text and fallback for older values', () => {
		expect(getTimeAgo('2026-02-18T11:59:45Z', { now, justNowText: 'Just now' })).toBe('Just now');
		expect(getTimeAgo('2026-02-01T12:00:00Z', { now, fallback })).toBe('Feb 1, 2026');
	});

	it('falls back for future dates and invalid dates', () => {
		expect(getTimeAgo('2026-02-20T12:00:00Z', { now, fallback })).toBe('Feb 20, 2026');
		expect(getTimeAgo('invalid-date', { now, fallback })).toBe('');
	});
});
