import type { StemSeparationType, StemSeparation } from '$lib/types';
import { prepareStmt } from './database.server';

export function createStemSeparation(
	generationId: number,
	audioId: string,
	type: StemSeparationType
): StemSeparation {
	const stmt = prepareStmt(`
		INSERT INTO stem_separations (generation_id, audio_id, type, status)
		VALUES (?, ?, ?, 'pending')
		RETURNING *
	`);
	return stmt.get(generationId, audioId, type) as StemSeparation;
}

export function getStemSeparation(id: number): StemSeparation | undefined {
	const stmt = prepareStmt('SELECT * FROM stem_separations WHERE id = ?');
	return stmt.get(id) as StemSeparation | undefined;
}

export function getStemSeparationByTaskId(taskId: string): StemSeparation | undefined {
	const stmt = prepareStmt('SELECT * FROM stem_separations WHERE task_id = ?');
	return stmt.get(taskId) as StemSeparation | undefined;
}

export function getStemSeparationsForSong(generationId: number, audioId: string): StemSeparation[] {
	const stmt = prepareStmt(`
		SELECT * FROM stem_separations 
		WHERE generation_id = ? AND audio_id = ?
		ORDER BY created_at DESC
	`);
	return stmt.all(generationId, audioId) as StemSeparation[];
}

export function getStemSeparationByType(
	generationId: number,
	audioId: string,
	type: StemSeparationType
): StemSeparation | undefined {
	const stmt = prepareStmt(`
		SELECT * FROM stem_separations 
		WHERE generation_id = ? AND audio_id = ? AND type = ?
		ORDER BY created_at DESC
		LIMIT 1
	`);
	return stmt.get(generationId, audioId, type) as StemSeparation | undefined;
}

export function updateStemSeparationTaskId(id: number, taskId: string): void {
	const stmt = prepareStmt(`
		UPDATE stem_separations 
		SET task_id = ?, status = 'processing', updated_at = CURRENT_TIMESTAMP 
		WHERE id = ?
	`);
	stmt.run(taskId, id);
}

export function updateStemSeparationStatus(
	id: number,
	status: string,
	errorMessage?: string
): void {
	const stmt = prepareStmt(`
		UPDATE stem_separations 
		SET status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP 
		WHERE id = ?
	`);
	stmt.run(status, errorMessage || null, id);
}

export function completeStemSeparation(
	id: number,
	data: {
		vocalUrl?: string;
		instrumentalUrl?: string;
		backingVocalsUrl?: string;
		drumsUrl?: string;
		bassUrl?: string;
		guitarUrl?: string;
		keyboardUrl?: string;
		pianoUrl?: string;
		percussionUrl?: string;
		stringsUrl?: string;
		synthUrl?: string;
		fxUrl?: string;
		brassUrl?: string;
		woodwindsUrl?: string;
	},
	responseData: string
): void {
	const stmt = prepareStmt(`
		UPDATE stem_separations SET
			status = 'success',
			vocal_url = ?,
			instrumental_url = ?,
			backing_vocals_url = ?,
			drums_url = ?,
			bass_url = ?,
			guitar_url = ?,
			keyboard_url = ?,
			piano_url = ?,
			percussion_url = ?,
			strings_url = ?,
			synth_url = ?,
			fx_url = ?,
			brass_url = ?,
			woodwinds_url = ?,
			response_data = ?,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`);
	stmt.run(
		data.vocalUrl || null,
		data.instrumentalUrl || null,
		data.backingVocalsUrl || null,
		data.drumsUrl || null,
		data.bassUrl || null,
		data.guitarUrl || null,
		data.keyboardUrl || null,
		data.pianoUrl || null,
		data.percussionUrl || null,
		data.stringsUrl || null,
		data.synthUrl || null,
		data.fxUrl || null,
		data.brassUrl || null,
		data.woodwindsUrl || null,
		responseData,
		id
	);
}

export function getPendingStemSeparations(): StemSeparation[] {
	const stmt = prepareStmt(
		"SELECT * FROM stem_separations WHERE status IN ('pending', 'processing')"
	);
	return stmt.all() as StemSeparation[];
}
