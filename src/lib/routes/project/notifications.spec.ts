import { describe, expect, it } from 'vitest';
import { getGenerationCompletionNotification } from './notifications';
import type { Generation } from '$lib/types';

function createGeneration(overrides: Partial<Generation> = {}): Generation {
	return {
		id: 1,
		project_id: 1,
		task_id: null,
		title: '',
		style: '',
		lyrics: '',
		status: 'success',
		error_message: null,
		track1_stream_url: null,
		track1_audio_url: null,
		track1_image_url: null,
		track1_duration: null,
		track2_stream_url: null,
		track2_audio_url: null,
		track2_image_url: null,
		track2_duration: null,
		track1_audio_id: null,
		track2_audio_id: null,
		response_data: null,
		extends_generation_id: null,
		extends_audio_id: null,
		continue_at: null,
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z',
		...overrides
	};
}

describe('getGenerationCompletionNotification', () => {
	it('uses title when available', () => {
		const generation = createGeneration({ title: 'Midnight Pulse', style: 'electronic' });
		const notification = getGenerationCompletionNotification(generation);

		expect(notification.title).toBe('🎵 Song Generation Complete!');
		expect(notification.body).toBe('"Midnight Pulse"');
	});

	it('falls back to style when title is empty', () => {
		const generation = createGeneration({ title: '', style: 'dream pop' });
		const notification = getGenerationCompletionNotification(generation);

		expect(notification.body).toBe('Style: dream pop');
	});

	it('uses generic fallback when no title or style', () => {
		const generation = createGeneration({ title: '', style: '' });
		const notification = getGenerationCompletionNotification(generation);

		expect(notification.body).toBe('Your song is ready to listen');
	});
});
