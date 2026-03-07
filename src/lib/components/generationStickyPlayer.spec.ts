import { describe, expect, it } from 'vitest';
import { getPinnedGenerationTrack } from './generationStickyPlayer';

const track = {
	id: 'track-1',
	generationId: 42,
	projectId: 7,
	title: 'Pinned Track',
	imageUrl: 'https://example.com/image.jpg',
	streamUrl: 'https://example.com/stream.mp3',
	audioUrl: 'https://example.com/audio.mp3',
	duration: 123
};

describe('getPinnedGenerationTrack', () => {
	it('returns the active generation track once the inline player is out of view', () => {
		expect(
			getPinnedGenerationTrack({
				currentTrack: track,
				isPlaying: true,
				isInlinePlayerHidden: true,
				generationId: 42,
				trackIds: ['track-1', 'track-2']
			})
		).toEqual(track);
	});

	it('returns null while the inline player is still visible', () => {
		expect(
			getPinnedGenerationTrack({
				currentTrack: track,
				isPlaying: true,
				isInlinePlayerHidden: false,
				generationId: 42,
				trackIds: ['track-1', 'track-2']
			})
		).toBeNull();
	});

	it('returns null when the active track does not belong to this generation', () => {
		expect(
			getPinnedGenerationTrack({
				currentTrack: { ...track, generationId: 99 },
				isPlaying: true,
				isInlinePlayerHidden: true,
				generationId: 42,
				trackIds: ['track-1', 'track-2']
			})
		).toBeNull();
	});

	it('returns null when the active track is not one of the generation variations', () => {
		expect(
			getPinnedGenerationTrack({
				currentTrack: { ...track, id: 'other-track' },
				isPlaying: true,
				isInlinePlayerHidden: true,
				generationId: 42,
				trackIds: ['track-1', 'track-2']
			})
		).toBeNull();
	});

	it('returns null when playback is paused even if the inline player is hidden', () => {
		expect(
			getPinnedGenerationTrack({
				currentTrack: track,
				isPlaying: false,
				isInlinePlayerHidden: true,
				generationId: 42,
				trackIds: ['track-1', 'track-2']
			})
		).toBeNull();
	});
});
