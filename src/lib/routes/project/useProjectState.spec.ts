import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGeneration, createProject } from '$lib/test-utils/fixtures/entities';
import type { Generation, Project, VariationAnnotation } from '$lib/types';

const { mockedGoto, mockedUpdateTrackUrls, mockedShowCompletionNotification } = vi.hoisted(() => ({
	mockedGoto: vi.fn(),
	mockedUpdateTrackUrls: vi.fn(),
	mockedShowCompletionNotification: vi.fn()
}));

vi.mock('$app/navigation', () => ({
	goto: mockedGoto
}));

vi.mock('$app/paths', () => ({
	resolve: (route: string, params?: Record<string, string>) => {
		if (!params) return route;
		return Object.entries(params).reduce(
			(acc, [key, value]) => acc.replace(`[${key}]`, value),
			route
		);
	}
}));

vi.mock('$app/state', () => ({
	page: {
		url: new URL('http://localhost/projects/1/generations/10')
	}
}));

vi.mock('$lib/stores/audio.svelte', () => ({
	audioStore: {
		updateTrackUrls: mockedUpdateTrackUrls
	}
}));

vi.mock('./notifications', () => ({
	showCompletionNotification: mockedShowCompletionNotification
}));

import { useProjectState } from './useProjectState.svelte';

type ProjectWithGenerations = Project & { generations: Generation[] };

function createLayoutData(overrides?: {
	projects?: ProjectWithGenerations[];
	activeProject?: ProjectWithGenerations;
	annotations?: VariationAnnotation[];
}) {
	const baseGeneration = createGeneration({
		id: 10,
		project_id: 1,
		status: 'processing',
		track1_audio_id: 'audio-10-1'
	});

	const project: ProjectWithGenerations = {
		...createProject({ id: 1, name: 'Project 1' }),
		generations: [baseGeneration]
	};

	return {
		projects: overrides?.projects ?? [project],
		activeProject: overrides?.activeProject ?? project,
		annotations: overrides?.annotations ?? []
	};
}

describe('useProjectState', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		mockedGoto.mockResolvedValue(undefined);
	});

	it('updates annotation map from SSE annotation_update messages', async () => {
		const data = createLayoutData();
		const state = useProjectState(() => data);
		await Promise.resolve();

		state.handleSseMessage({
			type: 'annotation_update',
			generationId: 10,
			audioId: 'audio-10-1',
			data: {
				id: 42,
				generation_id: 10,
				audio_id: 'audio-10-1',
				starred: 1,
				comment: 'Great take',
				labels: ['favorite'],
				created_at: '2026-01-01T00:00:00.000Z',
				updated_at: '2026-01-01T00:00:00.000Z'
			}
		});

		const annotation = state.annotationsMap.get('10:audio-10-1');
		expect(annotation?.starred).toBe(1);
		expect(annotation?.comment).toBe('Great take');
	});

	it('applies generation status updates and notifies on success', async () => {
		const activeProject = {
			...createProject({ id: 1, name: 'Project 1' }),
			generations: []
		};
		const data = createLayoutData({ projects: [], activeProject });
		const hydratedGeneration = createGeneration({
			id: 10,
			project_id: 1,
			status: 'processing',
			track1_audio_id: 'audio-10-1'
		});
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce({ ok: true, json: async () => createProject({ id: 1 }) } as Response)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ generations: [hydratedGeneration] })
			} as Response);
		vi.stubGlobal('fetch', fetchMock);

		const state = useProjectState(() => data);
		await state.createNewProject();

		state.handleSseMessage({
			type: 'generation_update',
			generationId: 10,
			data: { status: 'processing' }
		});
		await Promise.resolve();
		await Promise.resolve();

		state.handleSseMessage({
			type: 'generation_complete',
			generationId: 10,
			data: {
				status: 'success',
				track1_audio_url: 'https://example.com/final-track1.mp3',
				track1_stream_url: 'https://example.com/stream-track1.mp3',
				track1_duration: 120
			}
		});

		expect(state.projects[0].generations[0].status).toBe('success');
		expect(mockedShowCompletionNotification).toHaveBeenCalledTimes(1);
		expect(mockedUpdateTrackUrls).toHaveBeenCalledWith('audio-10-1', {
			streamUrl: 'https://example.com/stream-track1.mp3',
			audioUrl: 'https://example.com/final-track1.mp3',
			duration: 120
		});
	});

	it('refetches project generations when SSE references an unknown generation', async () => {
		const activeProject = {
			...createProject({ id: 1, name: 'Project 1' }),
			generations: []
		};
		const data = createLayoutData({ projects: [], activeProject });
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce({ ok: true, json: async () => createProject({ id: 1 }) } as Response)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ generations: [createGeneration({ id: 999, project_id: 1 })] })
			} as Response);
		vi.stubGlobal('fetch', fetchMock);

		const state = useProjectState(() => data);
		await state.createNewProject();

		state.handleSseMessage({
			type: 'generation_update',
			generationId: 999,
			data: { status: 'processing' }
		});

		await Promise.resolve();
		await Promise.resolve();

		expect(fetchMock).toHaveBeenCalledWith('/api/projects/1');
		expect(state.projects[0].generations[0].id).toBe(999);
	});

	it('reports in-progress generation status per project', async () => {
		const activeProject = {
			...createProject({ id: 1, name: 'Project 1' }),
			generations: []
		};
		const data = createLayoutData({ projects: [], activeProject });
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce({ ok: true, json: async () => createProject({ id: 1 }) } as Response)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					generations: [
						createGeneration({ id: 1, project_id: 1, status: 'pending' }),
						createGeneration({ id: 2, project_id: 1, status: 'success' })
					]
				})
			} as Response);
		vi.stubGlobal('fetch', fetchMock);

		const state = useProjectState(() => data);
		await state.createNewProject();

		state.handleSseMessage({
			type: 'generation_update',
			generationId: 1,
			data: { status: 'pending' }
		});
		await Promise.resolve();
		await Promise.resolve();

		expect(state.hasAnyGenerationInProgress(1)).toBe(true);
		expect(state.hasAnyGenerationInProgress(999)).toBe(false);
	});
});
