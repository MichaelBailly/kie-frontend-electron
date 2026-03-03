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

describe('POST /api/generations/add-instrumental', () => {
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
			generation_type: 'add_instrumental',
			extends_generation_id: 5,
			extends_audio_id: 'audio-5-1',
			extends_stem_type: 'vocal',
			extends_stem_url: 'https://example.com/stems/vocal.mp3',
			instrumental: 1,
			lyrics: ''
		});
		db.createAddInstrumentalGeneration.mockReturnValue(created);
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
				stemType: 'vocal',
				stemUrl: 'https://example.com/stems/vocal.mp3',
				title: 'Title',
				tags: 'ambient',
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
				stemType: 'vocal',
				stemUrl: 'https://example.com/stems/vocal.mp3',
				title: 'Vocal Instrumental',
				tags: 'ambient, cinematic',
				negativeTags: 'heavy metal'
			}
		});

		const response = await POST(event as never);
		const body = await response.json();

		expect(body.id).toBe(created.id);
		expect(db.createAddInstrumentalGeneration).toHaveBeenCalledWith(
			1,
			'Vocal Instrumental',
			'ambient, cinematic',
			'heavy metal',
			5,
			'audio-5-1',
			'vocal',
			'https://example.com/stems/vocal.mp3'
		);

		await flushPromises();

		expect(kieApi.addInstrumental).toHaveBeenCalledWith({
			uploadUrl: 'https://example.com/stems/vocal.mp3',
			title: 'Vocal Instrumental',
			tags: 'ambient, cinematic',
			negativeTags: 'heavy metal',
			model: 'V4_5PLUS',
			callBackUrl: KIE_CALLBACK_URL
		});
		expect(db.setGenerationTaskStarted).toHaveBeenCalledWith(created.id, 'task-mock-004');
		expect(polling.pollForResults).toHaveBeenCalledWith(created.id, 'task-mock-004');
	});

	it('sends fallback negativeTags to KIE when input is empty', async () => {
		const { created } = seedScenario();
		const { POST } = await import('./+server');

		const event = createRequestEvent({
			body: {
				projectId: 1,
				sourceGenerationId: 5,
				sourceAudioId: 'audio-5-1',
				stemType: 'vocal',
				stemUrl: 'https://example.com/stems/vocal.mp3',
				title: 'No Negative Tags',
				tags: 'ambient',
				negativeTags: ''
			}
		});

		await POST(event as never);
		await flushPromises();

		expect(db.createAddInstrumentalGeneration).toHaveBeenCalledWith(
			1,
			'No Negative Tags',
			'ambient',
			'',
			5,
			'audio-5-1',
			'vocal',
			'https://example.com/stems/vocal.mp3'
		);
		expect(kieApi.addInstrumental).toHaveBeenCalledWith(
			expect.objectContaining({ negativeTags: 'none' })
		);
		expect(db.setGenerationTaskStarted).toHaveBeenCalledWith(created.id, 'task-mock-004');
		expect(polling.pollForResults).toHaveBeenCalledWith(created.id, 'task-mock-004');
	});

	it('marks generation errored when KIE returns non-200', async () => {
		const { created } = seedScenario();
		kieApi.addInstrumental.mockResolvedValue({
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
				stemType: 'vocal',
				stemUrl: 'https://example.com/stems/vocal.mp3',
				title: 'Vocal Instrumental',
				tags: 'ambient',
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
