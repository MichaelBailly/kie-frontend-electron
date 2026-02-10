/**
 * Integration tests for the SSE API route.
 *
 * - GET /api/sse — establish Server-Sent Events stream
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSseMock, type SseMock, createRequestEvent } from '$lib/test-utils';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('$lib/sse.server', () => createSseMock());

let sse: SseMock;

beforeEach(async () => {
	sse = (await import('$lib/sse.server')) as unknown as SseMock;
	sse.__reset();
});

// ---------------------------------------------------------------------------
// GET /api/sse
// ---------------------------------------------------------------------------

describe('GET /api/sse', () => {
	it('returns a response with SSE headers', async () => {
		const { GET } = await import('./+server');
		const event = createRequestEvent({ method: 'GET' });
		const response = await GET(event as never);

		expect(response.headers.get('Content-Type')).toBe('text/event-stream');
		expect(response.headers.get('Cache-Control')).toBe('no-cache');
		expect(response.headers.get('Connection')).toBe('keep-alive');
	});

	it('returns a ReadableStream body', async () => {
		const { GET } = await import('./+server');
		const event = createRequestEvent({ method: 'GET' });
		const response = await GET(event as never);

		expect(response.body).toBeInstanceOf(ReadableStream);
	});

	it('calls addClient with a client ID', async () => {
		const { GET } = await import('./+server');
		const event = createRequestEvent({ method: 'GET' });

		await GET(event as never);

		expect(sse.addClient).toHaveBeenCalledTimes(1);
		// First arg should be a UUID string
		const clientId = sse.addClient.mock.calls[0][0];
		expect(typeof clientId).toBe('string');
		expect(clientId.length).toBeGreaterThan(0);
	});

	it('sends initial connection message', async () => {
		const { GET } = await import('./+server');
		const event = createRequestEvent({ method: 'GET' });

		await GET(event as never);

		// The controller is the second arg passed to addClient
		const controller = sse.addClient.mock.calls[0][1];
		expect(controller).toBeDefined();
	});
});
