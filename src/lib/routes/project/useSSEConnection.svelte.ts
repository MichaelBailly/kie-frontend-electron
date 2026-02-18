import { browser } from '$app/environment';
import type { SSEMessage } from '$lib/types';

type ConnectedMessage = { type: 'connected' };

export function useSSEConnection(options: {
	onMessage: (message: SSEMessage) => void;
	reconnectDelayMs?: number;
}) {
	const reconnectDelayMs = options.reconnectDelayMs ?? 3000;

	let eventSource = $state<EventSource | null>(null);
	let reconnectTimeout = $state<ReturnType<typeof setTimeout> | null>(null);

	function clearReconnectTimeout() {
		if (reconnectTimeout) {
			clearTimeout(reconnectTimeout);
			reconnectTimeout = null;
		}
	}

	function connect() {
		if (!browser || eventSource) return;

		eventSource = new EventSource('/api/sse');

		eventSource.onmessage = (event) => {
			try {
				const message = JSON.parse(event.data) as SSEMessage | ConnectedMessage;
				if (message.type === 'connected') return;
				options.onMessage(message);
			} catch (error) {
				console.error('SSE parse error:', error);
			}
		};

		eventSource.onerror = () => {
			disconnect(false);
			clearReconnectTimeout();
			reconnectTimeout = setTimeout(() => {
				reconnectTimeout = null;
				connect();
			}, reconnectDelayMs);
		};
	}

	function disconnect(clearReconnect = true) {
		if (eventSource) {
			eventSource.close();
			eventSource = null;
		}

		if (clearReconnect) {
			clearReconnectTimeout();
		}
	}

	return {
		get eventSource() {
			return eventSource;
		},
		connect,
		disconnect
	};
}
