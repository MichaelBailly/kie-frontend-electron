import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createProject,
	createUploadVocalsGeneration,
	setGenerationSourceAudioLocalUrl
} from '$lib/db.server';
import { addVocals } from '$lib/kie-api.server';
import { KIE_CALLBACK_URL } from '$lib/constants.server';
import {
	asNonEmptyString,
	asOptionalString,
	normalizeNegativeTags,
	parseJsonBody,
	startGenerationTask
} from '$lib/api-helpers.server';
import {
	finalizeTemporaryUploadedAudio,
	removeTemporaryUploadedAudio
} from '$lib/server/assets-cache.server';

function buildProjectName(title: string): string {
	return `Vocals: ${title}`;
}

export const POST: RequestHandler = async ({ request }) => {
	const body = await parseJsonBody(request);
	const title = asNonEmptyString(body.title, 'title');
	const prompt = asNonEmptyString(body.prompt, 'prompt');
	const style = asNonEmptyString(body.style, 'style');
	const remoteUrl = asNonEmptyString(body.remoteUrl, 'remoteUrl');
	const temporaryFileName = asNonEmptyString(body.temporaryFileName, 'temporaryFileName');
	const negativeTags = asOptionalString(body.negativeTags, 'negativeTags').trim();
	const projectNameRaw = asOptionalString(body.projectName, 'projectName').trim();
	const projectName = projectNameRaw || buildProjectName(title);
	const negativeTagsForApi = normalizeNegativeTags(negativeTags);

	const project = createProject(projectName);
	const generation = createUploadVocalsGeneration(project.id, title, style, prompt, negativeTags);

	try {
		const sourceAudioLocalUrl = await finalizeTemporaryUploadedAudio(
			generation.id,
			temporaryFileName
		);
		setGenerationSourceAudioLocalUrl(generation.id, sourceAudioLocalUrl);
		generation.source_audio_local_url = sourceAudioLocalUrl;
	} catch (err) {
		await removeTemporaryUploadedAudio(temporaryFileName);
		throw err;
	}

	startGenerationTask(generation.id, () =>
		addVocals({
			uploadUrl: remoteUrl,
			title,
			prompt,
			style,
			negativeTags: negativeTagsForApi,
			model: 'V5',
			callBackUrl: KIE_CALLBACK_URL
		})
	).catch((err) =>
		console.error(`[AsyncTask] upload vocals generation ${generation.id} failed to start:`, err)
	);

	return json({
		project: {
			id: project.id,
			name: project.name
		},
		generation
	});
};
