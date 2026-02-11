import type { Generation } from '$lib/types';
import type { AudioTrack } from '$lib/stores/audio.svelte';

type SongLike = {
	id: string;
	title: string;
	imageUrl?: string | null;
	streamUrl?: string | null;
	audioUrl?: string | null;
	duration?: number | null;
};

export function buildAudioTrack(generation: Generation, song: SongLike): AudioTrack {
	return {
		id: song.id,
		generationId: generation.id,
		projectId: generation.project_id,
		title: song.title,
		imageUrl: song.imageUrl ?? null,
		streamUrl: song.streamUrl ?? null,
		audioUrl: song.audioUrl ?? null,
		duration: song.duration ?? null
	};
}
