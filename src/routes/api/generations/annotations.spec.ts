/**
 * Integration tests for the annotations API route.
 *
 * - GET   /api/generations/[id]/annotations — get annotation for a variation
 * - PATCH /api/generations/[id]/annotations — toggle star, set labels, update comment
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	createDbMock,
	createSseMock,
	type DbMock,
	type SseMock,
	createRequestEvent,
	createCompletedGeneration,
	createAnnotation,
	resetFixtureIds
} from '$lib/test-utils';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('$lib/db.server', () => createDbMock());
vi.mock('$lib/sse.server', () => createSseMock());
vi.mock('$lib/polling.server', () => ({
	pollForResults: vi.fn(),
	pollForStemSeparationResults: vi.fn()
}));

let db: DbMock;
let sse: SseMock;

beforeEach(async () => {
	resetFixtureIds();
	db = (await import('$lib/db.server')) as unknown as DbMock;
	sse = (await import('$lib/sse.server')) as unknown as SseMock;
	db.__reset();
	sse.__reset();
});

// ---------------------------------------------------------------------------
// GET /api/generations/[id]/annotations
// ---------------------------------------------------------------------------

describe('GET /api/generations/[id]/annotations', () => {
	it('returns existing annotation', async () => {
		const gen = createCompletedGeneration({ id: 1, track1_audio_id: 'audio-1-1' });
		const annotation = createAnnotation({
			generation_id: 1,
			audio_id: 'audio-1-1',
			starred: 1,
			comment: 'Great!'
		});
		db.__setGenerations([gen]);
		db.__setAnnotations([annotation]);

		const { GET } = await import('./[id]/annotations/+server');
		const event = createRequestEvent({
			method: 'GET',
			params: { id: '1' },
			url: 'http://localhost/api/generations/1/annotations?audioId=audio-1-1'
		});
		const response = await GET(event as never);
		const data = await response.json();

		expect(data.starred).toBe(1);
		expect(data.comment).toBe('Great!');
	});

	it('returns default annotation when none exists', async () => {
		const gen = createCompletedGeneration({ id: 1, track1_audio_id: 'audio-1-1' });
		db.__setGenerations([gen]);

		const { GET } = await import('./[id]/annotations/+server');
		const event = createRequestEvent({
			method: 'GET',
			params: { id: '1' },
			url: 'http://localhost/api/generations/1/annotations?audioId=audio-1-1'
		});
		const response = await GET(event as never);
		const data = await response.json();

		expect(data.generation_id).toBe(1);
		expect(data.audio_id).toBe('audio-1-1');
		expect(data.starred).toBe(0);
		expect(data.comment).toBeNull();
		expect(data.labels).toEqual([]);
	});

	it('throws 400 when audioId is missing', async () => {
		const gen = createCompletedGeneration({ id: 1 });
		db.__setGenerations([gen]);

		const { GET } = await import('./[id]/annotations/+server');
		const event = createRequestEvent({
			method: 'GET',
			params: { id: '1' },
			url: 'http://localhost/api/generations/1/annotations'
		});

		await expect(GET(event as never)).rejects.toMatchObject({
			status: 400,
			body: { message: 'audioId query parameter is required' }
		});
	});

	it('throws 404 when generation does not exist', async () => {
		const { GET } = await import('./[id]/annotations/+server');
		const event = createRequestEvent({
			method: 'GET',
			params: { id: '999' },
			url: 'http://localhost/api/generations/999/annotations?audioId=audio-1'
		});

		await expect(GET(event as never)).rejects.toMatchObject({
			status: 404,
			body: { message: 'Generation not found' }
		});
	});

	it('throws 400 for non-integer generation id', async () => {
		const { GET } = await import('./[id]/annotations/+server');
		const event = createRequestEvent({
			method: 'GET',
			params: { id: 'abc' },
			url: 'http://localhost/api/generations/abc/annotations?audioId=audio-1'
		});

		await expect(GET(event as never)).rejects.toMatchObject({ status: 400 });
	});
});

// ---------------------------------------------------------------------------
// PATCH /api/generations/[id]/annotations — toggle_star
// ---------------------------------------------------------------------------

describe('PATCH /api/generations/[id]/annotations — toggle_star', () => {
	it('toggles star and broadcasts SSE', async () => {
		const gen = createCompletedGeneration({
			id: 1,
			track1_audio_id: 'audio-1-1'
		});
		db.__setGenerations([gen]);

		const resultAnnotation = createAnnotation({
			generation_id: 1,
			audio_id: 'audio-1-1',
			starred: 1
		});
		db.toggleStar.mockReturnValue(resultAnnotation);

		const { PATCH } = await import('./[id]/annotations/+server');
		const event = createRequestEvent({
			method: 'PATCH',
			params: { id: '1' },
			body: { audioId: 'audio-1-1', action: 'toggle_star' }
		});
		const response = await PATCH(event as never);
		const data = await response.json();

		expect(data.starred).toBe(1);
		expect(db.toggleStar).toHaveBeenCalledWith(1, 'audio-1-1');
		expect(sse.notifyAnnotationClients).toHaveBeenCalledWith(1, 'audio-1-1', resultAnnotation);
	});
});

// ---------------------------------------------------------------------------
// PATCH /api/generations/[id]/annotations — set_labels
// ---------------------------------------------------------------------------

describe('PATCH /api/generations/[id]/annotations — set_labels', () => {
	it('sets labels on an annotation', async () => {
		const gen = createCompletedGeneration({
			id: 1,
			track1_audio_id: 'audio-1-1'
		});
		db.__setGenerations([gen]);

		const resultAnnotation = createAnnotation({
			generation_id: 1,
			audio_id: 'audio-1-1',
			labels: ['catchy', 'upbeat']
		});
		db.setAnnotationLabels.mockReturnValue(resultAnnotation);

		const { PATCH } = await import('./[id]/annotations/+server');
		const event = createRequestEvent({
			method: 'PATCH',
			params: { id: '1' },
			body: { audioId: 'audio-1-1', action: 'set_labels', labels: ['catchy', 'upbeat'] }
		});
		const response = await PATCH(event as never);
		const data = await response.json();

		expect(data.labels).toEqual(['catchy', 'upbeat']);
		expect(db.setAnnotationLabels).toHaveBeenCalledWith(1, 'audio-1-1', ['catchy', 'upbeat']);
	});

	it('throws 400 when labels is not an array', async () => {
		const gen = createCompletedGeneration({ id: 1, track1_audio_id: 'audio-1-1' });
		db.__setGenerations([gen]);

		const { PATCH } = await import('./[id]/annotations/+server');
		const event = createRequestEvent({
			method: 'PATCH',
			params: { id: '1' },
			body: { audioId: 'audio-1-1', action: 'set_labels', labels: 'not-array' }
		});

		await expect(PATCH(event as never)).rejects.toMatchObject({
			status: 400,
			body: { message: 'labels must be an array' }
		});
	});

	it('throws 400 when a label is not a string', async () => {
		const gen = createCompletedGeneration({ id: 1, track1_audio_id: 'audio-1-1' });
		db.__setGenerations([gen]);

		const { PATCH } = await import('./[id]/annotations/+server');
		const event = createRequestEvent({
			method: 'PATCH',
			params: { id: '1' },
			body: { audioId: 'audio-1-1', action: 'set_labels', labels: [123] }
		});

		await expect(PATCH(event as never)).rejects.toMatchObject({
			status: 400,
			body: { message: 'labels must be strings' }
		});
	});

	it('throws 400 when a label exceeds 128 characters', async () => {
		const gen = createCompletedGeneration({ id: 1, track1_audio_id: 'audio-1-1' });
		db.__setGenerations([gen]);

		const { PATCH } = await import('./[id]/annotations/+server');
		const event = createRequestEvent({
			method: 'PATCH',
			params: { id: '1' },
			body: {
				audioId: 'audio-1-1',
				action: 'set_labels',
				labels: ['a'.repeat(129)]
			}
		});

		await expect(PATCH(event as never)).rejects.toMatchObject({
			status: 400,
			body: { message: 'labels must be 128 characters or less' }
		});
	});
});

// ---------------------------------------------------------------------------
// PATCH /api/generations/[id]/annotations — comment
// ---------------------------------------------------------------------------

describe('PATCH /api/generations/[id]/annotations — comment', () => {
	it('updates comment on an annotation', async () => {
		const gen = createCompletedGeneration({
			id: 1,
			track1_audio_id: 'audio-1-1'
		});
		db.__setGenerations([gen]);

		const resultAnnotation = createAnnotation({
			generation_id: 1,
			audio_id: 'audio-1-1',
			comment: 'Nice verse!'
		});
		db.updateComment.mockReturnValue(resultAnnotation);

		const { PATCH } = await import('./[id]/annotations/+server');
		const event = createRequestEvent({
			method: 'PATCH',
			params: { id: '1' },
			body: { audioId: 'audio-1-1', comment: 'Nice verse!' }
		});
		const response = await PATCH(event as never);
		const data = await response.json();

		expect(data.comment).toBe('Nice verse!');
		expect(db.updateComment).toHaveBeenCalledWith(1, 'audio-1-1', 'Nice verse!');
	});
});

// ---------------------------------------------------------------------------
// PATCH /api/generations/[id]/annotations — validation
// ---------------------------------------------------------------------------

describe('PATCH /api/generations/[id]/annotations — validation', () => {
	it('throws 400 when audioId is missing', async () => {
		const gen = createCompletedGeneration({ id: 1 });
		db.__setGenerations([gen]);

		const { PATCH } = await import('./[id]/annotations/+server');
		const event = createRequestEvent({
			method: 'PATCH',
			params: { id: '1' },
			body: { action: 'toggle_star' }
		});

		await expect(PATCH(event as never)).rejects.toMatchObject({
			status: 400,
			body: { message: 'audioId is required' }
		});
	});

	it('throws 400 when audioId does not belong to the generation', async () => {
		const gen = createCompletedGeneration({
			id: 1,
			track1_audio_id: 'audio-1-1',
			track2_audio_id: 'audio-1-2'
		});
		db.__setGenerations([gen]);

		const { PATCH } = await import('./[id]/annotations/+server');
		const event = createRequestEvent({
			method: 'PATCH',
			params: { id: '1' },
			body: { audioId: 'unknown-audio-id', action: 'toggle_star' }
		});

		await expect(PATCH(event as never)).rejects.toMatchObject({
			status: 400,
			body: { message: 'audioId does not belong to this generation' }
		});
	});

	it('throws 400 when no action or comment is provided', async () => {
		const gen = createCompletedGeneration({
			id: 1,
			track1_audio_id: 'audio-1-1'
		});
		db.__setGenerations([gen]);

		const { PATCH } = await import('./[id]/annotations/+server');
		const event = createRequestEvent({
			method: 'PATCH',
			params: { id: '1' },
			body: { audioId: 'audio-1-1' }
		});

		await expect(PATCH(event as never)).rejects.toMatchObject({
			status: 400,
			body: { message: 'Must provide action or comment' }
		});
	});

	it('throws 404 when generation does not exist', async () => {
		const { PATCH } = await import('./[id]/annotations/+server');
		const event = createRequestEvent({
			method: 'PATCH',
			params: { id: '999' },
			body: { audioId: 'audio-1', action: 'toggle_star' }
		});

		await expect(PATCH(event as never)).rejects.toMatchObject({
			status: 404,
			body: { message: 'Generation not found' }
		});
	});
});
