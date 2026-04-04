import type { Generation, VariationAnnotation } from '$lib/types';
import {
	getAllNotableAnnotations,
	getAllAnnotationsWithLabels,
	getAllCompletedStemSeparations,
	getAllExtendedParentGenerations,
	getGeneration
} from '$lib/db.server';
import { getPreferredTrackAssetUrl, queueTrackAssetCaching } from '$lib/server/assets-cache.server';

export interface HighlightSong {
	id: string;
	title: string;
	streamUrl: string | null;
	audioUrl: string | null;
	imageUrl: string | null;
	duration: number | null;
	trackNumber: number;
}

export interface HighlightVariation {
	annotation: VariationAnnotation & { project_id: number; project_name: string };
	generation: Generation;
	song: HighlightSong;
}

export interface HighlightStem {
	stemSeparation: {
		id: number;
		generation_id: number;
		audio_id: string;
		type: string;
		project_id: number;
		project_name: string;
		generation_title: string;
		updated_at: string;
	};
	generation: Generation;
	song: HighlightSong;
}

export interface HighlightExtension {
	generation: Generation & { project_name: string; extension_count: number };
	songs: HighlightSong[];
}

export interface HighlightsPageData {
	starred: HighlightVariation[];
	noted: HighlightVariation[];
	labeled: HighlightVariation[];
	stems: HighlightStem[];
	extensions: HighlightExtension[];
	totalCount: number;
}

function buildSongFromGeneration(generation: Generation, audioId: string): HighlightSong | null {
	if (audioId === generation.track1_audio_id) {
		queueTrackAssetCaching(generation, 1);
		return {
			id: generation.track1_audio_id || '',
			title: `${generation.title} - Track 1`,
			streamUrl: generation.track1_stream_url,
			audioUrl: getPreferredTrackAssetUrl(generation, 1, 'audio'),
			imageUrl: getPreferredTrackAssetUrl(generation, 1, 'image'),
			duration: generation.track1_duration,
			trackNumber: 1
		};
	}

	if (audioId === generation.track2_audio_id) {
		queueTrackAssetCaching(generation, 2);
		return {
			id: generation.track2_audio_id || '',
			title: `${generation.title} - Track 2`,
			streamUrl: generation.track2_stream_url,
			audioUrl: getPreferredTrackAssetUrl(generation, 2, 'audio'),
			imageUrl: getPreferredTrackAssetUrl(generation, 2, 'image'),
			duration: generation.track2_duration,
			trackNumber: 2
		};
	}

	return null;
}

function buildAnnotationVariations(
	annotations: (VariationAnnotation & { project_id: number; project_name: string })[]
): HighlightVariation[] {
	const generationCache = new Map<number, Generation | undefined>();
	const variations: HighlightVariation[] = [];

	for (const annotation of annotations) {
		if (!generationCache.has(annotation.generation_id)) {
			generationCache.set(annotation.generation_id, getGeneration(annotation.generation_id));
		}

		const generation = generationCache.get(annotation.generation_id);
		if (!generation) {
			continue;
		}

		const song = buildSongFromGeneration(generation, annotation.audio_id);
		if (!song) {
			continue;
		}

		variations.push({ annotation, generation, song });
	}

	return variations;
}

function buildStemHighlights(): HighlightStem[] {
	const generationCache = new Map<number, Generation | undefined>();
	const highlights: HighlightStem[] = [];

	for (const stem of getAllCompletedStemSeparations()) {
		if (!generationCache.has(stem.generation_id)) {
			generationCache.set(stem.generation_id, getGeneration(stem.generation_id));
		}

		const generation = generationCache.get(stem.generation_id);
		if (!generation) {
			continue;
		}

		const song = buildSongFromGeneration(generation, stem.audio_id);
		if (!song) {
			continue;
		}

		highlights.push({
			stemSeparation: {
				id: stem.id,
				generation_id: stem.generation_id,
				audio_id: stem.audio_id,
				type: stem.type,
				project_id: stem.project_id,
				project_name: stem.project_name,
				generation_title: stem.generation_title,
				updated_at: stem.updated_at
			},
			generation,
			song
		});
	}

	return highlights;
}

function buildExtensionHighlights(): HighlightExtension[] {
	return getAllExtendedParentGenerations().map((generation) => {
		const songs: HighlightSong[] = [];

		if (generation.track1_audio_id) {
			const song = buildSongFromGeneration(generation, generation.track1_audio_id);
			if (song) {
				songs.push(song);
			}
		}

		if (generation.track2_audio_id) {
			const song = buildSongFromGeneration(generation, generation.track2_audio_id);
			if (song) {
				songs.push(song);
			}
		}

		return { generation, songs };
	});
}

export function getHighlightsPageData(): HighlightsPageData {
	const notableAnnotations = getAllNotableAnnotations();
	const starred = buildAnnotationVariations(
		notableAnnotations.filter((annotation) => annotation.starred === 1)
	);
	const noted = buildAnnotationVariations(
		notableAnnotations.filter(
			(annotation) => annotation.comment && annotation.comment.trim() !== ''
		)
	);
	const labeled = buildAnnotationVariations(getAllAnnotationsWithLabels());
	const stems = buildStemHighlights();
	const extensions = buildExtensionHighlights();

	return {
		starred,
		noted,
		labeled,
		stems,
		extensions,
		totalCount: starred.length + noted.length + labeled.length + stems.length + extensions.length
	};
}
