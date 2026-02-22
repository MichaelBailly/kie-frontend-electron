import type { PageServerLoad } from './$types';
import {
	getAllProjects,
	getGenerationsByProject,
	getApiKey,
	getHighlightsCount
} from '$lib/db.server';
import {
	getPreferredTrackAssetUrl,
	queueTrackAssetKindCaching
} from '$lib/server/assets-cache.server';

export const load: PageServerLoad = async () => {
	const projects = getAllProjects();
	const apiKey = getApiKey();

	// Load generation stats for each project
	const projectsWithStats = projects.map((project) => {
		const generations = getGenerationsByProject(project.id);
		const lastGeneration = generations.length > 0 ? generations[0] : null;
		if (lastGeneration) {
			queueTrackAssetKindCaching(lastGeneration, 1, 'image');
		}
		return {
			...project,
			generationCount: generations.length,
			lastGenerationId: lastGeneration?.id || null,
			lastGenerationTitle: lastGeneration?.title || null,
			lastGenerationStatus: lastGeneration?.status || null,
			lastGenerationImageUrl: lastGeneration
				? getPreferredTrackAssetUrl(lastGeneration, 1, 'image')
				: null
		};
	});

	return {
		projects: projectsWithStats,
		hasApiKey: !!apiKey && apiKey.length > 0,
		highlightsCount: getHighlightsCount()
	};
};
