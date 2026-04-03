import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createProject, createUploadVocalsGeneration, getSunoModel } from '$lib/db.server';
import { addVocals } from '$lib/kie-api.server';
import { KIE_CALLBACK_URL } from '$lib/constants.server';
import {
	asNonEmptyString,
	asOptionalString,
	normalizeNegativeTags,
	parseJsonBody
} from '$lib/api-helpers.server';
import {
	buildUploadProjectName,
	finalizeGenerationSourceUpload,
	startLoggedUploadGenerationTask
} from '../upload-generation.server';

export const POST: RequestHandler = async ({ request }) => {
	const body = await parseJsonBody(request);
	const title = asNonEmptyString(body.title, 'title');
	const prompt = asNonEmptyString(body.prompt, 'prompt');
	const style = asNonEmptyString(body.style, 'style');
	const remoteUrl = asNonEmptyString(body.remoteUrl, 'remoteUrl');
	const temporaryFileName = asNonEmptyString(body.temporaryFileName, 'temporaryFileName');
	const negativeTags = normalizeNegativeTags(asOptionalString(body.negativeTags, 'negativeTags'));
	const projectName = buildUploadProjectName(
		'Vocals',
		title,
		asOptionalString(body.projectName, 'projectName')
	);
	const sunoModel = getSunoModel();

	const project = createProject(projectName);
	const generation = createUploadVocalsGeneration(
		project.id,
		title,
		style,
		prompt,
		negativeTags,
		null,
		sunoModel
	);

	await finalizeGenerationSourceUpload(generation, temporaryFileName);

	startLoggedUploadGenerationTask(generation.id, 'upload vocals', () =>
		addVocals({
			uploadUrl: remoteUrl,
			title,
			prompt,
			style,
			negativeTags,
			model: sunoModel,
			callBackUrl: KIE_CALLBACK_URL
		})
	);

	return json({
		project: {
			id: project.id,
			name: project.name
		},
		generation
	});
};
