/**
 * Pre-configured mock helpers for common server-side dependencies.
 *
 * These helpers generate `vi.mock()` factory return values for:
 * - `$lib/db.server` — in-memory record store with CRUD behaviour
 * - `$lib/kie-api.server` — stub API functions that return configurable responses
 * - `$lib/sse.server` — no-op SSE notification stubs with call tracking
 * - `$lib/polling.server` — no-op polling stubs with call tracking
 *
 * Usage:
 * ```ts
 * import { createDbMock } from '$lib/test-utils/mocks';
 * vi.mock('$lib/db.server', () => createDbMock());
 * ```
 *
 * Each mock factory returns a plain object suitable for `vi.mock()`.
 * The objects also contain `__reset` / `__set*` helpers for test setup.
 */

import { vi, type Mock } from 'vitest';
import type { Project, Generation, StemSeparation, VariationAnnotation, Setting } from '$lib/types';

// Callable mock function type. `ReturnType<typeof vi.fn>` resolves to
// `Mock<Procedure | Constructable>` which TypeScript considers non-callable.
// This alias constrains to a plain function signature.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockFn = Mock<(...args: any[]) => any>;

// ============================================================================
// Database mock
// ============================================================================

/**
 * Extended type for the DB mock module. Use this to call `__reset()` and
 * other test-only helpers after importing the mocked module.
 *
 * @example
 * const db = (await import('$lib/db.server')) as DbMock;
 * db.__reset();
 */
export interface DbMock {
	// Settings
	getSetting: MockFn;
	setSetting: MockFn;
	deleteSetting: MockFn;
	getAllSettings: MockFn;
	getApiKey: MockFn;
	setApiKey: MockFn;

	// Projects
	createProject: MockFn;
	getProject: MockFn;
	getAllProjects: MockFn;
	getOpenProjects: MockFn;
	setProjectOpen: MockFn;
	updateProjectName: MockFn;
	deleteProject: MockFn;

	// Generations
	createGeneration: MockFn;
	createExtendGeneration: MockFn;
	getExtendedGenerations: MockFn;
	getGeneration: MockFn;
	getGenerationByTaskId: MockFn;
	getGenerationsByProject: MockFn;
	getLatestGenerationByProject: MockFn;
	updateGenerationTaskId: MockFn;
	updateGenerationStatus: MockFn;
	updateGenerationTracks: MockFn;
	completeGeneration: MockFn;
	deleteGeneration: MockFn;
	getPendingGenerations: MockFn;
	createImportedGeneration: MockFn;

	// Stem separations
	createStemSeparation: MockFn;
	getStemSeparation: MockFn;
	getStemSeparationByTaskId: MockFn;
	getStemSeparationsForSong: MockFn;
	getStemSeparationByType: MockFn;
	updateStemSeparationTaskId: MockFn;
	updateStemSeparationStatus: MockFn;
	completeStemSeparation: MockFn;
	getPendingStemSeparations: MockFn;

	// Annotations
	getLabelSuggestions: MockFn;
	getAnnotation: MockFn;
	getAnnotationsForGeneration: MockFn;
	getAnnotationsByProject: MockFn;
	getStarredAnnotationsByProject: MockFn;
	toggleStar: MockFn;
	updateComment: MockFn;
	setAnnotationLabels: MockFn;

	// Database core
	getDb: MockFn;
	prepareStmt: MockFn;

	// Test helpers
	__reset: () => void;
	__setSettings: (settings: Record<string, string>) => void;
	__setProjects: (projects: Project[]) => void;
	__setGenerations: (generations: Generation[]) => void;
	__setStemSeparations: (separations: StemSeparation[]) => void;
	__setAnnotations: (annotations: VariationAnnotation[]) => void;
}

/**
 * Create a mock for `$lib/db.server` with in-memory data stores.
 *
 * Settings operations have functional behaviour (get/set/delete work on
 * an in-memory map). Other entities use simple array stores with
 * find-by-id lookups.
 *
 * Use `__reset()` in `beforeEach` to clear all data, or use `__set*()`
 * helpers to pre-populate stores.
 */
export function createDbMock(): DbMock {
	let settings: Record<string, string> = {};
	let projects: Project[] = [];
	let generations: Generation[] = [];
	let stemSeparations: StemSeparation[] = [];
	let annotations: VariationAnnotation[] = [];

	const mock: DbMock = {
		// Settings — functional in-memory behaviour
		getSetting: vi.fn((key: string) => settings[key] ?? null),
		setSetting: vi.fn((key: string, value: string) => {
			settings[key] = value;
		}),
		deleteSetting: vi.fn((key: string) => {
			delete settings[key];
		}),
		getAllSettings: vi.fn((): Setting[] =>
			Object.entries(settings).map(([key, value]) => ({
				key,
				value,
				created_at: '2026-01-15T12:00:00.000Z',
				updated_at: '2026-01-15T12:00:00.000Z'
			}))
		),
		getApiKey: vi.fn(() => settings['kie_api_key'] ?? null),
		setApiKey: vi.fn((apiKey: string) => {
			settings['kie_api_key'] = apiKey;
		}),

		// Projects — array store with find-by-id
		createProject: vi.fn((name: string = 'New Project'): Project => {
			const id = projects.length + 1;
			const project: Project = {
				id,
				name,
				is_open: true,
				created_at: '2026-01-15T12:00:00.000Z',
				updated_at: '2026-01-15T12:00:00.000Z'
			};
			projects.push(project);
			return project;
		}),
		getProject: vi.fn((id: number) => projects.find((p) => p.id === id)),
		getAllProjects: vi.fn(() => [...projects]),
		getOpenProjects: vi.fn(() => projects.filter((p) => p.is_open)),
		setProjectOpen: vi.fn((id: number, isOpen: boolean) => {
			const p = projects.find((p) => p.id === id);
			if (p) p.is_open = isOpen;
		}),
		updateProjectName: vi.fn((id: number, name: string) => {
			const p = projects.find((p) => p.id === id);
			if (p) p.name = name;
		}),
		deleteProject: vi.fn((id: number) => {
			projects = projects.filter((p) => p.id !== id);
		}),

		// Generations — array store with find-by-id
		createGeneration: vi.fn(),
		createExtendGeneration: vi.fn(),
		getExtendedGenerations: vi.fn((generationId: number, audioId: string) =>
			generations.filter(
				(g) => g.extends_generation_id === generationId && g.extends_audio_id === audioId
			)
		),
		getGeneration: vi.fn((id: number) => generations.find((g) => g.id === id)),
		getGenerationByTaskId: vi.fn((taskId: string) => generations.find((g) => g.task_id === taskId)),
		getGenerationsByProject: vi.fn((projectId: number) =>
			generations.filter((g) => g.project_id === projectId)
		),
		getLatestGenerationByProject: vi.fn(
			(projectId: number) =>
				generations
					.filter((g) => g.project_id === projectId)
					.sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
		),
		updateGenerationTaskId: vi.fn((id: number, taskId: string) => {
			const g = generations.find((g) => g.id === id);
			if (g) {
				g.task_id = taskId;
				g.status = 'processing';
			}
		}),
		updateGenerationStatus: vi.fn((id: number, status: string, errorMessage?: string) => {
			const g = generations.find((g) => g.id === id);
			if (g) {
				g.status = status;
				g.error_message = errorMessage ?? null;
			}
		}),
		updateGenerationTracks: vi.fn(),
		completeGeneration: vi.fn(),
		deleteGeneration: vi.fn((id: number) => {
			generations = generations.filter((g) => g.id !== id);
		}),
		getPendingGenerations: vi.fn(() =>
			generations.filter((g) =>
				['pending', 'processing', 'text_success', 'first_success'].includes(g.status)
			)
		),
		createImportedGeneration: vi.fn(),

		// Stem separations — array store with find-by-id
		createStemSeparation: vi.fn(),
		getStemSeparation: vi.fn((id: number) => stemSeparations.find((s) => s.id === id)),
		getStemSeparationByTaskId: vi.fn((taskId: string) =>
			stemSeparations.find((s) => s.task_id === taskId)
		),
		getStemSeparationsForSong: vi.fn((generationId: number, audioId: string) =>
			stemSeparations.filter((s) => s.generation_id === generationId && s.audio_id === audioId)
		),
		getStemSeparationByType: vi.fn((generationId: number, audioId: string, type: string) =>
			stemSeparations.find(
				(s) => s.generation_id === generationId && s.audio_id === audioId && s.type === type
			)
		),
		updateStemSeparationTaskId: vi.fn((id: number, taskId: string) => {
			const s = stemSeparations.find((s) => s.id === id);
			if (s) {
				s.task_id = taskId;
				s.status = 'processing';
			}
		}),
		updateStemSeparationStatus: vi.fn((id: number, status: string, errorMessage?: string) => {
			const s = stemSeparations.find((s) => s.id === id);
			if (s) {
				s.status = status;
				s.error_message = errorMessage ?? null;
			}
		}),
		completeStemSeparation: vi.fn(),
		getPendingStemSeparations: vi.fn(() =>
			stemSeparations.filter((s) => ['pending', 'processing'].includes(s.status))
		),

		// Annotations — array store
		getLabelSuggestions: vi.fn((): string[] => []),
		getAnnotation: vi.fn((generationId: number, audioId: string) =>
			annotations.find((a) => a.generation_id === generationId && a.audio_id === audioId)
		),
		getAnnotationsForGeneration: vi.fn((generationId: number) =>
			annotations.filter((a) => a.generation_id === generationId)
		),
		getAnnotationsByProject: vi.fn((): VariationAnnotation[] => [...annotations]),
		getStarredAnnotationsByProject: vi.fn((): VariationAnnotation[] =>
			annotations.filter((a) => a.starred === 1 || (a.comment && a.comment !== ''))
		),
		toggleStar: vi.fn((generationId: number, audioId: string) => {
			const a = annotations.find((a) => a.generation_id === generationId && a.audio_id === audioId);
			if (a) a.starred = a.starred ? 0 : 1;
			return a;
		}),
		updateComment: vi.fn((generationId: number, audioId: string, comment: string) => {
			const a = annotations.find((a) => a.generation_id === generationId && a.audio_id === audioId);
			if (a) a.comment = comment || null;
			return a;
		}),
		setAnnotationLabels: vi.fn(),

		// Database core — stubs
		getDb: vi.fn(),
		prepareStmt: vi.fn(),

		// Test helpers
		__reset() {
			settings = {};
			projects = [];
			generations = [];
			stemSeparations = [];
			annotations = [];
			// Reset all vi.fn() call counts
			for (const [, value] of Object.entries(mock)) {
				if (typeof value === 'function' && 'mockClear' in value) {
					(value as MockFn).mockClear();
				}
			}
		},
		__setSettings(s: Record<string, string>) {
			settings = { ...s };
		},
		__setProjects(p: Project[]) {
			projects = [...p];
		},
		__setGenerations(g: Generation[]) {
			generations = [...g];
		},
		__setStemSeparations(s: StemSeparation[]) {
			stemSeparations = [...s];
		},
		__setAnnotations(a: VariationAnnotation[]) {
			annotations = [...a];
		}
	};

	return mock;
}

// ============================================================================
// KIE API mock
// ============================================================================

/**
 * Type for the KIE API mock module.
 */
export interface KieApiMock {
	generateMusic: MockFn;
	extendMusic: MockFn;
	getMusicDetails: MockFn;
	separateVocals: MockFn;
	getStemSeparationDetails: MockFn;
	isErrorStatus: MockFn;
	isCompleteStatus: MockFn;
	isInProgressStatus: MockFn;
	isStemSeparationErrorStatus: MockFn;
	isStemSeparationCompleteStatus: MockFn;
	__reset: () => void;
}

/**
 * Create a mock for `$lib/kie-api.server`.
 *
 * API call functions (`generateMusic`, `extendMusic`, etc.) default to
 * resolving with a `{ code: 200, msg: 'success', data: { taskId: '...' } }`
 * response. Use `mockResolvedValue` / `mockRejectedValue` to customize.
 *
 * Status check functions (`isErrorStatus`, etc.) implement the real logic
 * so status routing works correctly in tests.
 */
export function createKieApiMock(): KieApiMock {
	const mock: KieApiMock = {
		generateMusic: vi.fn().mockResolvedValue({
			code: 200,
			msg: 'success',
			data: { taskId: 'task-mock-001' }
		}),
		extendMusic: vi.fn().mockResolvedValue({
			code: 200,
			msg: 'success',
			data: { taskId: 'task-mock-002' }
		}),
		getMusicDetails: vi.fn().mockResolvedValue({
			code: 200,
			msg: 'success',
			data: {
				taskId: 'task-mock-001',
				parentMusicId: '',
				param: '',
				response: { taskId: 'task-mock-001', sunoData: [] },
				status: 'PENDING',
				type: 'generate',
				errorCode: null,
				errorMessage: null
			}
		}),
		separateVocals: vi.fn().mockResolvedValue({
			code: 200,
			msg: 'success',
			data: { taskId: 'stem-task-mock-001' }
		}),
		getStemSeparationDetails: vi.fn().mockResolvedValue({
			code: 200,
			msg: 'success',
			data: {
				taskId: 'stem-task-mock-001',
				musicId: 'music-1',
				callbackUrl: '',
				audioId: 'audio-1-1',
				completeTime: null,
				response: null,
				successFlag: 'PENDING',
				createTime: Date.now(),
				errorCode: null,
				errorMessage: null
			}
		}),

		// Real status-check logic so routing works correctly
		isErrorStatus: vi.fn((status: string) =>
			[
				'CREATE_TASK_FAILED',
				'GENERATE_AUDIO_FAILED',
				'CALLBACK_EXCEPTION',
				'SENSITIVE_WORD_ERROR'
			].includes(status)
		),
		isCompleteStatus: vi.fn((status: string) => status === 'SUCCESS'),
		isInProgressStatus: vi.fn((status: string) =>
			['PENDING', 'TEXT_SUCCESS', 'FIRST_SUCCESS'].includes(status)
		),
		isStemSeparationErrorStatus: vi.fn((status: string) =>
			['CREATE_TASK_FAILED', 'GENERATE_AUDIO_FAILED', 'CALLBACK_EXCEPTION'].includes(status)
		),
		isStemSeparationCompleteStatus: vi.fn((status: string) => status === 'SUCCESS'),

		__reset() {
			for (const [, value] of Object.entries(mock)) {
				if (typeof value === 'function' && 'mockClear' in value) {
					(value as MockFn).mockClear();
				}
			}
		}
	};

	return mock;
}

// ============================================================================
// SSE mock
// ============================================================================

/**
 * Type for the SSE mock module.
 */
export interface SseMock {
	addClient: MockFn;
	removeClient: MockFn;
	notifyClients: MockFn;
	notifyStemSeparationClients: MockFn;
	notifyAnnotationClients: MockFn;
	__reset: () => void;
}

/**
 * Create a mock for `$lib/sse.server`.
 *
 * All functions are no-op stubs. Use `.toHaveBeenCalledWith()` to assert
 * that the correct SSE events were dispatched.
 */
export function createSseMock(): SseMock {
	const mock: SseMock = {
		addClient: vi.fn(),
		removeClient: vi.fn(),
		notifyClients: vi.fn(),
		notifyStemSeparationClients: vi.fn(),
		notifyAnnotationClients: vi.fn(),
		__reset() {
			for (const [, value] of Object.entries(mock)) {
				if (typeof value === 'function' && 'mockClear' in value) {
					(value as MockFn).mockClear();
				}
			}
		}
	};

	return mock;
}

// ============================================================================
// Polling mock
// ============================================================================

/**
 * Type for the polling mock module.
 */
export interface PollingMock {
	pollForResults: MockFn;
	pollForStemSeparationResults: MockFn;
	recoverIncompleteGenerations: MockFn;
	recoverIncompleteStemSeparations: MockFn;
	__reset: () => void;
}

/**
 * Create a mock for `$lib/polling.server`.
 *
 * All functions are no-op stubs. Use `.toHaveBeenCalledWith()` to verify
 * that polling was initiated with the correct parameters.
 */
export function createPollingMock(): PollingMock {
	const mock: PollingMock = {
		pollForResults: vi.fn(),
		pollForStemSeparationResults: vi.fn(),
		recoverIncompleteGenerations: vi.fn(),
		recoverIncompleteStemSeparations: vi.fn(),
		__reset() {
			for (const [, value] of Object.entries(mock)) {
				if (typeof value === 'function' && 'mockClear' in value) {
					(value as MockFn).mockClear();
				}
			}
		}
	};

	return mock;
}
