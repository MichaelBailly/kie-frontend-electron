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

	const isStemBasedRemix =
		generation.generation_type === 'add_instrumental' ||
		generation.generation_type === 'add_vocals';

	// For extend retries: check source track has duration metadata
	if (
		!isStemBasedRemix &&
		retrySourceSong &&
		(!retrySourceSong.duration || retrySourceSong.duration <= 1)
	) {
		retryDisabledReason = 'The original source track is missing duration metadata.';
	}

	// For add_instrumental retries: check that stem URL and type are still available
	if (isStemBasedRemix && (!generation.extends_stem_url || !generation.extends_stem_type)) {
		retryDisabledReason = 'The stem URL or type for this generation is no longer available.';
	}

	const retryExtension =
		generation.extends_generation_id && generation.extends_audio_id
			? {
					canRetry: !!retrySourceSong && !retryDisabledReason,
					reason: retryDisabledReason,
					sourceSong: retrySourceSong,
					extendsGenerationId: generation.extends_generation_id,
					extendsAudioId: generation.extends_audio_id,
					stemUrl: isStemBasedRemix ? (generation.extends_stem_url ?? null) : null,
					stemType: isStemBasedRemix ? (generation.extends_stem_type ?? null) : null,
					defaults: {
						title: generation.title,
						style: generation.style,
						lyrics: generation.lyrics,
						continueAt: generation.continue_at,
						tags: generation.style,
						negativeTags: generation.negative_tags
					}
				}
			: null;

	// Retry for upload-based generations (upload_instrumental / upload_vocals)
	const isUploadBasedGeneration =
		generation.generation_type === 'upload_instrumental' ||
		generation.generation_type === 'upload_vocals';

	let uploadRetryDisabledReason: string | null = null;
	if (isUploadBasedGeneration && !generation.source_audio_local_url) {
		uploadRetryDisabledReason = 'The source audio file for this generation is no longer available.';
	}

	const retryUpload = isUploadBasedGeneration
		? {
				canRetry: !uploadRetryDisabledReason,
				reason: uploadRetryDisabledReason,
				sourceGenerationId: generation.id,
				sourceAudioLocalUrl: generation.source_audio_local_url ?? null,
				defaults: {
					title: generation.title,
					tags: generation.style ?? '',
					negativeTags: generation.negative_tags ?? '',
					prompt: generation.lyrics ?? '',
					style: generation.style ?? ''
				}
			}
		: null;

	return {
		generation,
		activeProject, // Pass through so page can access live data
		parentGeneration,
		parentSong,
		retryExtension,
		retryUpload
	};
};
