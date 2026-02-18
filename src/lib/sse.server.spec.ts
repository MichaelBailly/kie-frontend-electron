import { beforeEach, describe, expect, it, vi } from 'vitest';

function createController(enqueueImpl?: (chunk: Uint8Array) => void) {
	const enqueue = vi.fn(enqueueImpl);
	return {
		controller: {
			enqueue
		} as unknown as ReadableStreamDefaultController<Uint8Array>,
		enqueue
	};
}

describe('sse.server', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('notifies generation clients with SSE-formatted payload', async () => {
		const { addClient, notifyClients } = await import('./sse.server');
		const { controller, enqueue } = createController();

		addClient('client-1', controller);
		notifyClients(42, 'generation_update', { status: 'pending' });

		expect(enqueue).toHaveBeenCalledTimes(1);
		const chunk = enqueue.mock.calls[0][0] as Uint8Array;
		expect(new TextDecoder().decode(chunk)).toBe(
			'data: {"type":"generation_update","generationId":42,"data":{"status":"pending"}}\n\n'
		);
	});

	it('notifies stem separation clients with SSE-formatted payload', async () => {
		const { addClient, notifyStemSeparationClients } = await import('./sse.server');
		const { controller, enqueue } = createController();

		addClient('client-1', controller);
		notifyStemSeparationClients(7, 42, 'audio-1', 'stem_separation_complete', {
			status: 'success'
		});

		expect(enqueue).toHaveBeenCalledTimes(1);
		const chunk = enqueue.mock.calls[0][0] as Uint8Array;
		expect(new TextDecoder().decode(chunk)).toBe(
			'data: {"type":"stem_separation_complete","stemSeparationId":7,"generationId":42,"audioId":"audio-1","data":{"status":"success"}}\n\n'
		);
	});

	it('notifies annotation clients with SSE-formatted payload', async () => {
		const { addClient, notifyAnnotationClients } = await import('./sse.server');
		const { controller, enqueue } = createController();

		addClient('client-1', controller);
		notifyAnnotationClients(42, 'audio-1', { comment: 'Updated' });

		expect(enqueue).toHaveBeenCalledTimes(1);
		const chunk = enqueue.mock.calls[0][0] as Uint8Array;
		expect(new TextDecoder().decode(chunk)).toBe(
			'data: {"type":"annotation_update","generationId":42,"audioId":"audio-1","data":{"comment":"Updated"}}\n\n'
		);
	});

	it('removes disconnected clients when enqueue throws', async () => {
		const { addClient, notifyClients } = await import('./sse.server');
		const disconnected = createController(() => {
			throw new Error('disconnected');
		});
		const connected = createController();

		addClient('disconnected-client', disconnected.controller);
		addClient('connected-client', connected.controller);

		notifyClients(42, 'generation_update', { status: 'pending' });
		notifyClients(42, 'generation_update', { status: 'success' });

		expect(disconnected.enqueue).toHaveBeenCalledTimes(1);
		expect(connected.enqueue).toHaveBeenCalledTimes(2);
	});
});
