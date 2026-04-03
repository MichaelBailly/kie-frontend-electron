import type { Generation } from '$lib/types';
import { prepareStmt } from '../database.server';
import type { ExtendedParentGeneration } from './shared.server';

export function getExtendedGenerations(generationId: number, audioId: string): Generation[] {
	const stmt = prepareStmt(`
		SELECT * FROM generations
		WHERE extends_generation_id = ? AND extends_audio_id = ?
		AND generation_type NOT IN ('add_instrumental', 'upload_instrumental', 'add_vocals', 'upload_vocals')
		ORDER BY created_at ASC
	`);
	return stmt.all(generationId, audioId) as Generation[];
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

export function getPendingGenerations(): Generation[] {
	const stmt = prepareStmt(
		"SELECT * FROM generations WHERE status IN ('pending', 'processing', 'text_success', 'first_success')"
	);
	return stmt.all() as Generation[];
}
