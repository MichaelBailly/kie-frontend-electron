/**
 * Common test utility functions: setup/teardown helpers and custom assertions.
 */

import { vi, expect } from 'vitest';

// ============================================================================
// Setup / teardown helpers
// ============================================================================

/**
 * Install fake timers and return a cleanup function.
 *
 * Useful for testing polling loops, debounced operations, and timeouts
 * without waiting for real time to pass.
 *
 * @example
 * let cleanup: () => void;
 * beforeEach(() => { cleanup = useFakeTimers(); });
 * afterEach(() => cleanup());
 */
export function useFakeTimers(): () => void {
	vi.useFakeTimers();
	return () => vi.useRealTimers();
}

/**
 * Advance fake timers by the given milliseconds and flush all pending
 * microtasks (Promise callbacks).
 *
 * Combines `vi.advanceTimersByTime()` with a microtask flush so that
 * `setTimeout` + `await` chains resolve correctly.
 */
export async function advanceTimersAndFlush(ms: number): Promise<void> {
	// advanceTimersByTimeAsync advances timers AND flushes microtasks
	await vi.advanceTimersByTimeAsync(ms);
}

// ============================================================================
// Custom assertions
// ============================================================================

/**
 * Assert that a mock function was called exactly once with the given arguments.
 */
export function expectCalledOnceWith(fn: ReturnType<typeof vi.fn>, ...args: unknown[]): void {
	expect(fn).toHaveBeenCalledTimes(1);
	expect(fn).toHaveBeenCalledWith(...args);
}

/**
 * Assert that a mock function was never called.
 */
export function expectNotCalled(fn: ReturnType<typeof vi.fn>): void {
	expect(fn).not.toHaveBeenCalled();
}

/**
 * Assert that a mock function was called with arguments matching partial
 * objects. Useful when you only care about a subset of the arguments.
 *
 * @example
 * expectCalledWithPartial(mockFn, { status: 'error' });
 */
export function expectCalledWithPartial(
	fn: ReturnType<typeof vi.fn>,
	...partials: unknown[]
): void {
	expect(fn).toHaveBeenCalledWith(
		...partials.map((p) => (p !== null && typeof p === 'object' ? expect.objectContaining(p) : p))
	);
}

// ============================================================================
// SvelteKit request helpers
// ============================================================================

/**
 * Create a mock SvelteKit `Request` object with a JSON body.
 *
 * @example
 * const request = createJsonRequest({ projectId: 1, title: 'My Song' });
 */
export function createJsonRequest(body: unknown, method = 'POST'): Request {
	return new Request('http://localhost/test', {
		method,
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

/**
 * Create a mock SvelteKit `RequestEvent`-like object for API route tests.
 *
 * Returns an object with `request`, `params`, and `url` properties that
 * match the shape expected by SvelteKit `RequestHandler` functions.
 *
 * @example
 * const event = createRequestEvent({
 *   body: { title: 'My Song' },
 *   params: { id: '1' },
 * });
 * const response = await POST(event);
 */
export function createRequestEvent(options: {
	body?: unknown;
	params?: Record<string, string>;
	method?: string;
	url?: string;
}): {
	request: Request;
	params: Record<string, string>;
	url: URL;
} {
	const method = options.method ?? 'POST';
	const urlString = options.url ?? 'http://localhost/test';

	const request =
		options.body !== undefined
			? createJsonRequest(options.body, method)
			: new Request(urlString, { method });

	return {
		request,
		params: options.params ?? {},
		url: new URL(urlString)
	};
}

// ============================================================================
// Async helpers
// ============================================================================

/**
 * Wait for all pending promises to resolve.
 * Useful after triggering async operations to ensure side effects complete.
 */
export function flushPromises(): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, 0);
	});
}

/**
 * Create a controllable promise for testing async flows.
 *
 * Returns a promise along with `resolve` and `reject` functions that
 * the test can call at the desired moment.
 *
 * @example
 * const { promise, resolve } = createDeferredPromise<Response>();
 * mockFn.mockReturnValue(promise);
 * // ... trigger code under test ...
 * resolve(someResponse); // now the awaiting code continues
 */
export function createDeferredPromise<T>(): {
	promise: Promise<T>;
	resolve: (value: T) => void;
	reject: (reason?: unknown) => void;
} {
	let resolve!: (value: T) => void;
	let reject!: (reason?: unknown) => void;

	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});

	return { promise, resolve, reject };
}
