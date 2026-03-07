import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import {
	getExtendedGenerations,
	getAddInstrumentalGenerations,
	getAddVocalsGenerations,
	getGeneration as getGenerationById,
	getStemSeparationsForSong,
	getWavConversionsForSong,
	getAnnotation
} from '$lib/db.server';
import { getPreferredTrackAssetUrl, queueTrackAssetCaching } from '$lib/server/assets-cache.server';

export const load: PageServerLoad = async ({ params, parent }) => {
	const { activeProject } = await parent();

	const generationId = parseInt(params.generationId);
	const songId = params.songId;

	const generation = activeProject.generations.find((g) => g.id === generationId);

	if (!generation) {
		throw error(404, 'Generation not found');
	}

	// Determine which track to show based on songId
	let songData: {
		id: string;
		streamUrl: string | null;
		audioUrl: string | null;
		imageUrl: string | null;
		duration: number | null;
		title: string;
	} | null = null;

	if (songId === generation.track1_audio_id) {
		queueTrackAssetCaching(generation, 1);
		songData = {
			id: generation.track1_audio_id || '',
			streamUrl: generation.track1_stream_url,
			audioUrl: getPreferredTrackAssetUrl(generation, 1, 'audio'),
			imageUrl: getPreferredTrackAssetUrl(generation, 1, 'image'),
			duration: generation.track1_duration,
			title: `${generation.title} - Track 1`
		};
	} else if (songId === generation.track2_audio_id) {
		queueTrackAssetCaching(generation, 2);
		songData = {
			id: generation.track2_audio_id || '',
			streamUrl: generation.track2_stream_url,
			audioUrl: getPreferredTrackAssetUrl(generation, 2, 'audio'),
			imageUrl: getPreferredTrackAssetUrl(generation, 2, 'image'),
			duration: generation.track2_duration,
			title: `${generation.title} - Track 2`
		};
	}

	if (!songData || !songData.id) {
		throw error(404, 'Song not found');
	}

	// Get extended generations for this song (songs that extend from this one)
	const extendedGenerations = getExtendedGenerations(generationId, songId);
	const addInstrumentalGenerations = getAddInstrumentalGenerations(generationId, songId);
	const addVocalsGenerations = getAddVocalsGenerations(generationId, songId);

	// Get stem separations for this song
	const stemSeparations = getStemSeparationsForSong(generationId, songId);
	const wavConversions = getWavConversionsForSong(generationId, songId);

	// Get annotation (star/comment) for this song
	const annotation = getAnnotation(generationId, songId) ?? null;

	// Get parent generation if this is an extended song
	let parentGeneration = null;
	let parentSong = null;
	if (generation.extends_generation_id && generation.extends_audio_id) {
		parentGeneration = getGenerationById(generation.extends_generation_id);
		if (parentGeneration) {
			// Determine which track in parent this extends from
			if (generation.extends_audio_id === parentGeneration.track1_audio_id) {
				parentSong = {
					id: parentGeneration.track1_audio_id,
					title: `${parentGeneration.title} - Track 1`
				};
			} else if (generation.extends_audio_id === parentGeneration.track2_audio_id) {
				parentSong = {
					id: parentGeneration.track2_audio_id,
					title: `${parentGeneration.title} - Track 2`
				};
			}
		}
	}

	return {
		generation,
		song: songData,
		activeProject,
		extendedGenerations,
		addInstrumentalGenerations,
		addVocalsGenerations,
		stemSeparations,
		wavConversions,
		annotation,
		parentGeneration,
		parentSong,
		continueAt: generation.continue_at
	};
};
