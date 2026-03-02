import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import AudioPlayer from './AudioPlayer.svelte';

describe('AudioPlayer extension controls', () => {
	it('renders extension badge and secondary play button title when continueAt is provided', () => {
		const { body } = render(AudioPlayer, {
			props: {
				src: 'https://example.com/audio.mp3',
				title: 'Golden Wheel Turn (V1)',
				imageUrl: '',
				duration: 214,
				continueAt: 100,
				trackId: 'audio-1',
				generationId: 20,
				projectId: 6
			}
		});

		expect(body).toContain('Extended at 1:40');
		expect(body).toContain('Play from 1:30 (10 seconds before extension point)');
	});

	it('does not render extension UI when continueAt is null', () => {
		const { body } = render(AudioPlayer, {
			props: {
				src: 'https://example.com/audio.mp3',
				title: 'Golden Wheel Turn (V1)',
				imageUrl: '',
				duration: 214,
				continueAt: null,
				trackId: 'audio-1',
				generationId: 20,
				projectId: 6
			}
		});

		expect(body).not.toContain('Extended at');
		expect(body).not.toContain('10 seconds before extension point');
	});
});
