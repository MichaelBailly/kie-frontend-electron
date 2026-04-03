import { prepareStmt } from '../database.server';
import type { CompletedGenerationTrack, GenerationTrackUpdate } from './shared.server';

export function setGenerationSourceAudioLocalUrl(id: number, sourceAudioLocalUrl: string): void {
	const stmt = prepareStmt(`
		UPDATE generations SET
			source_audio_local_url = ?,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`);

	stmt.run(sourceAudioLocalUrl, id);
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
	track1: GenerationTrackUpdate,
	track2?: GenerationTrackUpdate,
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
	track1: CompletedGenerationTrack,
	track2: CompletedGenerationTrack,
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
	track1: CompletedGenerationTrack,
	track2: CompletedGenerationTrack,
	responseData: string
): void {
	setCompleted(id, track1, track2, responseData);
}

export function deleteGeneration(id: number): void {
	const stmt = prepareStmt('DELETE FROM generations WHERE id = ?');
	stmt.run(id);
}
