/**
 * Integration tests for the stem separation API route.
 *
 * - POST /api/stem-separation — start a vocal/stem separation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
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
	createStemSeparation,
	createCompletedStemSeparation,
	resetFixtureIds,
	flushPromises
} from '$lib/test-utils';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// POST /api/stem-separation
// ---------------------------------------------------------------------------

describe('POST /api/stem-separation', () => {
	it('creates a stem separation and starts the task', async () => {
		const gen = createCompletedGeneration({
			id: 1,
			task_id: 'task-1',
			track1_audio_id: 'audio-1-1'
		});
		db.__setGenerations([gen]);

		const separation = createStemSeparation({
			id: 10,
			generation_id: 1,
			audio_id: 'audio-1-1',
			type: 'separate_vocal'
		});
		db.createStemSeparation.mockReturnValue(separation);

		const { POST } = await import('./+server');
		const event = createRequestEvent({
			body: {
				generationId: 1,
				audioId: 'audio-1-1',
				type: 'separate_vocal'
			}
		});

		const response = await POST(event as never);
		const data = await response.json();

		expect(data.id).toBe(10);
		expect(db.createStemSeparation).toHaveBeenCalledWith(1, 'audio-1-1', 'separate_vocal');
	});

	it('calls separateVocals on the KIE API', async () => {
		const gen = createCompletedGeneration({
			id: 1,
			task_id: 'task-1',
			track1_audio_id: 'audio-1-1'
		});
		db.__setGenerations([gen]);

		const separation = createStemSeparation({ id: 10 });
		db.createStemSeparation.mockReturnValue(separation);

		const { POST } = await import('./+server');
		const event = createRequestEvent({
			body: { generationId: 1, audioId: 'audio-1-1', type: 'separate_vocal' }
		});

		await POST(event as never);
		await flushPromises();

		expect(kieApi.separateVocals).toHaveBeenCalledWith(
			expect.objectContaining({
				taskId: 'task-1',
				audioId: 'audio-1-1',
				type: 'separate_vocal'
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

		const separation = createStemSeparation({ id: 10 });
		db.createStemSeparation.mockReturnValue(separation);

		const { POST } = await import('./+server');
		const event = createRequestEvent({
			body: { generationId: 1, audioId: 'audio-1-1', type: 'separate_vocal' }
		});

		await POST(event as never);
		await flushPromises();

		expect(db.updateStemSeparationTaskId).toHaveBeenCalledWith(10, 'stem-task-mock-001');
		expect(polling.pollForStemSeparationResults).toHaveBeenCalledWith(
			10, 'stem-task-mock-001', 1, 'audio-1-1'
		);
	});

	it('returns existing separation when one exists with non-error status', async () => {
		const gen = createCompletedGeneration({
			id: 1,
			task_id: 'task-1',
			track1_audio_id: 'audio-1-1'
		});
		db.__setGenerations([gen]);

		const existingSep = createCompletedStemSeparation({
			id: 5,
			generation_id: 1,
			audio_id: 'audio-1-1',
			type: 'separate_vocal'
		});
		db.getStemSeparationByType.mockReturnValue(existingSep);

		const { POST } = await import('./+server');
		const event = createRequestEvent({
			body: { generationId: 1, audioId: 'audio-1-1', type: 'separate_vocal' }
		});

		const response = await POST(event as never);
		const data = await response.json();

		expect(data.id).toBe(5);
		expect(db.createStemSeparation).not.toHaveBeenCalled();
	});

	it('creates new separation when existing one has error status', async () => {
		const gen = createCompletedGeneration({
			id: 1,
			task_id: 'task-1',
			track1_audio_id: 'audio-1-1'
		});
		db.__setGenerations([gen]);

		const errorSep = createStemSeparation({
			id: 5,
			generation_id: 1,
			audio_id: 'audio-1-1',
			type: 'separate_vocal',
			status: 'error'
		});
		db.getStemSeparationByType.mockReturnValue(errorSep);

		const newSep = createStemSeparation({ id: 11 });
		db.createStemSeparation.mockReturnValue(newSep);

		const { POST } = await import('./+server');
		const event = createRequestEvent({
			body: { generationId: 1, audioId: 'audio-1-1', type: 'separate_vocal' }
		});

		const response = await POST(event as never);
		const data = await response.json();

		expect(data.id).toBe(11);
		expect(db.createStemSeparation).toHaveBeenCalled();
	});

	it('throws 400 when required fields are missing', async () => {
		const { POST } = await import('./+server');
		const event = createRequestEvent({
			body: { generationId: 1 }
		});

		await expect(POST(event as never)).rejects.toMatchObject({
			status: 400,
			body: { message: expect.stringContaining('audioId') }
		});
	});

	it('throws 400 for invalid type', async () => {
		const { POST } = await import('./+server');
		const event = createRequestEvent({
			body: { generationId: 1, audioId: 'audio-1-1', type: 'invalid_type' }
		});

		await expect(POST(event as never)).rejects.toMatchObject({
			status: 400,
			body: { message: expect.stringContaining('separate_vocal') }
		});
	});

	it('throws 404 when generation does not exist', async () => {
		const { POST } = await import('./+server');
		const event = createRequestEvent({
			body: { generationId: 999, audioId: 'audio-1', type: 'separate_vocal' }
		});

		await expect(POST(event as never)).rejects.toMatchObject({
			status: 404,
			body: { message: 'Generation not found' }
		});
	});

	it('throws 400 when generation has no task_id', async () => {
		const gen = createCompletedGeneration({
			id: 1,
			task_id: null,
			track1_audio_id: 'audio-1-1'
		});
		db.__setGenerations([gen]);

		const { POST } = await import('./+server');
		const event = createRequestEvent({
			body: { generationId: 1, audioId: 'audio-1-1', type: 'separate_vocal' }
		});

		await expect(POST(event as never)).rejects.toMatchObject({
			status: 400,
			body: { message: expect.stringContaining('task_id') }
		});
	});

	it('sets separation to error when KIE API returns non-200', async () => {
		const gen = createCompletedGeneration({
			id: 1,
			task_id: 'task-1',
			track1_audio_id: 'audio-1-1'
		});
		db.__setGenerations([gen]);

		const separation = createStemSeparation({ id: 10 });
		db.createStemSeparation.mockReturnValue(separation);

		kieApi.separateVocals.mockResolvedValue({
			code: 500,
			msg: 'Stem failure',
			data: { taskId: '' }
		});

		const { POST } = await import('./+server');
		const event = createRequestEvent({
			body: { generationId: 1, audioId: 'audio-1-1', type: 'separate_vocal' }
		});

		await POST(event as never);
		await flushPromises();

		expect(db.updateStemSeparationStatus).toHaveBeenCalledWith(10, 'error', 'Stem failure');
		expect(sse.notifyStemSeparationClients).toHaveBeenCalledWith(
			10, 1, 'audio-1-1', 'stem_separation_error',
			expect.objectContaining({ status: 'error', error_message: 'Stem failure' })
		);
	});

	it('accepts split_stem type', async () => {
		const gen = createCompletedGeneration({
			id: 1,
			task_id: 'task-1',
			track1_audio_id: 'audio-1-1'
		});
		db.__setGenerations([gen]);

		const separation = createStemSeparation({ id: 10, type: 'split_stem' });
		db.createStemSeparation.mockReturnValue(separation);

		const { POST } = await import('./+server');
		const event = createRequestEvent({
			body: { generationId: 1, audioId: 'audio-1-1', type: 'split_stem' }
		});

		const response = await POST(event as never);
		const data = await response.json();

		expect(data.id).toBe(10);
	});
});
