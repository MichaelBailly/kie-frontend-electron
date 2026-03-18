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

export function toPlayableAudioUrl(url: string | null | undefined): string | null {
	if (!url) {
		return null;
	}

	if (url.startsWith('/') || url.startsWith('blob:') || url.startsWith('data:')) {
		return url;
	}

	try {
		const parsedUrl = new URL(url);
		if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
			return url;
		}

		return `/api/media?url=${encodeURIComponent(parsedUrl.toString())}`;
	} catch {
		return url;
	}
}

export function buildAudioTrack(generation: Generation, song: SongLike): AudioTrack {
	return {
		id: song.id,
		generationId: generation.id,
		projectId: generation.project_id,
		title: song.title,
		imageUrl: song.imageUrl ?? null,
		streamUrl: toPlayableAudioUrl(song.streamUrl) ?? null,
		audioUrl: toPlayableAudioUrl(song.audioUrl) ?? null,
		duration: song.duration ?? null
	};
}
