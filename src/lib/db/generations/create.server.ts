import { DEFAULT_SUNO_MODEL, type Generation, type SunoModel } from '$lib/types';
import { prepareStmt } from '../database.server';
import { touchProject, type CompletedGenerationTrack } from './shared.server';

export function createGeneration(
	projectId: number,
	title: string,
	style: string,
	lyrics: string,
	instrumental = false,
	negativeTags = '',
	model: SunoModel = DEFAULT_SUNO_MODEL
): Generation {
	const stmt = prepareStmt(`
		INSERT INTO generations (project_id, title, style, lyrics, status, extends_generation_id, extends_audio_id, continue_at, instrumental, generation_type, negative_tags, model)
		VALUES (?, ?, ?, ?, 'pending', NULL, NULL, NULL, ?, 'generate', ?, ?)
		RETURNING *
	`);
	const generation = stmt.get(
		projectId,
		title,
		style,
		lyrics,
		instrumental ? 1 : 0,
		negativeTags,
		model
	) as Generation;

	touchProject(projectId);
	return generation;
}

export function createExtendGeneration(
	projectId: number,
	title: string,
	style: string,
	lyrics: string,
	extendsGenerationId: number,
	extendsAudioId: string,
	continueAt: number,
	instrumental = false,
	options?: { stemType?: string; stemUrl?: string; negativeTags?: string; model?: SunoModel }
): Generation {
	const stmt = prepareStmt(`
		INSERT INTO generations (
			project_id,
			title,
			style,
			lyrics,
			status,
			extends_generation_id,
			extends_audio_id,
			continue_at,
			extends_stem_type,
			extends_stem_url,
			instrumental,
			generation_type,
			negative_tags,
			model
		)
		VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, 'extend', ?, ?)
		RETURNING *
	`);
	const generation = stmt.get(
		projectId,
		title,
		style,
		lyrics,
		extendsGenerationId,
		extendsAudioId,
		continueAt,
		options?.stemType ?? null,
		options?.stemUrl ?? null,
		instrumental ? 1 : 0,
		options?.negativeTags ?? '',
		options?.model ?? DEFAULT_SUNO_MODEL
	) as Generation;

	touchProject(projectId);
	return generation;
}

export function createAddVocalsGeneration(
	projectId: number,
	title: string,
	style: string,
	prompt: string,
	negativeTags: string,
	sourceGenerationId: number,
	sourceAudioId: string,
	stemType: string,
	stemUrl: string,
	model: SunoModel = DEFAULT_SUNO_MODEL
): Generation {
	const stmt = prepareStmt(`
		INSERT INTO generations (
			project_id,
			title,
			style,
			lyrics,
			status,
			extends_generation_id,
			extends_audio_id,
			continue_at,
			extends_stem_type,
			extends_stem_url,
			instrumental,
			generation_type,
			negative_tags,
			model
		)
		VALUES (?, ?, ?, ?, 'pending', ?, ?, NULL, ?, ?, 0, 'add_vocals', ?, ?)
		RETURNING *
	`);

	const generation = stmt.get(
		projectId,
		title,
		style,
		prompt,
		sourceGenerationId,
		sourceAudioId,
		stemType,
		stemUrl,
		negativeTags,
		model
	) as Generation;

	touchProject(projectId);
	return generation;
}

export function createAddInstrumentalGeneration(
	projectId: number,
	title: string,
	tags: string,
	negativeTags: string,
	sourceGenerationId: number,
	sourceAudioId: string,
	stemType: string,
	stemUrl: string,
	model: SunoModel = DEFAULT_SUNO_MODEL
): Generation {
	const stmt = prepareStmt(`
		INSERT INTO generations (
			project_id,
			title,
			style,
			lyrics,
			status,
			extends_generation_id,
			extends_audio_id,
			continue_at,
			extends_stem_type,
			extends_stem_url,
			instrumental,
			generation_type,
			negative_tags,
			model
		)
		VALUES (?, ?, ?, '', 'pending', ?, ?, NULL, ?, ?, 1, 'add_instrumental', ?, ?)
		RETURNING *
	`);

	const generation = stmt.get(
		projectId,
		title,
		tags,
		sourceGenerationId,
		sourceAudioId,
		stemType,
		stemUrl,
		negativeTags,
		model
	) as Generation;

	touchProject(projectId);
	return generation;
}

export function createUploadInstrumentalGeneration(
	projectId: number,
	title: string,
	tags: string,
	negativeTags: string,
	sourceAudioLocalUrl: string | null = null,
	model: SunoModel = DEFAULT_SUNO_MODEL
): Generation {
	const stmt = prepareStmt(`
		INSERT INTO generations (
			project_id,
			title,
			style,
			lyrics,
			status,
			instrumental,
			generation_type,
			negative_tags,
			source_audio_local_url,
			model
		)
		VALUES (?, ?, ?, '', 'pending', 1, 'upload_instrumental', ?, ?, ?)
		RETURNING *
	`);

	const generation = stmt.get(
		projectId,
		title,
		tags,
		negativeTags,
		sourceAudioLocalUrl,
		model
	) as Generation;

	touchProject(projectId);
	return generation;
}

export function createUploadVocalsGeneration(
	projectId: number,
	title: string,
	style: string,
	prompt: string,
	negativeTags: string,
	sourceAudioLocalUrl: string | null = null,
	model: SunoModel = DEFAULT_SUNO_MODEL
): Generation {
	const stmt = prepareStmt(`
		INSERT INTO generations (
			project_id,
			title,
			style,
			lyrics,
			status,
			instrumental,
			generation_type,
			negative_tags,
			source_audio_local_url,
			model
		)
		VALUES (?, ?, ?, ?, 'pending', 0, 'upload_vocals', ?, ?, ?)
		RETURNING *
	`);

	const generation = stmt.get(
		projectId,
		title,
		style,
		prompt,
		negativeTags,
		sourceAudioLocalUrl,
		model
	) as Generation;

	touchProject(projectId);
	return generation;
}

export function createImportedGeneration(
	projectId: number,
	taskId: string,
	title: string,
	style: string,
	lyrics: string,
	track1: CompletedGenerationTrack,
	track2: CompletedGenerationTrack,
	responseData: string,
	model: SunoModel = DEFAULT_SUNO_MODEL
): Generation {
	const stmt = prepareStmt(`
		INSERT INTO generations (
			project_id, task_id, title, style, lyrics, status,
			track1_stream_url, track1_audio_url, track1_image_url, track1_duration, track1_audio_id,
			track2_stream_url, track2_audio_url, track2_image_url, track2_duration, track2_audio_id,
			response_data, generation_type, model
		) VALUES (?, ?, ?, ?, ?, 'success', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'generate', ?)
		RETURNING *
	`);
	const generation = stmt.get(
		projectId,
		taskId,
		title,
		style,
		lyrics,
		track1.streamUrl,
		track1.audioUrl,
		track1.imageUrl,
		track1.duration,
		track1.audioId,
		track2.streamUrl,
		track2.audioUrl,
		track2.imageUrl,
		track2.duration,
		track2.audioId,
		responseData,
		model
	) as Generation;

	touchProject(projectId);
	return generation;
}
