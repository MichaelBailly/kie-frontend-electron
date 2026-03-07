import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	createCompletedGeneration,
	createAddInstrumentalGeneration,
	createAddVocalsGeneration,
	createExtendGeneration,
	createProject
} from '$lib/test-utils';
import type { Generation } from '$lib/types';

// Mock db.server — getGeneration is called to look up parent generation
const mockGetGeneration = vi.fn<(id: number) => Generation | undefined>();
vi.mock('$lib/db.server', () => ({
	getGeneration: (id: number) => mockGetGeneration(id)
}));

// Mock assets-cache — we just want predictable URLs in tests
vi.mock('$lib/server/assets-cache.server', () => ({
	getPreferredTrackAssetUrl: (_gen: unknown, track: number, type: string) =>
		`https://cdn.example.com/${type}/${track}`,
	queueTrackAssetCaching: () => {}
}));

import { load } from './+page.server';

interface LoadResult {
	generation: Generation;
	retryExtension: {
		canRetry: boolean;
		reason: string | null;
		sourceSong: { id: string; title: string; duration: number | null } | null;
		extendsGenerationId: number;
		extendsAudioId: string;
		stemUrl: string | null;
		stemType: string | null;
		defaults: {
			title: string;
			style: string | null;
			lyrics: string | null;
			continueAt: number | null;
			tags: string | null;
			negativeTags: string | null;
		};
	} | null;
}

type LoadResultWithRetryUpload = LoadResult & {
	retryUpload: unknown;
};

function makeParams(generationId: number) {
	return { generationId: String(generationId), projectId: '1' };
}

function makeParent(generation: Generation) {
	const project = createProject({ id: generation.project_id });
	return async () => ({
		activeProject: {
			...project,
			generations: [generation]
		}
	});
}

async function callLoad(generation: Generation, parentGeneration?: Generation) {
	if (parentGeneration) {
		mockGetGeneration.mockReturnValue(parentGeneration);
	}
	return load({
		params: makeParams(generation.id),
		parent: makeParent(generation)
	} as never) as Promise<LoadResult>;
}

beforeEach(() => {
	mockGetGeneration.mockReset();
});

// ============================================================================
// retryExtension for regular extend generations
// ============================================================================

describe('retryExtension — extend generation', () => {
	it('is null for a generation with no parent', async () => {
		const gen = createCompletedGeneration({ project_id: 1 });
		const result = await callLoad(gen);
		expect(result.retryExtension).toBeNull();
	});

	it('has canRetry true when parent track has duration', async () => {
		const parent = createCompletedGeneration({
			id: 10,
			project_id: 1,
			track1_audio_id: 'parent-audio-1',
			track1_duration: 180
		});
		const gen = createExtendGeneration({
			project_id: 1,
			extends_generation_id: parent.id,
			extends_audio_id: parent.track1_audio_id!
		});
		const result = await callLoad(gen, parent);

		expect(result.retryExtension).not.toBeNull();
		expect(result.retryExtension!.canRetry).toBe(true);
		expect(result.retryExtension!.reason).toBeNull();
	});

	it('has canRetry false when parent track duration is missing', async () => {
		const parent = createCompletedGeneration({
			id: 10,
			project_id: 1,
			track1_audio_id: 'parent-audio-1',
			track1_duration: null
		});
		const gen = createExtendGeneration({
			project_id: 1,
			extends_generation_id: parent.id,
			extends_audio_id: parent.track1_audio_id!
		});
		const result = await callLoad(gen, parent);

		expect(result.retryExtension!.canRetry).toBe(false);
		expect(result.retryExtension!.reason).toContain('duration metadata');
	});

	it('has canRetry false when parent is not found', async () => {
		mockGetGeneration.mockReturnValue(undefined);
		const gen = createExtendGeneration({ project_id: 1 });
		const result = await callLoad(gen);

		expect(result.retryExtension!.canRetry).toBe(false);
		expect(result.retryExtension!.reason).toContain('parent generation is no longer available');
	});

	it('has stemUrl and stemType as null for extend generations', async () => {
		const parent = createCompletedGeneration({
			id: 10,
			project_id: 1,
			track1_audio_id: 'parent-audio-1',
			track1_duration: 180
		});
		const gen = createExtendGeneration({
			project_id: 1,
			extends_generation_id: parent.id,
			extends_audio_id: parent.track1_audio_id!
		});
		const result = await callLoad(gen, parent);

		expect(result.retryExtension!.stemUrl).toBeNull();
		expect(result.retryExtension!.stemType).toBeNull();
	});

	it('includes correct defaults', async () => {
		const parent = createCompletedGeneration({
			id: 10,
			project_id: 1,
			track1_audio_id: 'parent-audio-1',
			track1_duration: 180
		});
		const gen = createExtendGeneration({
			project_id: 1,
			extends_generation_id: parent.id,
			extends_audio_id: parent.track1_audio_id!,
			title: 'My Song Extension',
			style: 'pop rock',
			continue_at: 120
		});
		const result = await callLoad(gen, parent);

		expect(result.retryExtension!.defaults.title).toBe('My Song Extension');
		expect(result.retryExtension!.defaults.continueAt).toBe(120);
	});
});

// ============================================================================
// retryExtension for add_instrumental generations
// ============================================================================

describe('retryExtension — add_instrumental generation', () => {
	it('has canRetry true when stem URL and type are present', async () => {
		const parent = createCompletedGeneration({
			id: 10,
			project_id: 1,
			track1_audio_id: 'parent-audio-1',
			track1_duration: 60 // duration doesn't matter for add_instrumental
		});
		const gen = createAddInstrumentalGeneration({
			project_id: 1,
			extends_generation_id: parent.id,
			extends_audio_id: parent.track1_audio_id!,
			extends_stem_type: 'vocal',
			extends_stem_url: 'https://example.com/stems/vocal.mp3'
		});
		const result = await callLoad(gen, parent);

		expect(result.retryExtension!.canRetry).toBe(true);
		expect(result.retryExtension!.reason).toBeNull();
	});

	it('exposes stemUrl and stemType from the generation', async () => {
		const parent = createCompletedGeneration({
			id: 10,
			project_id: 1,
			track1_audio_id: 'parent-audio-1',
			track1_duration: null // missing duration should NOT block add_instrumental retry
		});
		const gen = createAddInstrumentalGeneration({
			project_id: 1,
			extends_generation_id: parent.id,
			extends_audio_id: parent.track1_audio_id!,
			extends_stem_type: 'vocal',
			extends_stem_url: 'https://example.com/stems/vocal.mp3'
		});
		const result = await callLoad(gen, parent);

		expect(result.retryExtension!.stemUrl).toBe('https://example.com/stems/vocal.mp3');
		expect(result.retryExtension!.stemType).toBe('vocal');
	});

	it('does NOT block retry when source track duration is missing (unlike extend)', async () => {
		const parent = createCompletedGeneration({
			id: 10,
			project_id: 1,
			track1_audio_id: 'parent-audio-1',
			track1_duration: null
		});
		const gen = createAddInstrumentalGeneration({
			project_id: 1,
			extends_generation_id: parent.id,
			extends_audio_id: parent.track1_audio_id!,
			extends_stem_type: 'vocal',
			extends_stem_url: 'https://example.com/stems/vocal.mp3'
		});
		const result = await callLoad(gen, parent);

		expect(result.retryExtension!.canRetry).toBe(true);
	});

	it('has canRetry false when extends_stem_url is missing', async () => {
		const parent = createCompletedGeneration({
			id: 10,
			project_id: 1,
			track1_audio_id: 'parent-audio-1',
			track1_duration: 180
		});
		const gen = createAddInstrumentalGeneration({
			project_id: 1,
			extends_generation_id: parent.id,
			extends_audio_id: parent.track1_audio_id!,
			extends_stem_type: 'vocal',
			extends_stem_url: null
		});
		const result = await callLoad(gen, parent);

		expect(result.retryExtension!.canRetry).toBe(false);
		expect(result.retryExtension!.reason).toContain('stem URL or type');
	});

	it('has canRetry false when extends_stem_type is missing', async () => {
		const parent = createCompletedGeneration({
			id: 10,
			project_id: 1,
			track1_audio_id: 'parent-audio-1',
			track1_duration: 180
		});
		const gen = createAddInstrumentalGeneration({
			project_id: 1,
			extends_generation_id: parent.id,
			extends_audio_id: parent.track1_audio_id!,
			extends_stem_type: null,
			extends_stem_url: 'https://example.com/stems/vocal.mp3'
		});
		const result = await callLoad(gen, parent);

		expect(result.retryExtension!.canRetry).toBe(false);
		expect(result.retryExtension!.reason).toContain('stem URL or type');
	});

	it('includes negativeTags and tags in defaults', async () => {
		const parent = createCompletedGeneration({
			id: 10,
			project_id: 1,
			track1_audio_id: 'parent-audio-1',
			track1_duration: 180
		});
		const gen = createAddInstrumentalGeneration({
			project_id: 1,
			extends_generation_id: parent.id,
			extends_audio_id: parent.track1_audio_id!,
			extends_stem_type: 'vocal',
			extends_stem_url: 'https://example.com/stems/vocal.mp3',
			style: 'cinematic',
			negative_tags: 'drums,bass'
		});
		const result = await callLoad(gen, parent);

		expect(result.retryExtension!.defaults.tags).toBe('cinematic');
		expect(result.retryExtension!.defaults.negativeTags).toBe('drums,bass');
	});
});

describe('retryExtension — add_vocals generation', () => {
	it('has canRetry true when stem URL and type are present', async () => {
		const parent = createCompletedGeneration({
			id: 10,
			project_id: 1,
			track1_audio_id: 'parent-audio-1',
			track1_duration: 60
		});
		const gen = createAddVocalsGeneration({
			project_id: 1,
			extends_generation_id: parent.id,
			extends_audio_id: parent.track1_audio_id!,
			extends_stem_type: 'instrumental',
			extends_stem_url: 'https://example.com/stems/instrumental.mp3'
		});
		const result = await callLoad(gen, parent);

		expect(result.retryExtension!.canRetry).toBe(true);
		expect(result.retryExtension!.reason).toBeNull();
	});

	it('does NOT block retry when source track duration is missing', async () => {
		const parent = createCompletedGeneration({
			id: 10,
			project_id: 1,
			track1_audio_id: 'parent-audio-1',
			track1_duration: null
		});
		const gen = createAddVocalsGeneration({
			project_id: 1,
			extends_generation_id: parent.id,
			extends_audio_id: parent.track1_audio_id!,
			extends_stem_type: 'instrumental',
			extends_stem_url: 'https://example.com/stems/instrumental.mp3'
		});
		const result = await callLoad(gen, parent);

		expect(result.retryExtension!.canRetry).toBe(true);
	});

	it('has canRetry false when stem URL is missing', async () => {
		const parent = createCompletedGeneration({
			id: 10,
			project_id: 1,
			track1_audio_id: 'parent-audio-1',
			track1_duration: 180
		});
		const gen = createAddVocalsGeneration({
			project_id: 1,
			extends_generation_id: parent.id,
			extends_audio_id: parent.track1_audio_id!,
			extends_stem_type: 'instrumental',
			extends_stem_url: null
		});
		const result = await callLoad(gen, parent);

		expect(result.retryExtension!.canRetry).toBe(false);
		expect(result.retryExtension!.reason).toContain('stem URL or type');
	});
});

// ============================================================================
// Retry generate — base generate type
// ============================================================================

describe('retryExtension — generate generation', () => {
	it('is null for a base generate generation (no parent)', async () => {
		const gen = createCompletedGeneration({ project_id: 1, generation_type: 'generate' });
		const result = await callLoad(gen);

		expect(result.retryExtension).toBeNull();
	});

	it('retryUpload is null for a base generate generation', async () => {
		const gen = createCompletedGeneration({ project_id: 1, generation_type: 'generate' });
		const result = (await callLoad(gen)) as LoadResultWithRetryUpload;

		expect(result.retryUpload).toBeNull();
	});

	it('generation is returned with correct title, style and lyrics', async () => {
		const gen = createCompletedGeneration({
			project_id: 1,
			generation_type: 'generate',
			title: 'Midnight Echoes',
			style: 'synthwave, dark',
			lyrics: '[Verse]\nCity of neon dreams'
		});
		const result = await callLoad(gen);

		expect(result.generation.title).toBe('Midnight Echoes');
		expect(result.generation.style).toBe('synthwave, dark');
		expect(result.generation.lyrics).toBe('[Verse]\nCity of neon dreams');
	});
});
