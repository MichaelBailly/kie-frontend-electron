import type { WavConversion } from '$lib/types';
import { prepareStmt } from './database.server';

export function createWavConversion(generationId: number, audioId: string): WavConversion {
	const stmt = prepareStmt(`
		INSERT INTO wav_conversions (generation_id, audio_id, status)
		VALUES (?, ?, 'pending')
		RETURNING *
	`);
	return stmt.get(generationId, audioId) as WavConversion;
}

export function getWavConversion(id: number): WavConversion | undefined {
	const stmt = prepareStmt('SELECT * FROM wav_conversions WHERE id = ?');
	return stmt.get(id) as WavConversion | undefined;
}

export function getWavConversionByTaskId(taskId: string): WavConversion | undefined {
	const stmt = prepareStmt('SELECT * FROM wav_conversions WHERE task_id = ?');
	return stmt.get(taskId) as WavConversion | undefined;
}

export function getWavConversionsForSong(generationId: number, audioId: string): WavConversion[] {
	const stmt = prepareStmt(`
		SELECT * FROM wav_conversions
		WHERE generation_id = ? AND audio_id = ?
		ORDER BY created_at DESC
	`);
	return stmt.all(generationId, audioId) as WavConversion[];
}

export function getWavConversionByGenerationAndAudio(
	generationId: number,
	audioId: string
): WavConversion | undefined {
	const stmt = prepareStmt(`
		SELECT * FROM wav_conversions
		WHERE generation_id = ? AND audio_id = ?
		ORDER BY created_at DESC
		LIMIT 1
	`);
	return stmt.get(generationId, audioId) as WavConversion | undefined;
}

export function setTaskStarted(id: number, taskId: string): void {
	const stmt = prepareStmt(`
		UPDATE wav_conversions
		SET task_id = ?, status = 'processing', updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`);
	stmt.run(taskId, id);
}

export function setStatus(id: number, status: string): void {
	const stmt = prepareStmt(`
		UPDATE wav_conversions
		SET status = ?, error_message = NULL, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`);
	stmt.run(status, id);
}

export function setErrored(id: number, errorMessage: string): void {
	const stmt = prepareStmt(`
		UPDATE wav_conversions
		SET status = 'error', error_message = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`);
	stmt.run(errorMessage, id);
}

export function setCompleted(id: number, wavUrl: string, responseData: string): void {
	const stmt = prepareStmt(`
		UPDATE wav_conversions
		SET status = 'success', wav_url = ?, response_data = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`);
	stmt.run(wavUrl, responseData, id);
}

export function updateWavConversionTaskId(id: number, taskId: string): void {
	setTaskStarted(id, taskId);
}

export function updateWavConversionStatus(id: number, status: string, errorMessage?: string): void {
	if (status === 'error') {
		setErrored(id, errorMessage || 'Unknown wav conversion error');
		return;
	}

	setStatus(id, status);
}

export function completeWavConversion(id: number, wavUrl: string, responseData: string): void {
	setCompleted(id, wavUrl, responseData);
}

export function getPendingWavConversions(): WavConversion[] {
	const stmt = prepareStmt(
		"SELECT * FROM wav_conversions WHERE status IN ('pending', 'processing')"
	);
	return stmt.all() as WavConversion[];
}
