import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createProject,
	createUploadInstrumentalGeneration,
	setGenerationSourceAudioLocalUrl
} from '$lib/db.server';
import { addInstrumental } from '$lib/kie-api.server';
import { KIE_CALLBACK_URL } from '$lib/constants.server';
import { asNonEmptyString, parseJsonBody, startGenerationTask } from '$lib/api-helpers.server';
import {
	finalizeTemporaryUploadedAudio,
	removeTemporaryUploadedAudio
} from '$lib/server/assets-cache.server';

function buildProjectName(title: string): string {
	return `Instrumental: ${title}`;
}

function asOptionalString(value: unknown, fieldName: string): string {
	if (value === undefined || value === null) {
		return '';
	}

	if (typeof value !== 'string') {
		throw error(400, `Invalid ${fieldName}: must be a string, null, or undefined`);
	}

	return value;
}

export const POST: RequestHandler = async ({ request }) => {
	const body = await parseJsonBody(request);
	const title = asNonEmptyString(body.title, 'title');
	const tags = asNonEmptyString(body.tags, 'tags');
	const remoteUrl = asNonEmptyString(body.remoteUrl, 'remoteUrl');
	const temporaryFileName = asNonEmptyString(body.temporaryFileName, 'temporaryFileName');
	const negativeTags = asOptionalString(body.negativeTags, 'negativeTags').trim();
	const projectNameRaw = asOptionalString(body.projectName, 'projectName').trim();
	const projectName = projectNameRaw || buildProjectName(title);
	const negativeTagsForApi = negativeTags || 'none';

	const project = createProject(projectName);
	const generation = createUploadInstrumentalGeneration(project.id, title, tags, negativeTags);

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
		addInstrumental({
			uploadUrl: remoteUrl,
			title,
			tags,
			negativeTags: negativeTagsForApi,
			model: 'V5',
			callBackUrl: KIE_CALLBACK_URL
		})
	).catch((err) =>
		console.error(
			`[AsyncTask] upload instrumental generation ${generation.id} failed to start:`,
			err
		)
	);

	return json({
		project: {
			id: project.id,
			name: project.name
		},
		generation
	});
};
