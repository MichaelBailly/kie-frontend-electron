import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import Page from './+page.svelte';
import {
	createAnnotation,
	createCompletedGeneration,
	createCompletedStemSeparation,
	createProject
} from '$lib/test-utils';

function createSongPageData(options?: { annotation: ReturnType<typeof createAnnotation> | null }) {
	const project = createProject({ id: 3 });
	const generation = createCompletedGeneration({
		id: 18,
		project_id: project.id,
		track1_audio_id: 'a5420a86-e19a-4ab5-9268-6355a9ec59d5',
		track1_audio_url: 'https://cdn.example.com/audio/18/track1.mp3',
		track1_stream_url: 'https://cdn.example.com/stream/18/track1.mp3'
	});
	const song = {
		id: generation.track1_audio_id!,
		streamUrl: generation.track1_stream_url,
		audioUrl: generation.track1_audio_url,
		imageUrl: generation.track1_image_url,
		duration: generation.track1_duration,
		title: `${generation.title} - Track 1`
	};

	const annotation =
		options?.annotation ??
		createAnnotation({
			generation_id: generation.id,
			audio_id: song.id
		});

	return {
		projects: [
			{
				...project,
				generations: [generation]
			}
		],
		annotations: annotation ? [annotation] : [],
		generation,
		song,
		activeProject: {
			...project,
			generations: [generation]
		},
		extendedGenerations: [],
		stemSeparations: [
			createCompletedStemSeparation({
				generation_id: generation.id,
				audio_id: song.id
			})
		],
		annotation,
		parentGeneration: null,
		parentSong: null,
		continueAt: null
	};
}

describe('song +page.svelte', () => {
	it('should be a valid Svelte component', () => {
		expect(Page).toBeTruthy();
	});

	it('renders in SSR without currentAnnotation initialization error', () => {
		const data = createSongPageData();

		expect(() => render(Page, { props: { data } })).not.toThrow();
	});

	it('renders in SSR when annotation is null', () => {
		const data = createSongPageData({ annotation: null });

		expect(() => render(Page, { props: { data } })).not.toThrow();
	});
});
