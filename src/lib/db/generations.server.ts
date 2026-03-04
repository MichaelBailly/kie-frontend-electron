import type { Generation } from '$lib/types';
import { prepareStmt } from './database.server';

export function createGeneration(
	projectId: number,
	title: string,
	style: string,
	lyrics: string,
	instrumental: boolean = false
): Generation {
	const stmt = prepareStmt(`
		INSERT INTO generations (project_id, title, style, lyrics, status, extends_generation_id, extends_audio_id, continue_at, instrumental, generation_type)
		VALUES (?, ?, ?, ?, 'pending', NULL, NULL, NULL, ?, 'generate')
		RETURNING *
	`);
	const generation = stmt.get(projectId, title, style, lyrics, instrumental ? 1 : 0) as Generation;

	// Update project's updated_at
	prepareStmt('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(projectId);

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
	instrumental: boolean = false,
	options?: { stemType?: string; stemUrl?: string }
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
			generation_type
		)
		VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, 'extend')
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
		instrumental ? 1 : 0
	) as Generation;

	// Update project's updated_at
	prepareStmt('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(projectId);

	return generation;
}

export function getExtendedGenerations(generationId: number, audioId: string): Generation[] {
	const stmt = prepareStmt(`
		SELECT * FROM generations 
		WHERE extends_generation_id = ? AND extends_audio_id = ?
		AND generation_type NOT IN ('add_instrumental', 'upload_instrumental', 'add_vocals', 'upload_vocals')
		ORDER BY created_at ASC
	`);
	return stmt.all(generationId, audioId) as Generation[];
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
	stemUrl: string
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
			negative_tags
		)
		VALUES (?, ?, ?, ?, 'pending', ?, ?, NULL, ?, ?, 0, 'add_vocals', ?)
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
		negativeTags
	) as Generation;

	prepareStmt('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(projectId);

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
	stemUrl: string
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
			negative_tags
		)
		VALUES (?, ?, ?, '', 'pending', ?, ?, NULL, ?, ?, 1, 'add_instrumental', ?)
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
		negativeTags
	) as Generation;

	prepareStmt('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(projectId);

	return generation;
}

export function getAddInstrumentalGenerations(generationId: number, audioId: string): Generation[] {
	const stmt = prepareStmt(`
		SELECT * FROM generations
		WHERE extends_generation_id = ?
		  AND extends_audio_id = ?
		  AND generation_type IN ('add_instrumental', 'upload_instrumental')
		ORDER BY created_at ASC
	`);

	return stmt.all(generationId, audioId) as Generation[];
}

export function getAddVocalsGenerations(generationId: number, audioId: string): Generation[] {
	const stmt = prepareStmt(`
		SELECT * FROM generations
		WHERE extends_generation_id = ?
		  AND extends_audio_id = ?
		  AND generation_type = 'add_vocals'
		ORDER BY created_at ASC
	`);

	return stmt.all(generationId, audioId) as Generation[];
}

export function createUploadInstrumentalGeneration(
	projectId: number,
	title: string,
	tags: string,
	negativeTags: string,
	sourceAudioLocalUrl: string | null = null
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
			source_audio_local_url
		)
		VALUES (?, ?, ?, '', 'pending', 1, 'upload_instrumental', ?, ?)
		RETURNING *
	`);

	const generation = stmt.get(
		projectId,
		title,
		tags,
		negativeTags,
		sourceAudioLocalUrl
	) as Generation;

	prepareStmt('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(projectId);

	return generation;
}

export function createUploadVocalsGeneration(
	projectId: number,
	title: string,
	style: string,
	prompt: string,
	negativeTags: string,
	sourceAudioLocalUrl: string | null = null
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
			source_audio_local_url
		)
		VALUES (?, ?, ?, ?, 'pending', 0, 'upload_vocals', ?, ?)
		RETURNING *
	`);

	const generation = stmt.get(
		projectId,
		title,
		style,
		prompt,
		negativeTags,
		sourceAudioLocalUrl
	) as Generation;

	prepareStmt('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(projectId);

	return generation;
}

export function setGenerationSourceAudioLocalUrl(id: number, sourceAudioLocalUrl: string): void {
	const stmt = prepareStmt(`
		UPDATE generations SET
			source_audio_local_url = ?,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`);

	stmt.run(sourceAudioLocalUrl, id);
}

export function getGeneration(id: number): Generation | undefined {
	const stmt = prepareStmt('SELECT * FROM generations WHERE id = ?');
	return stmt.get(id) as Generation | undefined;
}

export function getGenerationByTaskId(taskId: string): Generation | undefined {
	const stmt = prepareStmt('SELECT * FROM generations WHERE task_id = ?');
	return stmt.get(taskId) as Generation | undefined;
}

export function getGenerationsByProject(projectId: number): Generation[] {
	const stmt = prepareStmt(
		'SELECT * FROM generations WHERE project_id = ? ORDER BY created_at DESC'
	);
	return stmt.all(projectId) as Generation[];
}

export function getLatestGenerationByProject(projectId: number): Generation | undefined {
	const stmt = prepareStmt(
		'SELECT * FROM generations WHERE project_id = ? ORDER BY created_at DESC LIMIT 1'
	);
	return stmt.get(projectId) as Generation | undefined;
}

export function setTaskStarted(id: number, taskId: string): void {
	const stmt = prepareStmt(
		'UPDATE generations SET task_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
	);
	stmt.run(taskId, 'processing', id);
}

export function setStatus(id: number, status: string): void {
	const stmt = prepareStmt(
		'UPDATE generations SET status = ?, error_message = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
	);
	stmt.run(status, id);
}

export function setErrored(id: number, errorMessage: string): void {
	const stmt = prepareStmt(
		'UPDATE generations SET status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
	);
	stmt.run('error', errorMessage, id);
}

export function updateGenerationTracks(
	id: number,
	track1: {
		streamUrl?: string;
		audioUrl?: string;
		imageUrl?: string;
		duration?: number;
		audioId?: string;
	},
	track2?: {
		streamUrl?: string;
		audioUrl?: string;
		imageUrl?: string;
		duration?: number;
		audioId?: string;
	},
	responseData?: string
): void {
	const stmt = prepareStmt(`
		UPDATE generations SET
			track1_stream_url = COALESCE(?, track1_stream_url),
			track1_audio_url = COALESCE(?, track1_audio_url),
			track1_image_url = COALESCE(?, track1_image_url),
			track1_duration = COALESCE(?, track1_duration),
			track1_audio_id = COALESCE(?, track1_audio_id),
			track2_stream_url = COALESCE(?, track2_stream_url),
			track2_audio_url = COALESCE(?, track2_audio_url),
			track2_image_url = COALESCE(?, track2_image_url),
			track2_duration = COALESCE(?, track2_duration),
			track2_audio_id = COALESCE(?, track2_audio_id),
			response_data = COALESCE(?, response_data),
			updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`);
	stmt.run(
		track1.streamUrl || null,
		track1.audioUrl || null,
		track1.imageUrl || null,
		track1.duration || null,
		track1.audioId || null,
		track2?.streamUrl || null,
		track2?.audioUrl || null,
		track2?.imageUrl || null,
		track2?.duration || null,
		track2?.audioId || null,
		responseData || null,
		id
	);
}

export function setGenerationLocalAssetUrls(
	id: number,
	updates: {
		track1AudioLocalUrl?: string | null;
		track1ImageLocalUrl?: string | null;
		track2AudioLocalUrl?: string | null;
		track2ImageLocalUrl?: string | null;
	}
): void {
	const stmt = prepareStmt(`
		UPDATE generations SET
			track1_audio_local_url = COALESCE(?, track1_audio_local_url),
			track1_image_local_url = COALESCE(?, track1_image_local_url),
			track2_audio_local_url = COALESCE(?, track2_audio_local_url),
			track2_image_local_url = COALESCE(?, track2_image_local_url),
			updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`);

	stmt.run(
		updates.track1AudioLocalUrl ?? null,
		updates.track1ImageLocalUrl ?? null,
		updates.track2AudioLocalUrl ?? null,
		updates.track2ImageLocalUrl ?? null,
		id
	);
}

export function clearGenerationLocalAssetUrls(id: number): void {
	const stmt = prepareStmt(`
		UPDATE generations SET
			track1_audio_local_url = NULL,
			track1_image_local_url = NULL,
			track2_audio_local_url = NULL,
			track2_image_local_url = NULL,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`);

	stmt.run(id);
}

export function setCompleted(
	id: number,
	track1: {
		streamUrl: string;
		audioUrl: string;
		imageUrl: string;
		duration: number;
		audioId: string;
	},
	track2: {
		streamUrl: string;
		audioUrl: string;
		imageUrl: string;
		duration: number;
		audioId: string;
	},
	responseData: string
): void {
	const stmt = prepareStmt(`
		UPDATE generations SET
			status = ?,
			track1_stream_url = ?,
			track1_audio_url = ?,
			track1_image_url = ?,
			track1_duration = ?,
			track1_audio_id = ?,
			track2_stream_url = ?,
			track2_audio_url = ?,
			track2_image_url = ?,
			track2_duration = ?,
			track2_audio_id = ?,
			response_data = ?,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`);
	stmt.run(
		'success',
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
		id
	);
}

export function updateGenerationTaskId(id: number, taskId: string): void {
	setTaskStarted(id, taskId);
}

export function updateGenerationStatus(id: number, status: string, errorMessage?: string): void {
	if (status === 'error') {
		setErrored(id, errorMessage || 'Unknown generation error');
		return;
	}
	setStatus(id, status);
}

export function completeGeneration(
	id: number,
	_status: string,
	track1: {
		streamUrl: string;
		audioUrl: string;
		imageUrl: string;
		duration: number;
		audioId: string;
	},
	track2: {
		streamUrl: string;
		audioUrl: string;
		imageUrl: string;
		duration: number;
		audioId: string;
	},
	responseData: string
): void {
	setCompleted(id, track1, track2, responseData);
}

export interface ExtendedParentGeneration extends Generation {
	project_name: string;
	extension_count: number;
}

export function getAllExtendedParentGenerations(): ExtendedParentGeneration[] {
	const stmt = prepareStmt(`
		SELECT g.*, p.name as project_name,
		       (
				   SELECT COUNT(*)
				   FROM generations c
				   WHERE c.extends_generation_id = g.id
				     AND c.generation_type NOT IN ('add_instrumental', 'upload_instrumental')
			   ) as extension_count
		FROM generations g
		JOIN projects p ON g.project_id = p.id
		WHERE (
			SELECT COUNT(*)
			FROM generations c
			WHERE c.extends_generation_id = g.id
			  AND c.generation_type NOT IN ('add_instrumental', 'upload_instrumental')
		) > 0
		ORDER BY g.updated_at DESC
	`);
	return stmt.all() as ExtendedParentGeneration[];
}

export function deleteGeneration(id: number): void {
	const stmt = prepareStmt('DELETE FROM generations WHERE id = ?');
	stmt.run(id);
}

export function getPendingGenerations(): Generation[] {
	const stmt = prepareStmt(
		"SELECT * FROM generations WHERE status IN ('pending', 'processing', 'text_success', 'first_success')"
	);
	return stmt.all() as Generation[];
}

export function createImportedGeneration(
	projectId: number,
	taskId: string,
	title: string,
	style: string,
	lyrics: string,
	track1: {
		streamUrl: string;
		audioUrl: string;
		imageUrl: string;
		duration: number;
		audioId: string;
	},
	track2: {
		streamUrl: string;
		audioUrl: string;
		imageUrl: string;
		duration: number;
		audioId: string;
	},
	responseData: string
): Generation {
	const stmt = prepareStmt(`
		INSERT INTO generations (
			project_id, task_id, title, style, lyrics, status,
			track1_stream_url, track1_audio_url, track1_image_url, track1_duration, track1_audio_id,
			track2_stream_url, track2_audio_url, track2_image_url, track2_duration, track2_audio_id,
			response_data, generation_type
		) VALUES (?, ?, ?, ?, ?, 'success', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'generate')
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
		responseData
	) as Generation;

	// Update project's updated_at
	prepareStmt('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(projectId);

	return generation;
}
