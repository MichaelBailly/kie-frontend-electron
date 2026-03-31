import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import type { Generation } from '$lib/types';
import GenerationView from './GenerationView.svelte';

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
		track1_audio_id: null,
		track2_audio_id: null,
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
		model: 'V5',
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z',
		...overrides
	};
}

describe('GenerationView', () => {
	it('renders both variation tracks when track1 and track2 sources exist', () => {
		const generation = createGeneration();
		const { body } = render(GenerationView, { props: { generation } });

		expect(body).toContain('Variation 1');
		expect(body).toContain('Variation 2');
	});

	it('renders only variation 1 when no variation 2 source exists', () => {
		const generation = createGeneration({
			track2_stream_url: null,
			track2_audio_url: null,
			track2_audio_local_url: null
		});
		const { body } = render(GenerationView, { props: { generation } });

		expect(body).toContain('Variation 1');
		expect(body).not.toContain('Variation 2');
	});

	it('renders a friendly error summary with collapsible technical details', () => {
		const generation = createGeneration({
			status: 'error',
			error_message: 'Invalid request. You do not have permission to use negative tags.'
		});
		const { body } = render(GenerationView, { props: { generation } });

		expect(body).toContain('Generation failed');
		expect(body).toContain(
			'The music provider rejected this request because it included an unsupported advanced option.'
		);
		expect(body).toContain('Technical details');
		expect(body).toContain('You do not have permission to use negative tags.');
	});

	it('hides empty optional metadata fields', () => {
		const generation = createGeneration({
			style: '   ',
			lyrics: '   ',
			negative_tags: '   '
		});
		const { body } = render(GenerationView, { props: { generation } });

		expect(body).not.toContain('Style Prompt');
		expect(body).not.toContain('Lyrics');
		expect(body).not.toContain('Negative Tags');
	});
});

describe('GenerationView — retry generate button', () => {
	it('renders "Retry generation" button when onRetryGenerate is provided for a generate-type generation', () => {
		const generation = createGeneration({ generation_type: 'generate' });
		const { body } = render(GenerationView, {
			props: { generation, onRetryGenerate: () => {} }
		});

		expect(body).toContain('Retry generation');
	});

	it('does NOT render "Retry generation" button when onRetryGenerate is null', () => {
		const generation = createGeneration({ generation_type: 'generate' });
		const { body } = render(GenerationView, {
			props: { generation, onRetryGenerate: null }
		});

		expect(body).not.toContain('Retry generation');
	});

	it('does NOT render "Retry generation" button for extend-type generation even if onRetryGenerate is provided', () => {
		const generation = createGeneration({
			generation_type: 'extend',
			extends_generation_id: 1,
			extends_audio_id: 'audio-1-1'
		});
		const { body } = render(GenerationView, {
			props: { generation, onRetryGenerate: () => {} }
		});

		expect(body).not.toContain('Retry generation');
	});

	it('does NOT render "Retry generation" button by default (no onRetryGenerate prop)', () => {
		const generation = createGeneration({ generation_type: 'generate' });
		const { body } = render(GenerationView, { props: { generation } });

		expect(body).not.toContain('Retry generation');
	});
});
