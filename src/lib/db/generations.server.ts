import type { Generation } from '$lib/types';
import { prepareStmt } from './database.server';

export function createGeneration(
	projectId: number,
	title: string,
	style: string,
	lyrics: string
): Generation {
	const stmt = prepareStmt(`
		INSERT INTO generations (project_id, title, style, lyrics, status, extends_generation_id, extends_audio_id, continue_at)
		VALUES (?, ?, ?, ?, 'pending', NULL, NULL, NULL)
		RETURNING *
	`);
	const generation = stmt.get(projectId, title, style, lyrics) as Generation;

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
	continueAt: number
): Generation {
	const stmt = prepareStmt(`
		INSERT INTO generations (project_id, title, style, lyrics, status, extends_generation_id, extends_audio_id, continue_at)
		VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)
		RETURNING *
	`);
	const generation = stmt.get(
		projectId,
		title,
		style,
		lyrics,
		extendsGenerationId,
		extendsAudioId,
		continueAt
	) as Generation;

	// Update project's updated_at
	prepareStmt('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(projectId);

	return generation;
}

export function getExtendedGenerations(generationId: number, audioId: string): Generation[] {
	const stmt = prepareStmt(`
		SELECT * FROM generations 
		WHERE extends_generation_id = ? AND extends_audio_id = ?
		ORDER BY created_at ASC
	`);
	return stmt.all(generationId, audioId) as Generation[];
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
		       (SELECT COUNT(*) FROM generations c WHERE c.extends_generation_id = g.id) as extension_count
		FROM generations g
		JOIN projects p ON g.project_id = p.id
		WHERE (SELECT COUNT(*) FROM generations c WHERE c.extends_generation_id = g.id) > 0
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
			response_data
		) VALUES (?, ?, ?, ?, ?, 'success', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
