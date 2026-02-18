import { vi } from 'vitest';
import type { Project, Generation, StemSeparation, VariationAnnotation, Setting } from '$lib/types';
import type { MockFn } from './types';

export interface DbMock {
	getSetting: MockFn;
	setSetting: MockFn;
	deleteSetting: MockFn;
	getAllSettings: MockFn;
	getApiKey: MockFn;
	setApiKey: MockFn;
	createProject: MockFn;
	getProject: MockFn;
	getAllProjects: MockFn;
	getOpenProjects: MockFn;
	setProjectOpen: MockFn;
	updateProjectName: MockFn;
	deleteProject: MockFn;
	createGeneration: MockFn;
	createExtendGeneration: MockFn;
	getExtendedGenerations: MockFn;
	getGeneration: MockFn;
	getGenerationByTaskId: MockFn;
	getGenerationsByProject: MockFn;
	getLatestGenerationByProject: MockFn;
	setGenerationTaskStarted: MockFn;
	setGenerationStatus: MockFn;
	setGenerationErrored: MockFn;
	setGenerationCompleted: MockFn;
	updateGenerationTaskId: MockFn;
	updateGenerationStatus: MockFn;
	updateGenerationTracks: MockFn;
	completeGeneration: MockFn;
	deleteGeneration: MockFn;
	getPendingGenerations: MockFn;
	createImportedGeneration: MockFn;
	createStemSeparation: MockFn;
	getStemSeparation: MockFn;
	getStemSeparationByTaskId: MockFn;
	getStemSeparationsForSong: MockFn;
	getStemSeparationByType: MockFn;
	setStemSeparationTaskStarted: MockFn;
	setStemSeparationStatus: MockFn;
	setStemSeparationErrored: MockFn;
	setStemSeparationCompleted: MockFn;
	updateStemSeparationTaskId: MockFn;
	updateStemSeparationStatus: MockFn;
	completeStemSeparation: MockFn;
	getPendingStemSeparations: MockFn;
	getLabelSuggestions: MockFn;
	getAnnotation: MockFn;
	getAnnotationsForGeneration: MockFn;
	getAnnotationsByProject: MockFn;
	getStarredAnnotationsByProject: MockFn;
	toggleStar: MockFn;
	updateComment: MockFn;
	setAnnotationLabels: MockFn;
	getDb: MockFn;
	prepareStmt: MockFn;
	__reset: () => void;
	__setSettings: (settings: Record<string, string>) => void;
	__setProjects: (projects: Project[]) => void;
	__setGenerations: (generations: Generation[]) => void;
	__setStemSeparations: (separations: StemSeparation[]) => void;
	__setAnnotations: (annotations: VariationAnnotation[]) => void;
}

function clearAllMockCalls(mockObject: Record<string, unknown>): void {
	for (const value of Object.values(mockObject)) {
		if (typeof value === 'function' && 'mockClear' in value) {
			(value as MockFn).mockClear();
		}
	}
}

export function createDbMock(): DbMock {
	let settings: Record<string, string> = {};
	let projects: Project[] = [];
	let generations: Generation[] = [];
	let stemSeparations: StemSeparation[] = [];
	let annotations: VariationAnnotation[] = [];

	const mock: DbMock = {
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
		getProject: vi.fn((id: number) => projects.find((project) => project.id === id)),
		getAllProjects: vi.fn(() => [...projects]),
		getOpenProjects: vi.fn(() => projects.filter((project) => project.is_open)),
		setProjectOpen: vi.fn((id: number, isOpen: boolean) => {
			const project = projects.find((item) => item.id === id);
			if (project) {
				project.is_open = isOpen;
			}
		}),
		updateProjectName: vi.fn((id: number, name: string) => {
			const project = projects.find((item) => item.id === id);
			if (project) {
				project.name = name;
			}
		}),
		deleteProject: vi.fn((id: number) => {
			projects = projects.filter((project) => project.id !== id);
		}),

		createGeneration: vi.fn(),
		createExtendGeneration: vi.fn(),
		getExtendedGenerations: vi.fn((generationId: number, audioId: string) =>
			generations.filter(
				(generation) =>
					generation.extends_generation_id === generationId &&
					generation.extends_audio_id === audioId
			)
		),
		getGeneration: vi.fn((id: number) => generations.find((generation) => generation.id === id)),
		getGenerationByTaskId: vi.fn((taskId: string) =>
			generations.find((generation) => generation.task_id === taskId)
		),
		getGenerationsByProject: vi.fn((projectId: number) =>
			generations.filter((generation) => generation.project_id === projectId)
		),
		getLatestGenerationByProject: vi.fn(
			(projectId: number) =>
				generations
					.filter((generation) => generation.project_id === projectId)
					.sort((first, second) => second.created_at.localeCompare(first.created_at))[0]
		),
		setGenerationTaskStarted: vi.fn((id: number, taskId: string) => {
			const generation = generations.find((item) => item.id === id);
			if (generation) {
				generation.task_id = taskId;
				generation.status = 'processing';
			}
		}),
		setGenerationStatus: vi.fn((id: number, status: string) => {
			const generation = generations.find((item) => item.id === id);
			if (generation) {
				generation.status = status;
				generation.error_message = null;
			}
		}),
		setGenerationErrored: vi.fn((id: number, errorMessage: string) => {
			const generation = generations.find((item) => item.id === id);
			if (generation) {
				generation.status = 'error';
				generation.error_message = errorMessage;
			}
		}),
		setGenerationCompleted: vi.fn(),
		updateGenerationTaskId: vi.fn((id: number, taskId: string) => {
			mock.setGenerationTaskStarted(id, taskId);
		}),
		updateGenerationStatus: vi.fn((id: number, status: string, errorMessage?: string) => {
			if (status === 'error') {
				mock.setGenerationErrored(id, errorMessage ?? 'Unknown generation error');
				return;
			}
			mock.setGenerationStatus(id, status);
		}),
		updateGenerationTracks: vi.fn(),
		completeGeneration: vi.fn(
			(id: number, _status: string, track1: unknown, track2: unknown, responseData: string) => {
				mock.setGenerationCompleted(id, track1, track2, responseData);
			}
		),
		deleteGeneration: vi.fn((id: number) => {
			generations = generations.filter((generation) => generation.id !== id);
		}),
		getPendingGenerations: vi.fn(() =>
			generations.filter((generation) =>
				['pending', 'processing', 'text_success', 'first_success'].includes(generation.status)
			)
		),
		createImportedGeneration: vi.fn(),

		createStemSeparation: vi.fn(),
		getStemSeparation: vi.fn((id: number) =>
			stemSeparations.find((separation) => separation.id === id)
		),
		getStemSeparationByTaskId: vi.fn((taskId: string) =>
			stemSeparations.find((separation) => separation.task_id === taskId)
		),
		getStemSeparationsForSong: vi.fn((generationId: number, audioId: string) =>
			stemSeparations.filter(
				(separation) => separation.generation_id === generationId && separation.audio_id === audioId
			)
		),
		getStemSeparationByType: vi.fn((generationId: number, audioId: string, type: string) =>
			stemSeparations.find(
				(separation) =>
					separation.generation_id === generationId &&
					separation.audio_id === audioId &&
					separation.type === type
			)
		),
		setStemSeparationTaskStarted: vi.fn((id: number, taskId: string) => {
			const separation = stemSeparations.find((item) => item.id === id);
			if (separation) {
				separation.task_id = taskId;
				separation.status = 'processing';
			}
		}),
		setStemSeparationStatus: vi.fn((id: number, status: string) => {
			const separation = stemSeparations.find((item) => item.id === id);
			if (separation) {
				separation.status = status;
				separation.error_message = null;
			}
		}),
		setStemSeparationErrored: vi.fn((id: number, errorMessage: string) => {
			const separation = stemSeparations.find((item) => item.id === id);
			if (separation) {
				separation.status = 'error';
				separation.error_message = errorMessage;
			}
		}),
		setStemSeparationCompleted: vi.fn(),
		updateStemSeparationTaskId: vi.fn((id: number, taskId: string) => {
			mock.setStemSeparationTaskStarted(id, taskId);
		}),
		updateStemSeparationStatus: vi.fn((id: number, status: string, errorMessage?: string) => {
			if (status === 'error') {
				mock.setStemSeparationErrored(id, errorMessage ?? 'Unknown stem separation error');
				return;
			}
			mock.setStemSeparationStatus(id, status);
		}),
		completeStemSeparation: vi.fn((id: number, data: unknown, responseData: string) => {
			mock.setStemSeparationCompleted(id, data, responseData);
		}),
		getPendingStemSeparations: vi.fn(() =>
			stemSeparations.filter((separation) => ['pending', 'processing'].includes(separation.status))
		),

		getLabelSuggestions: vi.fn((): string[] => []),
		getAnnotation: vi.fn((generationId: number, audioId: string) =>
			annotations.find(
				(annotation) => annotation.generation_id === generationId && annotation.audio_id === audioId
			)
		),
		getAnnotationsForGeneration: vi.fn((generationId: number) =>
			annotations.filter((annotation) => annotation.generation_id === generationId)
		),
		getAnnotationsByProject: vi.fn((): VariationAnnotation[] => [...annotations]),
		getStarredAnnotationsByProject: vi.fn((): VariationAnnotation[] =>
			annotations.filter(
				(annotation) =>
					annotation.starred === 1 || (annotation.comment && annotation.comment !== '')
			)
		),
		toggleStar: vi.fn((generationId: number, audioId: string) => {
			const annotation = annotations.find(
				(item) => item.generation_id === generationId && item.audio_id === audioId
			);
			if (annotation) {
				annotation.starred = annotation.starred ? 0 : 1;
			}
			return annotation;
		}),
		updateComment: vi.fn((generationId: number, audioId: string, comment: string) => {
			const annotation = annotations.find(
				(item) => item.generation_id === generationId && item.audio_id === audioId
			);
			if (annotation) {
				annotation.comment = comment || null;
			}
			return annotation;
		}),
		setAnnotationLabels: vi.fn(),

		getDb: vi.fn(),
		prepareStmt: vi.fn(),

		__reset() {
			settings = {};
			projects = [];
			generations = [];
			stemSeparations = [];
			annotations = [];
			clearAllMockCalls(mock as unknown as Record<string, unknown>);
		},
		__setSettings(nextSettings: Record<string, string>) {
			settings = { ...nextSettings };
		},
		__setProjects(nextProjects: Project[]) {
			projects = [...nextProjects];
		},
		__setGenerations(nextGenerations: Generation[]) {
			generations = [...nextGenerations];
		},
		__setStemSeparations(nextSeparations: StemSeparation[]) {
			stemSeparations = [...nextSeparations];
		},
		__setAnnotations(nextAnnotations: VariationAnnotation[]) {
			annotations = [...nextAnnotations];
		}
	};

	return mock;
}
