/**
 * Integration tests for the projects API routes.
 *
 * - GET  /api/projects        — list all projects
 * - POST /api/projects        — create a project
 * - GET  /api/projects/[id]   — get project with generations
 * - PATCH /api/projects/[id]  — rename / update is_open
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	createDbMock,
	type DbMock,
	createRequestEvent,
	createProject,
	createGeneration,
	resetFixtureIds
} from '$lib/test-utils';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('$lib/db.server', () => createDbMock());
vi.mock('$lib/sse.server', () => ({
	notifyClients: vi.fn(),
	notifyStemSeparationClients: vi.fn(),
	notifyAnnotationClients: vi.fn()
}));
vi.mock('$lib/polling.server', () => ({
	pollForResults: vi.fn(),
	pollForStemSeparationResults: vi.fn()
}));

let db: DbMock;

beforeEach(async () => {
	resetFixtureIds();
	db = (await import('$lib/db.server')) as unknown as DbMock;
	db.__reset();
});

// ---------------------------------------------------------------------------
// GET /api/projects
// ---------------------------------------------------------------------------

describe('GET /api/projects', () => {
	it('returns an empty array when no projects exist', async () => {
		const { GET } = await import('./+server');
		const event = createRequestEvent({ method: 'GET' });
		const response = await GET(event as never);
		const data = await response.json();

		expect(data).toEqual([]);
	});

	it('returns all projects', async () => {
		const p1 = createProject({ id: 1, name: 'Project A' });
		const p2 = createProject({ id: 2, name: 'Project B' });
		db.__setProjects([p1, p2]);

		const { GET } = await import('./+server');
		const event = createRequestEvent({ method: 'GET' });
		const response = await GET(event as never);
		const data = await response.json();

		expect(data).toHaveLength(2);
		expect(data[0].name).toBe('Project A');
		expect(data[1].name).toBe('Project B');
	});
});

// ---------------------------------------------------------------------------
// POST /api/projects
// ---------------------------------------------------------------------------

describe('POST /api/projects', () => {
	it('creates a project with the given name', async () => {
		const { POST } = await import('./+server');
		const event = createRequestEvent({ body: { name: 'My Album' } });
		const response = await POST(event as never);
		const data = await response.json();

		expect(data.name).toBe('My Album');
		expect(db.createProject).toHaveBeenCalledWith('My Album');
	});

	it('defaults name to "New Project" when name is empty', async () => {
		const { POST } = await import('./+server');
		const event = createRequestEvent({ body: { name: '' } });
		const response = await POST(event as never);
		const data = await response.json();

		expect(data.name).toBe('New Project');
		expect(db.createProject).toHaveBeenCalledWith('New Project');
	});

	it('defaults name to "New Project" when name is not provided', async () => {
		const { POST } = await import('./+server');
		const event = createRequestEvent({ body: {} });
		const response = await POST(event as never);
		const data = await response.json();

		expect(data.name).toBe('New Project');
	});
});

// ---------------------------------------------------------------------------
// GET /api/projects/[id]
// ---------------------------------------------------------------------------

describe('GET /api/projects/[id]', () => {
	it('returns project with its generations', async () => {
		const project = createProject({ id: 1 });
		const gen = createGeneration({ id: 10, project_id: 1 });
		db.__setProjects([project]);
		db.__setGenerations([gen]);

		const { GET } = await import('./[id]/+server');
		const event = createRequestEvent({ method: 'GET', params: { id: '1' } });
		const response = await GET(event as never);
		const data = await response.json();

		expect(data.project.id).toBe(1);
		expect(data.generations).toHaveLength(1);
		expect(data.generations[0].id).toBe(10);
	});

	it('throws 404 when project does not exist', async () => {
		const { GET } = await import('./[id]/+server');
		const event = createRequestEvent({ method: 'GET', params: { id: '999' } });

		await expect(GET(event as never)).rejects.toMatchObject({
			status: 404,
			body: { message: 'Project not found' }
		});
	});

	it('throws 400 for non-integer id', async () => {
		const { GET } = await import('./[id]/+server');
		const event = createRequestEvent({ method: 'GET', params: { id: 'abc' } });

		await expect(GET(event as never)).rejects.toMatchObject({
			status: 400,
			body: { message: 'Invalid id: must be an integer' }
		});
	});
});

// ---------------------------------------------------------------------------
// PATCH /api/projects/[id]
// ---------------------------------------------------------------------------

describe('PATCH /api/projects/[id]', () => {
	it('updates the project name', async () => {
		const project = createProject({ id: 1, name: 'Old Name' });
		db.__setProjects([project]);

		const { PATCH } = await import('./[id]/+server');
		const event = createRequestEvent({
			body: { name: 'New Name' },
			params: { id: '1' },
			method: 'PATCH'
		});
		const response = await PATCH(event as never);
		const data = await response.json();

		expect(data.success).toBe(true);
		expect(db.updateProjectName).toHaveBeenCalledWith(1, 'New Name');
	});

	it('updates is_open', async () => {
		const project = createProject({ id: 1 });
		db.__setProjects([project]);

		const { PATCH } = await import('./[id]/+server');
		const event = createRequestEvent({
			body: { is_open: false },
			params: { id: '1' },
			method: 'PATCH'
		});
		const response = await PATCH(event as never);
		const data = await response.json();

		expect(data.success).toBe(true);
		expect(db.setProjectOpen).toHaveBeenCalledWith(1, false);
	});

	it('throws 404 when project does not exist', async () => {
		const { PATCH } = await import('./[id]/+server');
		const event = createRequestEvent({
			body: { name: 'Ignored' },
			params: { id: '999' },
			method: 'PATCH'
		});

		await expect(PATCH(event as never)).rejects.toMatchObject({
			status: 404,
			body: { message: 'Project not found' }
		});
	});

	it('throws 400 for non-integer id', async () => {
		const { PATCH } = await import('./[id]/+server');
		const event = createRequestEvent({
			body: { name: 'Whatever' },
			params: { id: 'xyz' },
			method: 'PATCH'
		});

		await expect(PATCH(event as never)).rejects.toMatchObject({
			status: 400,
			body: { message: 'Invalid id: must be an integer' }
		});
	});

	it('does not call updateProjectName when name is not provided', async () => {
		const project = createProject({ id: 1 });
		db.__setProjects([project]);

		const { PATCH } = await import('./[id]/+server');
		const event = createRequestEvent({
			body: { is_open: true },
			params: { id: '1' },
			method: 'PATCH'
		});
		await PATCH(event as never);

		expect(db.updateProjectName).not.toHaveBeenCalled();
	});
});
