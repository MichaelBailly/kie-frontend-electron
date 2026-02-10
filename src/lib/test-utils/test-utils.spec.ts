/**
 * Tests for the test utilities themselves — ensures factories, mocks, and
 * helpers work correctly before they're used in downstream test suites.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
	// Fixture factories
	resetFixtureIds,
	createProject,
	createGeneration,
	createCompletedGeneration,
	createErrorGeneration,
	createExtendGeneration,
	createStemSeparation,
	createCompletedStemSeparation,
	createAnnotation,
	createStarredAnnotation,
	createLabel,
	createSetting,
	createGenerateMusicRequest,
	createExtendMusicRequest,
	createGenerateMusicResponse,
	createSunoTrack,
	createMusicDetailsResponse,
	createPendingMusicDetailsResponse,
	createErrorMusicDetailsResponse,
	createStemSeparationRequest,
	createStemSeparationResponse,
	createStemSeparationDetailsResponse,

	// Mock helpers
	createDbMock,
	createKieApiMock,
	createSseMock,
	createPollingMock,

	// Test helpers
	expectCalledOnceWith,
	expectNotCalled,
	expectCalledWithPartial,
	createJsonRequest,
	createRequestEvent,
	createDeferredPromise,
	flushPromises
} from '$lib/test-utils';

// ============================================================================
// Fixture factories
// ============================================================================

describe('Fixture factories', () => {
	beforeEach(() => {
		resetFixtureIds();
	});

	describe('createProject', () => {
		it('should create a project with defaults', () => {
			const project = createProject();

			expect(project.id).toBe(1);
			expect(project.name).toBe('Test Project 1');
			expect(project.is_open).toBe(true);
			expect(project.created_at).toBeTruthy();
			expect(project.updated_at).toBeTruthy();
		});

		it('should auto-increment IDs', () => {
			const p1 = createProject();
			const p2 = createProject();

			expect(p1.id).toBe(1);
			expect(p2.id).toBe(2);
		});

		it('should allow overrides', () => {
			const project = createProject({ name: 'Custom Name', is_open: false });

			expect(project.name).toBe('Custom Name');
			expect(project.is_open).toBe(false);
		});

		it('should use provided ID without auto-increment', () => {
			const project = createProject({ id: 42 });

			expect(project.id).toBe(42);
			expect(project.name).toBe('Test Project 42');
		});
	});

	describe('createGeneration', () => {
		it('should create a pending generation with defaults', () => {
			const gen = createGeneration();

			expect(gen.id).toBe(1);
			expect(gen.project_id).toBe(1);
			expect(gen.status).toBe('pending');
			expect(gen.task_id).toBeNull();
			expect(gen.track1_audio_url).toBeNull();
			expect(gen.extends_generation_id).toBeNull();
		});

		it('should allow overrides', () => {
			const gen = createGeneration({ project_id: 5, title: 'My Song', status: 'processing' });

			expect(gen.project_id).toBe(5);
			expect(gen.title).toBe('My Song');
			expect(gen.status).toBe('processing');
		});
	});

	describe('createCompletedGeneration', () => {
		it('should create a generation with success status and populated tracks', () => {
			const gen = createCompletedGeneration();

			expect(gen.status).toBe('success');
			expect(gen.task_id).toBeTruthy();
			expect(gen.track1_audio_url).toBeTruthy();
			expect(gen.track1_audio_id).toBeTruthy();
			expect(gen.track1_duration).toBeGreaterThan(0);
			expect(gen.track2_audio_url).toBeTruthy();
			expect(gen.track2_audio_id).toBeTruthy();
			expect(gen.response_data).toBeTruthy();
		});
	});

	describe('createErrorGeneration', () => {
		it('should create a generation with error status', () => {
			const gen = createErrorGeneration();

			expect(gen.status).toBe('error');
			expect(gen.error_message).toBeTruthy();
		});
	});

	describe('createExtendGeneration', () => {
		it('should create a generation that extends a parent', () => {
			const gen = createExtendGeneration();

			expect(gen.extends_generation_id).toBe(1);
			expect(gen.extends_audio_id).toBeTruthy();
			expect(gen.continue_at).toBeGreaterThan(0);
		});
	});

	describe('createStemSeparation', () => {
		it('should create a pending stem separation with defaults', () => {
			const stem = createStemSeparation();

			expect(stem.id).toBe(1);
			expect(stem.generation_id).toBe(1);
			expect(stem.audio_id).toBeTruthy();
			expect(stem.type).toBe('separate_vocal');
			expect(stem.status).toBe('pending');
			expect(stem.vocal_url).toBeNull();
		});

		it('should allow type override', () => {
			const stem = createStemSeparation({ type: 'split_stem' });

			expect(stem.type).toBe('split_stem');
		});
	});

	describe('createCompletedStemSeparation', () => {
		it('should have success status and populated URLs', () => {
			const stem = createCompletedStemSeparation();

			expect(stem.status).toBe('success');
			expect(stem.vocal_url).toBeTruthy();
			expect(stem.instrumental_url).toBeTruthy();
			expect(stem.task_id).toBeTruthy();
		});
	});

	describe('createAnnotation', () => {
		it('should create an unstarred annotation with no labels', () => {
			const ann = createAnnotation();

			expect(ann.id).toBe(1);
			expect(ann.starred).toBe(0);
			expect(ann.comment).toBeNull();
			expect(ann.labels).toEqual([]);
		});
	});

	describe('createStarredAnnotation', () => {
		it('should create a starred annotation with comment and labels', () => {
			const ann = createStarredAnnotation();

			expect(ann.starred).toBe(1);
			expect(ann.comment).toBeTruthy();
			expect(ann.labels.length).toBeGreaterThan(0);
		});
	});

	describe('createLabel', () => {
		it('should create a label with auto-incremented ID', () => {
			const l1 = createLabel();
			const l2 = createLabel();

			expect(l1.id).toBe(1);
			expect(l1.name).toBe('label-1');
			expect(l2.id).toBe(2);
			expect(l2.name).toBe('label-2');
		});

		it('should allow name override', () => {
			const label = createLabel({ name: 'favorite' });

			expect(label.name).toBe('favorite');
		});
	});

	describe('createSetting', () => {
		it('should create a setting with defaults', () => {
			const setting = createSetting();

			expect(setting.key).toBe('test_setting');
			expect(setting.value).toBe('test_value');
		});

		it('should allow key/value overrides', () => {
			const setting = createSetting({ key: 'kie_api_key', value: 'sk-12345' });

			expect(setting.key).toBe('kie_api_key');
			expect(setting.value).toBe('sk-12345');
		});
	});

	describe('resetFixtureIds', () => {
		it('should reset all counters back to 1', () => {
			createProject();
			createProject();
			createGeneration();

			resetFixtureIds();

			expect(createProject().id).toBe(1);
			expect(createGeneration().id).toBe(1);
			expect(createStemSeparation().id).toBe(1);
			expect(createAnnotation().id).toBe(1);
			expect(createLabel().id).toBe(1);
		});
	});
});

// ============================================================================
// KIE API request/response factories
// ============================================================================

describe('KIE API request/response factories', () => {
	it('createGenerateMusicRequest should produce a valid request', () => {
		const req = createGenerateMusicRequest();

		expect(req.prompt).toBeTruthy();
		expect(req.style).toBeTruthy();
		expect(req.title).toBeTruthy();
		expect(req.model).toBe('V4_5');
		expect(req.customMode).toBe(true);
	});

	it('createExtendMusicRequest should reference an audio and continue position', () => {
		const req = createExtendMusicRequest();

		expect(req.audioId).toBeTruthy();
		expect(req.continueAt).toBeGreaterThan(0);
	});

	it('createGenerateMusicResponse should return code 200', () => {
		const res = createGenerateMusicResponse();

		expect(res.code).toBe(200);
		expect(res.data.taskId).toBeTruthy();
	});

	it('createSunoTrack should produce a track with duration', () => {
		const track = createSunoTrack();

		expect(track.duration).toBeGreaterThan(0);
		expect(track.audioUrl).toBeTruthy();
	});

	it('createMusicDetailsResponse should have SUCCESS status with tracks', () => {
		const res = createMusicDetailsResponse();

		expect(res.code).toBe(200);
		expect(res.data.status).toBe('SUCCESS');
		expect(res.data.response.sunoData.length).toBe(2);
	});

	it('createPendingMusicDetailsResponse should have PENDING status', () => {
		const res = createPendingMusicDetailsResponse();

		expect(res.data.status).toBe('PENDING');
	});

	it('createErrorMusicDetailsResponse should have error status', () => {
		const res = createErrorMusicDetailsResponse();

		expect(res.data.status).toBe('CREATE_TASK_FAILED');
		expect(res.data.errorMessage).toBeTruthy();
	});

	it('createStemSeparationRequest should produce a valid request', () => {
		const req = createStemSeparationRequest();

		expect(req.taskId).toBeTruthy();
		expect(req.audioId).toBeTruthy();
		expect(req.type).toBe('separate_vocal');
	});

	it('createStemSeparationResponse should return code 200', () => {
		const res = createStemSeparationResponse();

		expect(res.code).toBe(200);
		expect(res.data.taskId).toBeTruthy();
	});

	it('createStemSeparationDetailsResponse should have SUCCESS status', () => {
		const res = createStemSeparationDetailsResponse();

		expect(res.code).toBe(200);
		expect(res.data.successFlag).toBe('SUCCESS');
		expect(res.data.response).not.toBeNull();
		expect(res.data.response!.vocalUrl).toBeTruthy();
	});
});

// ============================================================================
// Mock helpers
// ============================================================================

describe('Mock helpers', () => {
	describe('createDbMock', () => {
		it('should provide functional settings operations', () => {
			const db = createDbMock();

			expect(db.getSetting('foo')).toBeNull();

			db.setSetting('foo', 'bar');
			expect(db.getSetting('foo')).toBe('bar');

			db.deleteSetting('foo');
			expect(db.getSetting('foo')).toBeNull();
		});

		it('should provide API key helpers', () => {
			const db = createDbMock();

			expect(db.getApiKey()).toBeNull();

			db.setApiKey('sk-12345');
			expect(db.getApiKey()).toBe('sk-12345');
		});

		it('should track project operations', () => {
			const db = createDbMock();

			const project = db.createProject('Test');
			expect(project.id).toBe(1);
			expect(project.name).toBe('Test');

			expect(db.getProject(1)).toEqual(project);
			expect(db.getAllProjects()).toHaveLength(1);
		});

		it('should find generations by project ID', () => {
			const db = createDbMock();
			const gen = createGeneration({ project_id: 5 });
			db.__setGenerations([gen]);

			expect(db.getGenerationsByProject(5)).toHaveLength(1);
			expect(db.getGenerationsByProject(999)).toHaveLength(0);
		});

		it('should reset all data and spy counts', () => {
			const db = createDbMock();

			db.setSetting('foo', 'bar');
			db.createProject('Test');
			db.__setGenerations([createGeneration()]);

			db.__reset();

			expect(db.getSetting('foo')).toBeNull();
			expect(db.getAllProjects()).toHaveLength(0);
			expect(db.getGeneration(1)).toBeUndefined();
			expect(db.setSetting).not.toHaveBeenCalled(); // spy counts cleared
		});

		it('should support __set* helpers', () => {
			const db = createDbMock();

			db.__setSettings({ kie_api_key: 'sk-test' });
			expect(db.getApiKey()).toBe('sk-test');

			db.__setProjects([createProject({ id: 10 })]);
			expect(db.getProject(10)).toBeTruthy();

			db.__setAnnotations([createAnnotation({ generation_id: 3, audio_id: 'a-1' })]);
			expect(db.getAnnotation(3, 'a-1')).toBeTruthy();

			db.__setStemSeparations([createStemSeparation({ id: 7 })]);
			expect(db.getStemSeparation(7)).toBeTruthy();
		});
	});

	describe('createKieApiMock', () => {
		it('should return default success responses', async () => {
			const api = createKieApiMock();

			const genRes = await api.generateMusic({});
			expect(genRes.code).toBe(200);
			expect(genRes.data.taskId).toBeTruthy();

			const extRes = await api.extendMusic({});
			expect(extRes.code).toBe(200);

			const stemRes = await api.separateVocals({});
			expect(stemRes.code).toBe(200);
		});

		it('should implement real status-check logic', () => {
			const api = createKieApiMock();

			expect(api.isErrorStatus('CREATE_TASK_FAILED')).toBe(true);
			expect(api.isErrorStatus('PENDING')).toBe(false);
			expect(api.isCompleteStatus('SUCCESS')).toBe(true);
			expect(api.isCompleteStatus('PENDING')).toBe(false);
			expect(api.isInProgressStatus('TEXT_SUCCESS')).toBe(true);
		});

		it('should allow overriding responses', async () => {
			const api = createKieApiMock();
			api.generateMusic.mockResolvedValueOnce({ code: 500, msg: 'Internal error' });

			const res = await api.generateMusic({});
			expect(res.code).toBe(500);
		});

		it('should reset spy counts', async () => {
			const api = createKieApiMock();

			await api.generateMusic({});
			expect(api.generateMusic).toHaveBeenCalledTimes(1);

			api.__reset();
			expect(api.generateMusic).not.toHaveBeenCalled();
		});
	});

	describe('createSseMock', () => {
		it('should provide no-op SSE stubs', () => {
			const sse = createSseMock();

			// Should not throw
			sse.notifyClients(1, 'generation_update', {});
			sse.notifyStemSeparationClients(1, 1, 'a-1', 'stem_separation_update', {});
			sse.notifyAnnotationClients(1, 'a-1', {});

			expect(sse.notifyClients).toHaveBeenCalledTimes(1);
		});

		it('should reset spy counts', () => {
			const sse = createSseMock();

			sse.notifyClients(1, 'generation_update', {});
			sse.__reset();

			expect(sse.notifyClients).not.toHaveBeenCalled();
		});
	});

	describe('createPollingMock', () => {
		it('should provide no-op polling stubs', () => {
			const polling = createPollingMock();

			polling.pollForResults(1, 'task-1');
			polling.pollForStemSeparationResults(1, 'task-1', 1, 'a-1');

			expect(polling.pollForResults).toHaveBeenCalledWith(1, 'task-1');
			expect(polling.pollForStemSeparationResults).toHaveBeenCalledWith(1, 'task-1', 1, 'a-1');
		});
	});
});

// ============================================================================
// Test helpers
// ============================================================================

describe('Test helpers', () => {
	describe('expectCalledOnceWith', () => {
		it('should pass when called exactly once with matching args', () => {
			const fn = vi.fn();
			fn('hello', 42);

			expectCalledOnceWith(fn, 'hello', 42);
		});
	});

	describe('expectNotCalled', () => {
		it('should pass when function was never called', () => {
			const fn = vi.fn();

			expectNotCalled(fn);
		});
	});

	describe('expectCalledWithPartial', () => {
		it('should match partial object arguments', () => {
			const fn = vi.fn();
			fn({ status: 'error', error_message: 'fail', id: 1 });

			expectCalledWithPartial(fn, { status: 'error' });
		});
	});

	describe('createJsonRequest', () => {
		it('should create a POST Request with JSON body', async () => {
			const req = createJsonRequest({ title: 'Test' });

			expect(req.method).toBe('POST');
			expect(req.headers.get('content-type')).toBe('application/json');

			const body = await req.json();
			expect(body.title).toBe('Test');
		});

		it('should support custom method', async () => {
			const req = createJsonRequest({ key: 'value' }, 'PUT');

			expect(req.method).toBe('PUT');
		});
	});

	describe('createRequestEvent', () => {
		it('should create a request event with body and params', async () => {
			const event = createRequestEvent({
				body: { projectId: 1 },
				params: { id: '5' }
			});

			expect(event.params.id).toBe('5');
			const body = await event.request.json();
			expect(body.projectId).toBe(1);
		});

		it('should create a GET event without body', () => {
			const event = createRequestEvent({ method: 'GET', params: { id: '1' } });

			expect(event.request.method).toBe('GET');
			expect(event.params.id).toBe('1');
		});
	});

	describe('createDeferredPromise', () => {
		it('should resolve when resolve is called', async () => {
			const { promise, resolve } = createDeferredPromise<string>();

			resolve('done');
			const result = await promise;

			expect(result).toBe('done');
		});

		it('should reject when reject is called', async () => {
			const { promise, reject } = createDeferredPromise<string>();

			reject(new Error('fail'));

			await expect(promise).rejects.toThrow('fail');
		});
	});

	describe('flushPromises', () => {
		it('should flush pending microtasks', async () => {
			let resolved = false;
			Promise.resolve().then(() => {
				resolved = true;
			});

			await flushPromises();

			expect(resolved).toBe(true);
		});
	});
});
