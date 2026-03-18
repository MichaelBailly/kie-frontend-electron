import { describe, expect, it } from 'vitest';
import { createCompletedGeneration } from '$lib/test-utils';
import { buildAudioTrack, toPlayableAudioUrl } from './audio';

describe('toPlayableAudioUrl', () => {
	it('keeps local asset urls unchanged', () => {
		expect(toPlayableAudioUrl('/api/assets/g1-t1-audio.mp3')).toBe('/api/assets/g1-t1-audio.mp3');
	});

	it('wraps remote audio urls in the local media proxy', () => {
		expect(toPlayableAudioUrl('https://tempfile.aiquickdraw.com/r/file.mp3')).toBe(
			'/api/media?url=https%3A%2F%2Ftempfile.aiquickdraw.com%2Fr%2Ffile.mp3'
		);
	});
});

describe('buildAudioTrack', () => {
	it('normalizes remote playback urls to same-origin proxy urls', () => {
		const generation = createCompletedGeneration({
			id: 18,
			project_id: 4
		});

		const track = buildAudioTrack(generation, {
			id: 'audio-18-1',
			title: 'Track 1',
			audioUrl: 'https://tempfile.aiquickdraw.com/r/file.mp3',
			streamUrl: 'https://tempfile.aiquickdraw.com/s/file.mp3',
			duration: 123
		});

		expect(track.audioUrl).toBe(
			'/api/media?url=https%3A%2F%2Ftempfile.aiquickdraw.com%2Fr%2Ffile.mp3'
		);
		expect(track.streamUrl).toBe(
			'/api/media?url=https%3A%2F%2Ftempfile.aiquickdraw.com%2Fs%2Ffile.mp3'
		);
	});
});
