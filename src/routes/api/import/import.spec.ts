/**
 * Contract tests for the import API route.
 *
 * - POST /api/import — import a completed KIE task into a new project/generation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	createDbMock,
	createKieApiMock,
	type DbMock,
	type KieApiMock,
	createRequestEvent,
	createGeneration,
	createMusicDetailsResponse,
	createPendingMusicDetailsResponse,
	createErrorMusicDetailsResponse,
	resetFixtureIds
} from '$lib/test-utils';

vi.mock('$lib/db.server', () => createDbMock());
vi.mock('$lib/kie-api.server', () => createKieApiMock());

let db: DbMock;
let kieApi: KieApiMock;

beforeEach(async () => {
	resetFixtureIds();
	db = (await import('$lib/db.server')) as unknown as DbMock;
	kieApi = (await import('$lib/kie-api.server')) as unknown as KieApiMock;
	db.__reset();
	kieApi.__reset();
});

describe('POST /api/import', () => {
	it('imports a completed task and returns project/generation payload', async () => {
		db.createImportedGeneration.mockReturnValue(
			createGeneration({
				id: 42,
				title: 'Summer Vibes'
			})
		);
		kieApi.getMusicDetails.mockResolvedValue(createMusicDetailsResponse());

		const { POST } = await import('./+server');
		const event = createRequestEvent({
			body: { taskId: 'task-abc-123', projectName: 'Imported Project' }
		});
		const response = await POST(event as never);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(data.project.name).toBe('Imported Project');
		expect(data.generation.id).toBe(42);
		expect(db.createProject).toHaveBeenCalledWith('Imported Project');
		expect(db.createImportedGeneration).toHaveBeenCalled();
	});

	it('returns 400 for invalid JSON body', async () => {
		const { POST } = await import('./+server');
		const event = {
			request: new Request('http://localhost/test', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: '{invalid-json'
			}),
			params: {},
			url: new URL('http://localhost/test')
		};

		const response = await POST(event as never);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.error).toBe('Invalid JSON body');
	});

	it('returns 400 when taskId is missing or not a string', async () => {
		const { POST } = await import('./+server');
		const event = createRequestEvent({
			body: { projectName: 'X' }
		});
		const response = await POST(event as never);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.error).toBe('Task ID is required and must be a string');
	});

	it('returns 400 when taskId is empty', async () => {
		const { POST } = await import('./+server');
		const event = createRequestEvent({
			body: { taskId: '   ' }
		});
		const response = await POST(event as never);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.error).toBe('Task ID cannot be empty');
	});

	it('returns 404 when task is not found on KIE API', async () => {
		kieApi.getMusicDetails.mockRejectedValue(new Error('404 Not Found'));

		const { POST } = await import('./+server');
		const event = createRequestEvent({ body: { taskId: 'missing-task' } });
		const response = await POST(event as never);
		const data = await response.json();

		expect(response.status).toBe(404);
		expect(data.error).toBe('Task ID not found. Please verify the ID is correct.');
	});

	it('returns 400 when generation is still in progress', async () => {
		kieApi.getMusicDetails.mockResolvedValue(createPendingMusicDetailsResponse());

		const { POST } = await import('./+server');
		const event = createRequestEvent({ body: { taskId: 'task-abc-123' } });
		const response = await POST(event as never);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.error).toContain('Cannot import: generation is still queued');
	});

	it('returns 400 when KIE task completed with error status', async () => {
		kieApi.getMusicDetails.mockResolvedValue(createErrorMusicDetailsResponse());

		const { POST } = await import('./+server');
		const event = createRequestEvent({ body: { taskId: 'task-abc-123' } });
		const response = await POST(event as never);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.error).toContain('Cannot import: The generation task failed to start');
	});

	it('returns 500 when database write fails', async () => {
		db.createProject.mockImplementation(() => {
			throw new Error('db exploded');
		});
		kieApi.getMusicDetails.mockResolvedValue(createMusicDetailsResponse());

		const { POST } = await import('./+server');
		const event = createRequestEvent({ body: { taskId: 'task-abc-123' } });
		const response = await POST(event as never);
		const data = await response.json();

		expect(response.status).toBe(500);
		expect(data.error).toBe('Failed to save imported song to database. Please try again.');
	});
});
