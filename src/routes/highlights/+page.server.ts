import type { PageServerLoad } from './$types';
import type { Generation, VariationAnnotation } from '$lib/types';
import {
	getAllNotableAnnotations,
	getAllAnnotationsWithLabels,
	getAllCompletedStemSeparations,
	getAllExtendedParentGenerations,
	getGeneration
} from '$lib/db.server';

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

function buildSongFromGeneration(generation: Generation, audioId: string): HighlightSong | null {
	if (audioId === generation.track1_audio_id) {
		return {
			id: generation.track1_audio_id || '',
			title: `${generation.title} - Track 1`,
			streamUrl: generation.track1_stream_url,
			audioUrl: generation.track1_audio_url,
			imageUrl: generation.track1_image_url,
			duration: generation.track1_duration,
			trackNumber: 1
		};
	} else if (audioId === generation.track2_audio_id) {
		return {
			id: generation.track2_audio_id || '',
			title: `${generation.title} - Track 2`,
			streamUrl: generation.track2_stream_url,
			audioUrl: generation.track2_audio_url,
			imageUrl: generation.track2_image_url,
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

	for (const ann of annotations) {
		if (!generationCache.has(ann.generation_id)) {
			generationCache.set(ann.generation_id, getGeneration(ann.generation_id));
		}
		const generation = generationCache.get(ann.generation_id);
		if (!generation) continue;

		const song = buildSongFromGeneration(generation, ann.audio_id);
		if (!song) continue;

		variations.push({ annotation: ann, generation, song });
	}

	return variations;
}

export const load: PageServerLoad = async () => {
	// Fetch all data in parallel-ish (sync DB calls, but grouped logically)
	const notableAnnotations = getAllNotableAnnotations();
	const labeledAnnotations = getAllAnnotationsWithLabels();
	const completedStems = getAllCompletedStemSeparations();
	const extendedParents = getAllExtendedParentGenerations();

	// Build starred variations
	const starredVariations = buildAnnotationVariations(
		notableAnnotations.filter((a) => a.starred === 1)
	);

	// Build noted variations
	const notedVariations = buildAnnotationVariations(
		notableAnnotations.filter((a) => a.comment && a.comment.trim() !== '')
	);

	// Build labeled variations (from separate query to catch labels without star/comment)
	const labeledVariations = buildAnnotationVariations(labeledAnnotations);

	// Build stem separation highlights
	const generationCache = new Map<number, Generation | undefined>();
	const stemHighlights: HighlightStem[] = [];
	for (const stem of completedStems) {
		if (!generationCache.has(stem.generation_id)) {
			generationCache.set(stem.generation_id, getGeneration(stem.generation_id));
		}
		const generation = generationCache.get(stem.generation_id);
		if (!generation) continue;

		const song = buildSongFromGeneration(generation, stem.audio_id);
		if (!song) continue;

		stemHighlights.push({
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

	// Build extended generation highlights
	const extensionHighlights: HighlightExtension[] = extendedParents.map((gen) => {
		const songs: HighlightSong[] = [];
		if (gen.track1_audio_id) {
			const song = buildSongFromGeneration(gen, gen.track1_audio_id);
			if (song) songs.push(song);
		}
		if (gen.track2_audio_id) {
			const song = buildSongFromGeneration(gen, gen.track2_audio_id);
			if (song) songs.push(song);
		}
		return { generation: gen, songs };
	});

	return {
		starred: starredVariations,
		noted: notedVariations,
		labeled: labeledVariations,
		stems: stemHighlights,
		extensions: extensionHighlights,
		totalCount:
			starredVariations.length +
			notedVariations.length +
			labeledVariations.length +
			stemHighlights.length +
			extensionHighlights.length
	};
};
