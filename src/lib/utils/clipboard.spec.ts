import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCopyWithFeedback } from './clipboard';

describe('createCopyWithFeedback', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.stubGlobal('navigator', {
			clipboard: {
				writeText: vi.fn().mockResolvedValue(undefined)
			}
		});
	});

	it('copies text and resets copied flag after delay', async () => {
		const copiedStates: boolean[] = [];
		const copy = createCopyWithFeedback((copied) => copiedStates.push(copied));

		await copy('hello world');
		expect(copiedStates).toEqual([true]);

		vi.advanceTimersByTime(2000);
		expect(copiedStates).toEqual([true, false]);
	});

	it('clears previous reset timer on rapid repeated copy', async () => {
		const copiedStates: boolean[] = [];
		const copy = createCopyWithFeedback((copied) => copiedStates.push(copied));

		await copy('first');
		vi.advanceTimersByTime(1000);
		await copy('second');

		vi.advanceTimersByTime(1000);
		expect(copiedStates).toEqual([true, true]);

		vi.advanceTimersByTime(1000);
		expect(copiedStates).toEqual([true, true, false]);
	});

	it('calls onError when clipboard write fails', async () => {
		const onError = vi.fn();
		const writeText = vi.fn().mockRejectedValue(new Error('clipboard unavailable'));
		vi.stubGlobal('navigator', { clipboard: { writeText } });

		const copiedStates: boolean[] = [];
		const copy = createCopyWithFeedback((copied) => copiedStates.push(copied), { onError });

		await copy('test');

		expect(onError).toHaveBeenCalledTimes(1);
		expect(copiedStates).toEqual([]);
	});
});
