import type { AudioTrack } from '$lib/stores/audio.svelte';

interface PinnedGenerationTrackParams {
	currentTrack: AudioTrack | null;
	isPlaying: boolean;
	isInlinePlayerHidden: boolean;
	generationId: number;
	trackIds: readonly string[];
}

export function getPinnedGenerationTrack({
	currentTrack,
	isPlaying,
	isInlinePlayerHidden,
	generationId,
	trackIds
}: PinnedGenerationTrackParams): AudioTrack | null {
	if (!currentTrack || !isPlaying || !isInlinePlayerHidden) {
		return null;
	}

	if (currentTrack.generationId !== generationId) {
		return null;
	}

	return trackIds.includes(currentTrack.id) ? currentTrack : null;
}
