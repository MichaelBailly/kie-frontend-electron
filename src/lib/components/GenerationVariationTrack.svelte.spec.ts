import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import type { Generation } from '$lib/types';
import GenerationVariationTrack from './GenerationVariationTrack.svelte';

function createGeneration(overrides: Partial<Generation> = {}): Generation {
	return {
		id: 10,
		project_id: 1,
		task_id: null,
		title: 'Night Drive',
		style: 'synthwave',
		lyrics: 'city lights',
		status: 'success',
		error_message: null,
		track1_stream_url: 'https://example.com/track1-stream.mp3',
		track1_audio_url: null,
		track1_image_url: null,
		track1_audio_local_url: null,
		track1_image_local_url: null,
		track1_duration: 120,
		track2_stream_url: 'https://example.com/track2-stream.mp3',
		track2_audio_url: null,
		track2_image_url: null,
		track2_audio_local_url: null,
		track2_image_local_url: null,
		track2_duration: 118,
		track1_audio_id: 'audio-1',
		track2_audio_id: 'audio-2',
		response_data: null,
		extends_generation_id: null,
		extends_audio_id: null,
		continue_at: null,
		extends_stem_type: null,
		extends_stem_url: null,
		instrumental: 0,
		generation_type: 'generate',
		negative_tags: null,
		source_audio_local_url: null,
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z',
		...overrides
	};
}

describe('GenerationVariationTrack', () => {
	it('renders link to song page when audio id is available', () => {
		const generation = createGeneration();
		const { body } = render(GenerationVariationTrack, {
			props: { generation, variation: 1 }
		});

		expect(body).toContain('Variation 1');
		expect(body).toContain('/projects/1/generations/10/song/audio-1');
	});

	it('renders plain variation label when audio id is missing', () => {
		const generation = createGeneration({ track1_audio_id: null });
		const { body } = render(GenerationVariationTrack, {
			props: { generation, variation: 1 }
		});

		expect(body).toContain(
			'<p class="text-sm font-medium text-gray-600 dark:text-gray-400">Variation 1</p>'
		);
		expect(body).not.toContain('/song/audio-1');
	});
});
