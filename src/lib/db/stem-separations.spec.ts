import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';

vi.mock('./database.server', async () => {
	const dbSetup = await import('$lib/test-utils/db-setup');
	return {
		getDb: () => dbSetup.getTestDb(),
		prepareStmt: (sql: string) => dbSetup.testPrepareStmt(sql)
	};
});

import { resetTestDb, closeTestDb } from '$lib/test-utils/db-setup';
import { createProject } from './projects.server';
import { createGeneration } from './generations.server';
import {
	createStemSeparation,
	getStemSeparation,
	getStemSeparationByTaskId,
	getStemSeparationsForSong,
	getStemSeparationByType,
	updateStemSeparationTaskId,
	updateStemSeparationStatus,
	completeStemSeparation,
	getPendingStemSeparations
} from './stem-separations.server';

let projectId: number;
let generationId: number;
const audioId = 'audio-001';

beforeEach(() => {
	resetTestDb();
	projectId = createProject('Test Project').id;
	generationId = createGeneration(projectId, 'Test Song', 'pop', 'lyrics').id;
});

afterAll(() => {
	closeTestDb();
});

describe('Stem separations repository', () => {
	describe('createStemSeparation', () => {
		it('creates a stem separation with pending status', () => {
			const sep = createStemSeparation(generationId, audioId, 'separate_vocal');
			expect(sep.id).toBeGreaterThan(0);
			expect(sep.generation_id).toBe(generationId);
			expect(sep.audio_id).toBe(audioId);
			expect(sep.type).toBe('separate_vocal');
			expect(sep.status).toBe('pending');
			expect(sep.task_id).toBeNull();
			expect(sep.error_message).toBeNull();
		});

		it('creates a split_stem separation', () => {
			const sep = createStemSeparation(generationId, audioId, 'split_stem');
			expect(sep.type).toBe('split_stem');
		});

		it('sets all URL fields to null initially', () => {
			const sep = createStemSeparation(generationId, audioId, 'separate_vocal');
			expect(sep.vocal_url).toBeNull();
			expect(sep.instrumental_url).toBeNull();
			expect(sep.drums_url).toBeNull();
			expect(sep.bass_url).toBeNull();
			expect(sep.guitar_url).toBeNull();
		});
	});

	describe('getStemSeparation', () => {
		it('returns a stem separation by id', () => {
			const sep = createStemSeparation(generationId, audioId, 'separate_vocal');
			const fetched = getStemSeparation(sep.id);
			expect(fetched).toBeDefined();
			expect(fetched!.id).toBe(sep.id);
		});

		it('returns undefined for non-existent id', () => {
			expect(getStemSeparation(999)).toBeUndefined();
		});
	});

	describe('getStemSeparationByTaskId', () => {
		it('returns a stem separation by task_id', () => {
			const sep = createStemSeparation(generationId, audioId, 'separate_vocal');
			updateStemSeparationTaskId(sep.id, 'task-stem-1');
			const fetched = getStemSeparationByTaskId('task-stem-1');
			expect(fetched).toBeDefined();
			expect(fetched!.id).toBe(sep.id);
		});

		it('returns undefined for non-existent task_id', () => {
			expect(getStemSeparationByTaskId('nonexistent')).toBeUndefined();
		});
	});

	describe('getStemSeparationsForSong', () => {
		it('returns all separations for a generation + audio pair', () => {
			createStemSeparation(generationId, audioId, 'separate_vocal');
			createStemSeparation(generationId, audioId, 'split_stem');
			const seps = getStemSeparationsForSong(generationId, audioId);
			expect(seps).toHaveLength(2);
		});

		it('does not include separations for different audio_id', () => {
			createStemSeparation(generationId, audioId, 'separate_vocal');
			createStemSeparation(generationId, 'other-audio', 'separate_vocal');
			expect(getStemSeparationsForSong(generationId, audioId)).toHaveLength(1);
		});

		it('returns both types when multiple exist', () => {
			createStemSeparation(generationId, audioId, 'separate_vocal');
			createStemSeparation(generationId, audioId, 'split_stem');
			const seps = getStemSeparationsForSong(generationId, audioId);
			const types = seps.map((s) => s.type).sort();
			expect(types).toEqual(['separate_vocal', 'split_stem']);
		});

		it('returns empty array when none exist', () => {
			expect(getStemSeparationsForSong(generationId, audioId)).toEqual([]);
		});
	});

	describe('getStemSeparationByType', () => {
		it('returns a separation of the given type when one exists', () => {
			createStemSeparation(generationId, audioId, 'separate_vocal');
			const fetched = getStemSeparationByType(generationId, audioId, 'separate_vocal');
			expect(fetched).toBeDefined();
			expect(fetched!.type).toBe('separate_vocal');
		});

		it('returns undefined when no separation of that type exists', () => {
			createStemSeparation(generationId, audioId, 'split_stem');
			expect(
				getStemSeparationByType(generationId, audioId, 'separate_vocal')
			).toBeUndefined();
		});
	});

	describe('updateStemSeparationTaskId', () => {
		it('sets task_id and status to processing', () => {
			const sep = createStemSeparation(generationId, audioId, 'separate_vocal');
			updateStemSeparationTaskId(sep.id, 'task-123');
			const updated = getStemSeparation(sep.id)!;
			expect(updated.task_id).toBe('task-123');
			expect(updated.status).toBe('processing');
		});
	});

	describe('updateStemSeparationStatus', () => {
		it('updates status without error message', () => {
			const sep = createStemSeparation(generationId, audioId, 'separate_vocal');
			updateStemSeparationStatus(sep.id, 'success');
			const updated = getStemSeparation(sep.id)!;
			expect(updated.status).toBe('success');
			expect(updated.error_message).toBeNull();
		});

		it('updates status with error message', () => {
			const sep = createStemSeparation(generationId, audioId, 'separate_vocal');
			updateStemSeparationStatus(sep.id, 'error', 'Separation failed');
			const updated = getStemSeparation(sep.id)!;
			expect(updated.status).toBe('error');
			expect(updated.error_message).toBe('Separation failed');
		});
	});

	describe('completeStemSeparation', () => {
		it('sets vocal/instrumental URLs for separate_vocal', () => {
			const sep = createStemSeparation(generationId, audioId, 'separate_vocal');
			completeStemSeparation(
				sep.id,
				{
					vocalUrl: 'http://vocal.mp3',
					instrumentalUrl: 'http://instrumental.mp3'
				},
				'{"result":"data"}'
			);
			const updated = getStemSeparation(sep.id)!;
			expect(updated.status).toBe('success');
			expect(updated.vocal_url).toBe('http://vocal.mp3');
			expect(updated.instrumental_url).toBe('http://instrumental.mp3');
			expect(updated.response_data).toBe('{"result":"data"}');
		});

		it('sets stem URLs for split_stem', () => {
			const sep = createStemSeparation(generationId, audioId, 'split_stem');
			completeStemSeparation(
				sep.id,
				{
					drumsUrl: 'http://drums.mp3',
					bassUrl: 'http://bass.mp3',
					guitarUrl: 'http://guitar.mp3',
					keyboardUrl: 'http://keyboard.mp3'
				},
				'{"stems":true}'
			);
			const updated = getStemSeparation(sep.id)!;
			expect(updated.status).toBe('success');
			expect(updated.drums_url).toBe('http://drums.mp3');
			expect(updated.bass_url).toBe('http://bass.mp3');
			expect(updated.guitar_url).toBe('http://guitar.mp3');
			expect(updated.keyboard_url).toBe('http://keyboard.mp3');
			// Unset URLs remain null
			expect(updated.vocal_url).toBeNull();
			expect(updated.piano_url).toBeNull();
		});
	});

	describe('getPendingStemSeparations', () => {
		it('returns separations with pending or processing status', () => {
			const s1 = createStemSeparation(generationId, audioId, 'separate_vocal');
			const s2 = createStemSeparation(generationId, 'audio-2', 'split_stem');
			const s3 = createStemSeparation(generationId, 'audio-3', 'separate_vocal');

			updateStemSeparationTaskId(s2.id, 'task-2');
			updateStemSeparationStatus(s3.id, 'success');

			const pending = getPendingStemSeparations();
			expect(pending).toHaveLength(2);
			const ids = pending.map((s) => s.id).sort();
			expect(ids).toEqual([s1.id, s2.id].sort());
		});

		it('returns empty array when no pending separations exist', () => {
			const sep = createStemSeparation(generationId, audioId, 'separate_vocal');
			updateStemSeparationStatus(sep.id, 'success');
			expect(getPendingStemSeparations()).toEqual([]);
		});
	});
});
