/**
 * Integration tests for the WAV conversion API route.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KIE_CALLBACK_URL } from '$lib/constants.server';
import {
	createDbMock,
	createKieApiMock,
	createSseMock,
	createPollingMock,
	type DbMock,
	type KieApiMock,
	type SseMock,
	type PollingMock,
	createRequestEvent,
	createCompletedGeneration,
	createWavConversion,
	createCompletedWavConversion,
	resetFixtureIds,
	flushPromises
} from '$lib/test-utils';

vi.mock('$lib/db.server', () => createDbMock());
vi.mock('$lib/kie-api.server', () => createKieApiMock());
vi.mock('$lib/sse.server', () => createSseMock());
vi.mock('$lib/polling.server', () => createPollingMock());

let db: DbMock;
let kieApi: KieApiMock;
let sse: SseMock;
let polling: PollingMock;

beforeEach(async () => {
	resetFixtureIds();
	db = (await import('$lib/db.server')) as unknown as DbMock;
	kieApi = (await import('$lib/kie-api.server')) as unknown as KieApiMock;
	sse = (await import('$lib/sse.server')) as unknown as SseMock;
	polling = (await import('$lib/polling.server')) as unknown as PollingMock;
	db.__reset();
	kieApi.__reset();
	sse.__reset();
	polling.__reset();
});

describe('POST /api/wav-conversion', () => {
	it('creates a WAV conversion and starts the task', async () => {
		const gen = createCompletedGeneration({
			id: 1,
			task_id: 'task-1',
			track1_audio_id: 'audio-1-1'
		});
		db.__setGenerations([gen]);

		const conversion = createWavConversion({
			id: 10,
			generation_id: 1,
			audio_id: 'audio-1-1'
		});
		db.createWavConversion.mockReturnValue(conversion);

		const { POST } = await import('./+server');
		const event = createRequestEvent({
			body: {
				generationId: 1,
				audioId: 'audio-1-1'
			}
		});

		const response = await POST(event as never);
		const data = await response.json();

		expect(data).toMatchObject({
			id: 10,
			generation_id: 1,
			audio_id: 'audio-1-1',
			status: 'pending'
		});
		expect(db.createWavConversion).toHaveBeenCalledWith(1, 'audio-1-1');
	});

	it('calls convertToWav on the KIE API', async () => {
		const gen = createCompletedGeneration({
			id: 1,
			task_id: 'task-1',
			track1_audio_id: 'audio-1-1'
		});
		db.__setGenerations([gen]);
		db.createWavConversion.mockReturnValue(createWavConversion({ id: 10 }));

		const { POST } = await import('./+server');
		const event = createRequestEvent({
			body: { generationId: 1, audioId: 'audio-1-1' }
		});

		await POST(event as never);
		await flushPromises();

		expect(kieApi.convertToWav).toHaveBeenCalledWith(
			expect.objectContaining({
				taskId: 'task-1',
				audioId: 'audio-1-1',
				callBackUrl: KIE_CALLBACK_URL
			})
		);
	});

	it('starts polling on successful API response', async () => {
		const gen = createCompletedGeneration({
			id: 1,
			task_id: 'task-1',
			track1_audio_id: 'audio-1-1'
		});
		db.__setGenerations([gen]);
		db.createWavConversion.mockReturnValue(createWavConversion({ id: 10 }));

		const { POST } = await import('./+server');
		const event = createRequestEvent({
			body: { generationId: 1, audioId: 'audio-1-1' }
		});

		await POST(event as never);
		await flushPromises();

		expect(db.setWavConversionTaskStarted).toHaveBeenCalledWith(10, 'wav-task-mock-001');
		expect(polling.pollForWavResults).toHaveBeenCalledWith(10, 'wav-task-mock-001', 1, 'audio-1-1');
	});

	it('returns existing conversion when one exists with non-error status', async () => {
		const gen = createCompletedGeneration({
			id: 1,
			task_id: 'task-1',
			track1_audio_id: 'audio-1-1'
		});
		db.__setGenerations([gen]);

		const existing = createCompletedWavConversion({
			id: 5,
			generation_id: 1,
			audio_id: 'audio-1-1'
		});
		db.getWavConversionByGenerationAndAudio.mockReturnValue(existing);

		const { POST } = await import('./+server');
		const event = createRequestEvent({
			body: { generationId: 1, audioId: 'audio-1-1' }
		});

		const response = await POST(event as never);
		const data = await response.json();

		expect(data.id).toBe(5);
		expect(db.createWavConversion).not.toHaveBeenCalled();
	});

	it('creates a new conversion when existing one is errored', async () => {
		const gen = createCompletedGeneration({
			id: 1,
			task_id: 'task-1',
			track1_audio_id: 'audio-1-1'
		});
		db.__setGenerations([gen]);

		db.getWavConversionByGenerationAndAudio.mockReturnValue(
			createWavConversion({ id: 5, status: 'error' })
		);
		db.createWavConversion.mockReturnValue(createWavConversion({ id: 11 }));

		const { POST } = await import('./+server');
		const event = createRequestEvent({
			body: { generationId: 1, audioId: 'audio-1-1' }
		});

		const response = await POST(event as never);
		const data = await response.json();

		expect(data.id).toBe(11);
		expect(db.createWavConversion).toHaveBeenCalled();
	});

	it('throws 400 when generation has no task_id', async () => {
		db.__setGenerations([
			createCompletedGeneration({ id: 1, task_id: null, track1_audio_id: 'audio-1-1' })
		]);

		const { POST } = await import('./+server');
		const event = createRequestEvent({
			body: { generationId: 1, audioId: 'audio-1-1' }
		});

		await expect(POST(event as never)).rejects.toMatchObject({
			status: 400,
			body: { message: expect.stringContaining('no task_id') }
		});
	});
});
