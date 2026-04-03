import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	createDbMock,
	createKieApiMock,
	createPollingMock,
	createProject,
	createSseMock,
	createRequestEvent,
	createCompletedGeneration,
	createGeneration,
	flushPromises,
	resetFixtureIds,
	type DbMock,
	type KieApiMock,
	type PollingMock,
	type SseMock
} from '$lib/test-utils';
import { KIE_CALLBACK_URL } from '$lib/constants.server';

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

describe('POST /api/generations/add-vocals', () => {
	it('rejects negative tags longer than 200 characters', async () => {
		const { POST } = await import('./+server');
		const event = createRequestEvent({
			body: {
				projectId: 1,
				sourceGenerationId: 5,
				sourceAudioId: 'audio-5-1',
				stemType: 'instrumental',
				stemUrl: 'https://example.com/stems/instrumental.mp3',
				title: 'Too Long',
				prompt: '[Verse] Hello',
				style: 'synth pop',
				negativeTags: 'x'.repeat(201)
			}
		});

		await expect(POST(event as never)).rejects.toMatchObject({
			status: 400,
			body: { message: 'Invalid negativeTags: must be at most 200 characters' }
		});
	});

	function seedScenario() {
		const project = createProject({ id: 1 });
		const sourceGeneration = createCompletedGeneration({
			id: 5,
			project_id: 1,
			track1_audio_id: 'audio-5-1'
		});
		db.__setProjects([project]);
		db.__setGenerations([sourceGeneration]);
		const created = createGeneration({
			id: 20,
			project_id: 1,
			generation_type: 'add_vocals',
			extends_generation_id: 5,
			extends_audio_id: 'audio-5-1',
			extends_stem_type: 'instrumental',
			extends_stem_url: 'https://example.com/stems/instrumental.mp3',
			instrumental: 0,
			lyrics: '[Verse] Lights down low',
			style: 'synth pop'
		});
		db.createAddVocalsGeneration.mockReturnValue(created);
		return { created };
	}

	it('validates required fields', async () => {
		const { POST } = await import('./+server');
		const event = createRequestEvent({
			body: {
				projectId: 1,
				sourceGenerationId: 5
			}
		});

		await expect(POST(event as never)).rejects.toMatchObject({
			status: 400,
			body: { message: expect.stringContaining('sourceAudioId') }
		});
	});

	it('returns 404 when project does not exist', async () => {
		const { POST } = await import('./+server');
		const event = createRequestEvent({
			body: {
				projectId: 999,
				sourceGenerationId: 5,
				sourceAudioId: 'audio-5-1',
				stemType: 'instrumental',
				stemUrl: 'https://example.com/stems/instrumental.mp3',
				title: 'Title',
				prompt: '[Verse] Hello',
				style: 'synth pop',
				negativeTags: ''
			}
		});

		await expect(POST(event as never)).rejects.toMatchObject({
			status: 404,
			body: { message: 'Project not found' }
		});
	});

	it('creates generation and starts async task', async () => {
		const { created } = seedScenario();
		const { POST } = await import('./+server');

		const event = createRequestEvent({
			body: {
				projectId: 1,
				sourceGenerationId: 5,
				sourceAudioId: 'audio-5-1',
				stemType: 'instrumental',
				stemUrl: 'https://example.com/stems/instrumental.mp3',
				title: 'Vocals Version',
				prompt: '[Verse] City in bloom',
				style: 'dream pop',
				negativeTags: 'screamo'
			}
		});

		const response = await POST(event as never);
		const body = await response.json();

		expect(body.id).toBe(created.id);
		expect(db.createAddVocalsGeneration).toHaveBeenCalledWith(
			1,
			'Vocals Version',
			'dream pop',
			'[Verse] City in bloom',
			'screamo',
			5,
			'audio-5-1',
			'instrumental',
			'https://example.com/stems/instrumental.mp3',
			'V5'
		);

		await flushPromises();

		expect(kieApi.addVocals).toHaveBeenCalledWith({
			uploadUrl: 'https://example.com/stems/instrumental.mp3',
			title: 'Vocals Version',
			prompt: '[Verse] City in bloom',
			style: 'dream pop',
			negativeTags: 'screamo',
			model: 'V5',
			callBackUrl: KIE_CALLBACK_URL
		});
		expect(db.setGenerationTaskStarted).toHaveBeenCalledWith(created.id, 'task-mock-005');
		expect(polling.pollForResults).toHaveBeenCalledWith(created.id, 'task-mock-005');
	});

	it('sends empty negativeTags to KIE when input is empty', async () => {
		seedScenario();
		const { POST } = await import('./+server');

		const event = createRequestEvent({
			body: {
				projectId: 1,
				sourceGenerationId: 5,
				sourceAudioId: 'audio-5-1',
				stemType: 'instrumental',
				stemUrl: 'https://example.com/stems/instrumental.mp3',
				title: 'No Negative Tags',
				prompt: '[Verse] No tags',
				style: 'ambient pop',
				negativeTags: ''
			}
		});

		await POST(event as never);
		await flushPromises();

		expect(kieApi.addVocals).toHaveBeenCalledWith(expect.objectContaining({ negativeTags: '' }));
	});

	it('marks generation errored when KIE returns non-200', async () => {
		const { created } = seedScenario();
		kieApi.addVocals.mockResolvedValue({
			code: 500,
			msg: 'API failure',
			data: { taskId: '' }
		});

		const { POST } = await import('./+server');
		const event = createRequestEvent({
			body: {
				projectId: 1,
				sourceGenerationId: 5,
				sourceAudioId: 'audio-5-1',
				stemType: 'instrumental',
				stemUrl: 'https://example.com/stems/instrumental.mp3',
				title: 'Vocals Version',
				prompt: '[Verse] fail',
				style: 'ambient',
				negativeTags: ''
			}
		});

		await POST(event as never);
		await flushPromises();

		expect(db.setGenerationErrored).toHaveBeenCalledWith(created.id, 'API failure');
		expect(sse.notifyClients).toHaveBeenCalledWith(
			created.id,
			'generation_error',
			expect.objectContaining({ status: 'error', error_message: 'API failure' })
		);
	});
});
