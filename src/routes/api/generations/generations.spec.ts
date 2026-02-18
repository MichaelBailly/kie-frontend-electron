/**
 * Integration tests for the generations API routes.
 *
 * - POST   /api/generations           — create a generation
 * - POST   /api/generations/extend    — extend a song
 * - GET    /api/generations/[id]      — get generation by id
 * - DELETE /api/generations/[id]      — delete generation
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
	createProject,
	createGeneration,
	createCompletedGeneration,
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
// Local scenario builders
//
// Repeated DB-seeding steps are extracted here so each test reads as a
// scenario description rather than raw infrastructure setup.
// ---------------------------------------------------------------------------

/** Seeds a project (id=1) and wires db.createGeneration to return a pending
 *  generation (id=10).  Used across all "create generation" happy-path tests. */
function seedNewGenerationScenario() {
	const project = createProject({ id: 1 });
	db.__setProjects([project]);
	const gen = createGeneration({ id: 10, project_id: 1 });
	db.createGeneration.mockReturnValue(gen);
	return { project, gen };
}

/** Seeds a project (id=1) and a completed parent generation ready for the
 *  extend-song route tests. */
function seedExtendScenario(opts: { parentId?: number; audioId?: string } = {}) {
	const { parentId = 5, audioId = 'audio-5-1' } = opts;
	const project = createProject({ id: 1 });
	const parentGen = createCompletedGeneration({
		id: parentId,
		project_id: 1,
		track1_audio_id: audioId
	});
	db.__setProjects([project]);
	db.__setGenerations([parentGen]);
	return { project, parentGen };
}

// ---------------------------------------------------------------------------
// POST /api/generations
// ---------------------------------------------------------------------------

describe('POST /api/generations', () => {
	it('throws 400 for invalid JSON body', async () => {
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

		await expect(POST(event as never)).rejects.toMatchObject({
			status: 400,
			body: { message: 'Invalid JSON body' }
		});
	});

	it('throws 400 when JSON body is not an object', async () => {
		const { POST } = await import('./+server');
		const event = createRequestEvent({
			body: ['not-an-object']
		});

		await expect(POST(event as never)).rejects.toMatchObject({
			status: 400,
			body: { message: 'JSON body must be an object' }
		});
	});

	it('creates a generation and starts the task', async () => {
		seedNewGenerationScenario();

		const { POST } = await import('./+server');
		const event = createRequestEvent({
			body: {
				projectId: 1,
				title: 'My Song',
				style: 'pop',
				lyrics: 'Hello world'
			}
		});

		const response = await POST(event as never);
		const data = await response.json();

		expect(data.id).toBe(10);
		expect(data).toMatchObject({
			id: expect.any(Number),
			project_id: 1,
			title: expect.any(String),
			style: expect.any(String),
			lyrics: expect.any(String),
			status: expect.any(String)
		});
		expect(db.createGeneration).toHaveBeenCalledWith(1, 'My Song', 'pop', 'Hello world');
	});

	it('calls KIE API generateMusic after creating the generation', async () => {
		seedNewGenerationScenario();

		const { POST } = await import('./+server');
		const event = createRequestEvent({
			body: { projectId: 1, title: 'Song', style: 'rock', lyrics: 'Lyrics' }
		});

		await POST(event as never);
		await flushPromises();

		expect(kieApi.generateMusic).toHaveBeenCalledWith(
			expect.objectContaining({
				prompt: 'Lyrics',
				style: 'rock',
				title: 'Song',
				customMode: true,
				instrumental: false,
				model: 'V5',
				callBackUrl: KIE_CALLBACK_URL
			})
		);
	});

	it('throws 400 when required fields are missing', async () => {
		const { POST } = await import('./+server');
		const event = createRequestEvent({
			body: { projectId: 1 }
		});

		await expect(POST(event as never)).rejects.toMatchObject({
			status: 400,
			body: { message: expect.stringContaining('title') }
		});
	});

	it('throws 400 when projectId is not a positive integer', async () => {
		const { POST } = await import('./+server');
		const event = createRequestEvent({
			body: { projectId: '1', title: 'T', style: 'S', lyrics: 'L' }
		});

		await expect(POST(event as never)).rejects.toMatchObject({
			status: 400,
			body: { message: 'Invalid projectId: must be a positive integer' }
		});
	});

	it('throws 400 when title is an empty string', async () => {
		const { POST } = await import('./+server');
		const event = createRequestEvent({
			body: { projectId: 1, title: '   ', style: 'S', lyrics: 'L' }
		});

		await expect(POST(event as never)).rejects.toMatchObject({
			status: 400,
			body: { message: 'Invalid title: cannot be empty' }
		});
	});

	it('throws 404 when project does not exist', async () => {
		const { POST } = await import('./+server');
		const event = createRequestEvent({
			body: { projectId: 999, title: 'T', style: 'S', lyrics: 'L' }
		});

		await expect(POST(event as never)).rejects.toMatchObject({
			status: 404,
			body: { message: 'Project not found' }
		});
	});

	it('sets generation to error when KIE API returns non-200', async () => {
		seedNewGenerationScenario();

		kieApi.generateMusic.mockResolvedValue({
			code: 500,
			msg: 'API failure',
			data: { taskId: '' }
		});

		const { POST } = await import('./+server');
		const event = createRequestEvent({
			body: { projectId: 1, title: 'T', style: 'S', lyrics: 'L' }
		});

		// The route returns the generation immediately, the error happens async
		await POST(event as never);
		await flushPromises();

		expect(db.setGenerationErrored).toHaveBeenCalledWith(10, 'API failure');
		expect(sse.notifyClients).toHaveBeenCalledWith(
			10,
			'generation_error',
			expect.objectContaining({ status: 'error', error_message: 'API failure' })
		);
	});

	it('starts polling on successful KIE API response', async () => {
		seedNewGenerationScenario();

		// Ensure default success response (previous test may have overridden)
		kieApi.generateMusic.mockResolvedValue({
			code: 200,
			msg: 'success',
			data: { taskId: 'task-mock-001' }
		});

		const { POST } = await import('./+server');
		const event = createRequestEvent({
			body: { projectId: 1, title: 'T', style: 'S', lyrics: 'L' }
		});

		await POST(event as never);
		await flushPromises();

		expect(db.setGenerationTaskStarted).toHaveBeenCalledWith(10, 'task-mock-001');
		expect(polling.pollForResults).toHaveBeenCalledWith(10, 'task-mock-001');
	});

	it('sets generation to error when KIE API throws', async () => {
		seedNewGenerationScenario();

		kieApi.generateMusic.mockRejectedValue(new Error('network down'));

		const { POST } = await import('./+server');
		const event = createRequestEvent({
			body: { projectId: 1, title: 'T', style: 'S', lyrics: 'L' }
		});

		await POST(event as never);
		await flushPromises();

		expect(db.setGenerationErrored).toHaveBeenCalledWith(10, 'network down');
		expect(sse.notifyClients).toHaveBeenCalledWith(
			10,
			'generation_error',
			expect.objectContaining({ status: 'error', error_message: 'network down' })
		);
	});
});

// ---------------------------------------------------------------------------
// POST /api/generations/extend
// ---------------------------------------------------------------------------

describe('POST /api/generations/extend', () => {
	it('throws 400 for invalid JSON body', async () => {
		const { POST } = await import('./extend/+server');
		const event = {
			request: new Request('http://localhost/test', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: '{invalid-json'
			}),
			params: {},
			url: new URL('http://localhost/test')
		};

		await expect(POST(event as never)).rejects.toMatchObject({
			status: 400,
			body: { message: 'Invalid JSON body' }
		});
	});

	it('throws 400 when extendsGenerationId is not a positive integer', async () => {
		const { POST } = await import('./extend/+server');
		const event = createRequestEvent({
			body: {
				projectId: 1,
				title: 'T',
				style: 'S',
				lyrics: 'L',
				extendsGenerationId: '5',
				extendsAudioId: 'audio-5-1',
				continueAt: 30
			}
		});

		await expect(POST(event as never)).rejects.toMatchObject({
			status: 400,
			body: { message: 'Invalid extendsGenerationId: must be a positive integer' }
		});
	});

	it('throws 400 when continueAt is not a number', async () => {
		const { POST } = await import('./extend/+server');
		const event = createRequestEvent({
			body: {
				projectId: 1,
				title: 'T',
				style: 'S',
				lyrics: 'L',
				extendsGenerationId: 5,
				extendsAudioId: 'audio-5-1',
				continueAt: '30'
			}
		});

		await expect(POST(event as never)).rejects.toMatchObject({
			status: 400,
			body: { message: 'Invalid continueAt: must be a non-negative number' }
		});
	});

	it('creates an extend generation and starts the task', async () => {
		seedExtendScenario();

		const extendGen = createGeneration({
			id: 20,
			project_id: 1,
			extends_generation_id: 5,
			extends_audio_id: 'audio-5-1',
			continue_at: 30
		});
		db.createExtendGeneration.mockReturnValue(extendGen);

		const { POST } = await import('./extend/+server');
		const event = createRequestEvent({
			body: {
				projectId: 1,
				title: 'Extended',
				style: 'rock',
				lyrics: 'More lyrics',
				extendsGenerationId: 5,
				extendsAudioId: 'audio-5-1',
				continueAt: 30
			}
		});

		const response = await POST(event as never);
		const data = await response.json();

		expect(data.id).toBe(20);
		expect(db.createExtendGeneration).toHaveBeenCalledWith(
			1,
			'Extended',
			'rock',
			'More lyrics',
			5,
			'audio-5-1',
			30
		);
	});

	it('throws 400 when required fields are missing', async () => {
		const { POST } = await import('./extend/+server');
		const event = createRequestEvent({
			body: { projectId: 1, title: 'T' }
		});

		await expect(POST(event as never)).rejects.toMatchObject({
			status: 400,
			body: { message: expect.stringContaining('style') }
		});
	});

	it('throws 400 when continueAt is negative', async () => {
		const { POST } = await import('./extend/+server');
		const event = createRequestEvent({
			body: {
				projectId: 1,
				title: 'T',
				style: 'S',
				lyrics: 'L',
				extendsGenerationId: 5,
				extendsAudioId: 'audio-5-1',
				continueAt: -1
			}
		});

		await expect(POST(event as never)).rejects.toMatchObject({ status: 400 });
	});

	it('throws 400 when continueAt is missing', async () => {
		const project = createProject({ id: 1 });
		const parentGen = createCompletedGeneration({ id: 5, project_id: 1 });
		db.__setProjects([project]);
		db.__setGenerations([parentGen]);

		const { POST } = await import('./extend/+server');
		const event = createRequestEvent({
			body: {
				projectId: 1,
				title: 'T',
				style: 'S',
				lyrics: 'L',
				extendsGenerationId: 5,
				extendsAudioId: 'audio-5-1'
			}
		});

		await expect(POST(event as never)).rejects.toMatchObject({ status: 400 });
	});

	it('throws 404 when project does not exist', async () => {
		const { POST } = await import('./extend/+server');
		const event = createRequestEvent({
			body: {
				projectId: 999,
				title: 'T',
				style: 'S',
				lyrics: 'L',
				extendsGenerationId: 5,
				extendsAudioId: 'audio-5-1',
				continueAt: 30
			}
		});

		await expect(POST(event as never)).rejects.toMatchObject({
			status: 404,
			body: { message: 'Project not found' }
		});
	});

	it('throws 404 when parent generation does not exist', async () => {
		const project = createProject({ id: 1 });
		db.__setProjects([project]);

		const { POST } = await import('./extend/+server');
		const event = createRequestEvent({
			body: {
				projectId: 1,
				title: 'T',
				style: 'S',
				lyrics: 'L',
				extendsGenerationId: 999,
				extendsAudioId: 'audio-999-1',
				continueAt: 30
			}
		});

		await expect(POST(event as never)).rejects.toMatchObject({
			status: 404,
			body: { message: 'Parent generation not found' }
		});
	});

	it('calls extendMusic on the KIE API', async () => {
		seedExtendScenario();

		const extendGen = createGeneration({ id: 20, project_id: 1 });
		db.createExtendGeneration.mockReturnValue(extendGen);

		const { POST } = await import('./extend/+server');
		const event = createRequestEvent({
			body: {
				projectId: 1,
				title: 'Extended',
				style: 'rock',
				lyrics: 'More',
				extendsGenerationId: 5,
				extendsAudioId: 'audio-5-1',
				continueAt: 30
			}
		});

		await POST(event as never);
		await flushPromises();

		expect(kieApi.extendMusic).toHaveBeenCalledWith(
			expect.objectContaining({
				audioId: 'audio-5-1',
				prompt: 'More',
				style: 'rock',
				title: 'Extended',
				continueAt: 30,
				model: 'V5',
				callBackUrl: KIE_CALLBACK_URL
			})
		);
	});
});

// ---------------------------------------------------------------------------
// GET /api/generations/[id]
// ---------------------------------------------------------------------------

describe('GET /api/generations/[id]', () => {
	it('returns the generation by id', async () => {
		const gen = createGeneration({ id: 7 });
		db.__setGenerations([gen]);

		const { GET } = await import('./[id]/+server');
		const event = createRequestEvent({ method: 'GET', params: { id: '7' } });
		const response = await GET(event as never);
		const data = await response.json();

		expect(data.id).toBe(7);
	});

	it('throws 404 for unknown generation', async () => {
		const { GET } = await import('./[id]/+server');
		const event = createRequestEvent({ method: 'GET', params: { id: '999' } });

		await expect(GET(event as never)).rejects.toMatchObject({
			status: 404,
			body: { message: 'Generation not found' }
		});
	});

	it('throws 400 for non-integer id', async () => {
		const { GET } = await import('./[id]/+server');
		const event = createRequestEvent({ method: 'GET', params: { id: 'abc' } });

		await expect(GET(event as never)).rejects.toMatchObject({
			status: 400
		});
	});
});

// ---------------------------------------------------------------------------
// DELETE /api/generations/[id]
// ---------------------------------------------------------------------------

describe('DELETE /api/generations/[id]', () => {
	it('deletes an existing generation', async () => {
		const gen = createGeneration({ id: 7 });
		db.__setGenerations([gen]);

		const { DELETE } = await import('./[id]/+server');
		const event = createRequestEvent({ method: 'DELETE', params: { id: '7' } });
		const response = await DELETE(event as never);
		const data = await response.json();

		expect(data.success).toBe(true);
		expect(db.deleteGeneration).toHaveBeenCalledWith(7);
	});

	it('throws 404 for unknown generation', async () => {
		const { DELETE } = await import('./[id]/+server');
		const event = createRequestEvent({ method: 'DELETE', params: { id: '999' } });

		await expect(DELETE(event as never)).rejects.toMatchObject({
			status: 404,
			body: { message: 'Generation not found' }
		});
	});

	it('throws 400 for non-integer id', async () => {
		const { DELETE } = await import('./[id]/+server');
		const event = createRequestEvent({ method: 'DELETE', params: { id: 'xyz' } });

		await expect(DELETE(event as never)).rejects.toMatchObject({
			status: 400
		});
	});
});
