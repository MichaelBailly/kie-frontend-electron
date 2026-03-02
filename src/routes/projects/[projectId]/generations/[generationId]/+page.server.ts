import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getGeneration as getGenerationById } from '$lib/db.server';
import { getPreferredTrackAssetUrl, queueTrackAssetCaching } from '$lib/server/assets-cache.server';

export const load: PageServerLoad = async ({ params, parent }) => {
	const { activeProject } = await parent();

	const generationId = parseInt(params.generationId);
	const generation = activeProject.generations.find((g) => g.id === generationId);

	if (!generation) {
		throw error(404, 'Generation not found');
	}

	// Get parent generation if this is an extended song
	let parentGeneration = null;
	let parentSong = null;
	let retrySourceSong: {
		id: string;
		title: string;
		streamUrl: string | null;
		audioUrl: string | null;
		imageUrl: string | null;
		duration: number | null;
	} | null = null;
	let retryDisabledReason: string | null = null;

	if (generation.extends_generation_id && generation.extends_audio_id) {
		parentGeneration = getGenerationById(generation.extends_generation_id);
		if (parentGeneration) {
			// Determine which track in parent this extends from
			if (generation.extends_audio_id === parentGeneration.track1_audio_id) {
				queueTrackAssetCaching(parentGeneration, 1);
				parentSong = {
					id: parentGeneration.track1_audio_id,
					title: `${parentGeneration.title} - Track 1`,
					generationId: parentGeneration.id
				};
				retrySourceSong = {
					id: parentGeneration.track1_audio_id,
					title: `${parentGeneration.title} - Track 1`,
					streamUrl: parentGeneration.track1_stream_url,
					audioUrl: getPreferredTrackAssetUrl(parentGeneration, 1, 'audio'),
					imageUrl: getPreferredTrackAssetUrl(parentGeneration, 1, 'image'),
					duration: parentGeneration.track1_duration
				};
			} else if (generation.extends_audio_id === parentGeneration.track2_audio_id) {
				queueTrackAssetCaching(parentGeneration, 2);
				parentSong = {
					id: parentGeneration.track2_audio_id,
					title: `${parentGeneration.title} - Track 2`,
					generationId: parentGeneration.id
				};
				retrySourceSong = {
					id: parentGeneration.track2_audio_id,
					title: `${parentGeneration.title} - Track 2`,
					streamUrl: parentGeneration.track2_stream_url,
					audioUrl: getPreferredTrackAssetUrl(parentGeneration, 2, 'audio'),
					imageUrl: getPreferredTrackAssetUrl(parentGeneration, 2, 'image'),
					duration: parentGeneration.track2_duration
				};
			} else {
				retryDisabledReason = 'The original source track could not be resolved for this extension.';
			}
		} else {
			retryDisabledReason = 'The original parent generation is no longer available.';
		}
	}

	if (retrySourceSong && (!retrySourceSong.duration || retrySourceSong.duration <= 1)) {
		retryDisabledReason = 'The original source track is missing duration metadata.';
	}

	const retryExtension = generation.extends_generation_id && generation.extends_audio_id
		? {
				canRetry: !!retrySourceSong && !retryDisabledReason,
				reason: retryDisabledReason,
				sourceSong: retrySourceSong,
				extendsGenerationId: generation.extends_generation_id,
				extendsAudioId: generation.extends_audio_id,
				defaults: {
					title: generation.title,
					style: generation.style,
					lyrics: generation.lyrics,
					continueAt: generation.continue_at
				}
			}
		: null;

	return {
		generation,
		activeProject, // Pass through so page can access live data
		parentGeneration,
		parentSong,
		retryExtension
	};
};
