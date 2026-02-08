import type { PageServerLoad } from './$types';
import { getStarredAnnotationsByProject, getGeneration } from '$lib/db.server';
import type { Generation } from '$lib/types';

export interface StarredVariation {
	annotation: {
		id: number;
		generation_id: number;
		audio_id: string;
		starred: number;
		comment: string | null;
		created_at: string;
		updated_at: string;
	};
	generation: Generation;
	song: {
		id: string;
		title: string;
		streamUrl: string | null;
		audioUrl: string | null;
		imageUrl: string | null;
		duration: number | null;
		trackNumber: number;
	};
}

export const load: PageServerLoad = async ({ params, parent }) => {
	const { activeProject } = await parent();
	const projectId = parseInt(params.projectId);

	const annotations = getStarredAnnotationsByProject(projectId);

	// Build enriched list with generation + song data
	const starredVariations: StarredVariation[] = [];

	for (const ann of annotations) {
		const generation = activeProject.generations.find((g: Generation) => g.id === ann.generation_id)
			?? getGeneration(ann.generation_id);

		if (!generation) continue;

		let song: StarredVariation['song'] | null = null;

		if (ann.audio_id === generation.track1_audio_id) {
			song = {
				id: generation.track1_audio_id || '',
				title: `${generation.title} - Track 1`,
				streamUrl: generation.track1_stream_url,
				audioUrl: generation.track1_audio_url,
				imageUrl: generation.track1_image_url,
				duration: generation.track1_duration,
				trackNumber: 1
			};
		} else if (ann.audio_id === generation.track2_audio_id) {
			song = {
				id: generation.track2_audio_id || '',
				title: `${generation.title} - Track 2`,
				streamUrl: generation.track2_stream_url,
				audioUrl: generation.track2_audio_url,
				imageUrl: generation.track2_image_url,
				duration: generation.track2_duration,
				trackNumber: 2
			};
		}

		if (song) {
			starredVariations.push({ annotation: ann, generation, song });
		}
	}

	return {
		starredVariations,
		activeProject
	};
};
