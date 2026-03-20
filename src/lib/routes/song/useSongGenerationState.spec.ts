import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGeneration } from '$lib/test-utils/fixtures/entities';
import type { VariationAnnotation } from '$lib/types';

const { mockedGoto } = vi.hoisted(() => ({
	mockedGoto: vi.fn()
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

import { useSongGenerationState } from './useSongGenerationState.svelte';

function createStateData(annotation: VariationAnnotation | null = null) {
	const generation = createGeneration({
		id: 10,
		project_id: 7,
		title: 'Main Song',
		track1_audio_id: 'audio-1',
		track1_audio_url: 'https://example.com/audio-1.mp3'
	});

	return {
		generation,
		song: {
			id: 'audio-1',
			streamUrl: generation.track1_stream_url,
			audioUrl: generation.track1_audio_url,
			imageUrl: generation.track1_image_url,
			duration: generation.track1_duration,
			title: `${generation.title} - Track 1`
		},
		annotation
	};
}

describe('useSongGenerationState', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		mockedGoto.mockResolvedValue(undefined);
	});

	it('handles extend flow and navigates to the new generation', async () => {
		const data = createStateData();
		const fetchMock = vi
			.fn()
			.mockResolvedValue({ ok: true, json: async () => ({ id: 101 }) } as Response);
		vi.stubGlobal('fetch', fetchMock);

		const state = useSongGenerationState({
			getData: () => data,
			activeProjectContext: undefined,
			annotationsContext: undefined
		});

		state.openStemExtendForm('vocal', 'https://example.com/stem-vocal.mp3');

		await state.handleExtend({
			title: 'Extended Song',
			style: 'pop',
			lyrics: 'new lyrics',
			negativeTags: 'crowd noise',
			continueAt: 42,
			instrumental: false
		});

		expect(fetchMock).toHaveBeenCalledWith(
			'/api/generations/extend',
			expect.objectContaining({ method: 'POST' })
		);
		expect(mockedGoto).toHaveBeenCalledWith('/projects/7/generations/101');
		expect(state.showExtendForm).toBe(false);
		expect(state.extendingStemType).toBeNull();
		expect(state.extendingStemUrl).toBeNull();
	});

	it('handles add instrumental flow and clears stem state', async () => {
		const data = createStateData();
		const fetchMock = vi
			.fn()
			.mockResolvedValue({ ok: true, json: async () => ({ id: 202 }) } as Response);
		vi.stubGlobal('fetch', fetchMock);

		const state = useSongGenerationState({
			getData: () => data,
			activeProjectContext: undefined,
			annotationsContext: undefined
		});

		state.openAddInstrumentalForm('vocal', 'https://example.com/vocal.mp3');

		await state.handleAddInstrumental({
			title: 'Instrumental',
			tags: 'house',
			negativeTags: 'noise'
		});

		expect(fetchMock).toHaveBeenCalledWith(
			'/api/generations/add-instrumental',
			expect.objectContaining({ method: 'POST' })
		);
		expect(mockedGoto).toHaveBeenCalledWith('/projects/7/generations/202');
		expect(state.showAddInstrumentalForm).toBe(false);
		expect(state.addInstrumentalStemType).toBeNull();
		expect(state.addInstrumentalStemUrl).toBeNull();
	});

	it('handles add vocals flow and clears stem state', async () => {
		const data = createStateData();
		const fetchMock = vi
			.fn()
			.mockResolvedValue({ ok: true, json: async () => ({ id: 303 }) } as Response);
		vi.stubGlobal('fetch', fetchMock);

		const state = useSongGenerationState({
			getData: () => data,
			activeProjectContext: undefined,
			annotationsContext: undefined
		});

		state.openAddVocalsForm('instrumental', 'https://example.com/instrumental.mp3');

		await state.handleAddVocals({
			title: 'Vocals',
			prompt: 'male vocal',
			style: 'rock',
			negativeTags: 'mumble'
		});

		expect(fetchMock).toHaveBeenCalledWith(
			'/api/generations/add-vocals',
			expect.objectContaining({ method: 'POST' })
		);
		expect(mockedGoto).toHaveBeenCalledWith('/projects/7/generations/303');
		expect(state.showAddVocalsForm).toBe(false);
		expect(state.addVocalsStemType).toBeNull();
		expect(state.addVocalsStemUrl).toBeNull();
	});

	it('applies optimistic star toggle and rolls back on failure', async () => {
		const data = createStateData({
			id: 1,
			generation_id: 10,
			audio_id: 'audio-1',
			starred: 0,
			comment: null,
			labels: [],
			created_at: '2026-01-01T00:00:00.000Z',
			updated_at: '2026-01-01T00:00:00.000Z'
		});

		const fetchMock = vi.fn().mockRejectedValue(new Error('network failure'));
		vi.stubGlobal('fetch', fetchMock);

		const state = useSongGenerationState({
			getData: () => data,
			activeProjectContext: undefined,
			annotationsContext: undefined
		});

		expect(state.starred).toBe(false);

		const togglePromise = state.handleToggleStar();
		expect(state.starAnimClass).toBe('star-burst');

		await togglePromise;

		expect(fetchMock).toHaveBeenCalledWith(
			'/api/generations/10/annotations',
			expect.objectContaining({ method: 'PATCH' })
		);
		expect(state.starred).toBe(false);
	});
});
