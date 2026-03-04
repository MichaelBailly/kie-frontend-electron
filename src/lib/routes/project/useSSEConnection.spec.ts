import { beforeEach, describe, expect, it, vi } from 'vitest';

type MessageHandler = ((event: { data: string }) => void) | null;
type ErrorHandler = (() => void) | null;

class MockEventSource {
	static instances: MockEventSource[] = [];

	readonly url: string;
	onmessage: MessageHandler = null;
	onerror: ErrorHandler = null;
	close = vi.fn();

	constructor(url: string) {
		this.url = url;
		MockEventSource.instances.push(this);
	}
}

async function loadComposable() {
	vi.resetModules();
	vi.doMock('$app/environment', () => ({ browser: true }));
	return import('./useSSEConnection.svelte');
}

describe('useSSEConnection', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
		MockEventSource.instances = [];
		vi.useRealTimers();
		vi.stubGlobal('EventSource', MockEventSource as unknown as typeof EventSource);
	});

	it('connects and forwards non-connected messages', async () => {
		const onMessage = vi.fn();
		const { useSSEConnection } = await loadComposable();
		const sse = useSSEConnection({ onMessage });

		sse.connect();

		expect(MockEventSource.instances).toHaveLength(1);
		const instance = MockEventSource.instances[0];
		expect(instance.url).toBe('/api/sse');

		instance.onmessage?.({ data: JSON.stringify({ type: 'connected' }) });
		expect(onMessage).not.toHaveBeenCalled();

		instance.onmessage?.({
			data: JSON.stringify({
				type: 'generation_update',
				generationId: 10,
				data: { status: 'processing' }
			})
		});
		expect(onMessage).toHaveBeenCalledTimes(1);
	});

	it('reconnects after errors using the configured delay', async () => {
		vi.useFakeTimers();
		const onMessage = vi.fn();
		const { useSSEConnection } = await loadComposable();
		const sse = useSSEConnection({ onMessage, reconnectDelayMs: 1000 });

		sse.connect();
		expect(MockEventSource.instances).toHaveLength(1);

		const first = MockEventSource.instances[0];
		first.onerror?.();
		expect(first.close).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(999);
		expect(MockEventSource.instances).toHaveLength(1);

		vi.advanceTimersByTime(1);
		expect(MockEventSource.instances).toHaveLength(2);
	});

	it('cancels pending reconnect when disconnect is called explicitly', async () => {
		vi.useFakeTimers();
		const onMessage = vi.fn();
		const { useSSEConnection } = await loadComposable();
		const sse = useSSEConnection({ onMessage, reconnectDelayMs: 500 });

		sse.connect();
		const first = MockEventSource.instances[0];
		first.onerror?.();

		sse.disconnect();
		vi.advanceTimersByTime(1000);

		expect(MockEventSource.instances).toHaveLength(1);
		expect(first.close).toHaveBeenCalled();
	});
});
