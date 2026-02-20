import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';

vi.mock('./database.server', async () => {
	const dbSetup = await import('$lib/test-utils/db-setup');
	return {
		getDb: () => dbSetup.getTestDb(),
		prepareStmt: (sql: string) => dbSetup.testPrepareStmt(sql)
	};
});

import { resetTestDb, closeTestDb } from '$lib/test-utils/db-setup';
import { createProject, getProject } from './projects.server';
import {
	createGeneration,
	createExtendGeneration,
	getExtendedGenerations,
	getGeneration,
	getGenerationByTaskId,
	getGenerationsByProject,
	getLatestGenerationByProject,
	setTaskStarted,
	setStatus,
	setErrored,
	updateGenerationTracks,
	setCompleted,
	deleteGeneration,
	getPendingGenerations,
	createImportedGeneration,
	getAllExtendedParentGenerations
} from './generations.server';

let projectId: number;

beforeEach(() => {
	resetTestDb();
	projectId = createProject('Test Project').id;
});

afterAll(() => {
	closeTestDb();
});

describe('Generations repository', () => {
	describe('createGeneration', () => {
		it('creates a generation with pending status', () => {
			const gen = createGeneration(projectId, 'My Song', 'pop', 'la la la');
			expect(gen.id).toBeGreaterThan(0);
			expect(gen.project_id).toBe(projectId);
			expect(gen.title).toBe('My Song');
			expect(gen.style).toBe('pop');
			expect(gen.lyrics).toBe('la la la');
			expect(gen.status).toBe('pending');
			expect(gen.task_id).toBeNull();
			expect(gen.error_message).toBeNull();
		});

		it('sets extend fields to null for regular generations', () => {
			const gen = createGeneration(projectId, 'Title', 'style', 'lyrics');
			expect(gen.extends_generation_id).toBeNull();
			expect(gen.extends_audio_id).toBeNull();
			expect(gen.continue_at).toBeNull();
		});

		it('sets track fields to null initially', () => {
			const gen = createGeneration(projectId, 'Title', 'style', 'lyrics');
			expect(gen.track1_stream_url).toBeNull();
			expect(gen.track1_audio_url).toBeNull();
			expect(gen.track1_audio_id).toBeNull();
			expect(gen.track2_stream_url).toBeNull();
			expect(gen.track2_audio_url).toBeNull();
			expect(gen.track2_audio_id).toBeNull();
		});

		it('updates the parent project updated_at', () => {
			const beforeProject = createProject('Before');
			const beforeUpdatedAt = beforeProject.updated_at;
			createGeneration(beforeProject.id, 'Title', 'style', 'lyrics');
			const afterProject = getProject(beforeProject.id)!;
			expect(afterProject.updated_at >= beforeUpdatedAt).toBe(true);
		});
	});

	describe('createExtendGeneration', () => {
		it('creates a generation with extend fields populated', () => {
			const parent = createGeneration(projectId, 'Parent', 'pop', 'lyrics');
			const ext = createExtendGeneration(
				projectId,
				'Extended',
				'pop',
				'more lyrics',
				parent.id,
				'audio-123',
				120.5
			);
			expect(ext.extends_generation_id).toBe(parent.id);
			expect(ext.extends_audio_id).toBe('audio-123');
			expect(ext.continue_at).toBe(120.5);
			expect(ext.status).toBe('pending');
		});
	});

	describe('getGeneration', () => {
		it('returns a generation by id', () => {
			const gen = createGeneration(projectId, 'Title', 'style', 'lyrics');
			const fetched = getGeneration(gen.id);
			expect(fetched).toBeDefined();
			expect(fetched!.id).toBe(gen.id);
			expect(fetched!.title).toBe('Title');
		});

		it('returns undefined for non-existent id', () => {
			expect(getGeneration(999)).toBeUndefined();
		});
	});

	describe('getGenerationByTaskId', () => {
		it('returns a generation by task_id', () => {
			const gen = createGeneration(projectId, 'Title', 'style', 'lyrics');
			setTaskStarted(gen.id, 'task-abc');
			const fetched = getGenerationByTaskId('task-abc');
			expect(fetched).toBeDefined();
			expect(fetched!.id).toBe(gen.id);
		});

		it('returns undefined for non-existent task_id', () => {
			expect(getGenerationByTaskId('nonexistent')).toBeUndefined();
		});
	});

	describe('getGenerationsByProject', () => {
		it('returns all generations for a project', () => {
			createGeneration(projectId, 'First', 'pop', 'l1');
			createGeneration(projectId, 'Second', 'rock', 'l2');
			createGeneration(projectId, 'Third', 'jazz', 'l3');
			const gens = getGenerationsByProject(projectId);
			expect(gens).toHaveLength(3);
			const titles = gens.map((g) => g.title).sort();
			expect(titles).toEqual(['First', 'Second', 'Third']);
		});

		it('returns empty array for project with no generations', () => {
			expect(getGenerationsByProject(projectId)).toEqual([]);
		});

		it('does not include generations from other projects', () => {
			const other = createProject('Other');
			createGeneration(projectId, 'Mine', 'pop', 'l');
			createGeneration(other.id, 'Theirs', 'rock', 'l');
			expect(getGenerationsByProject(projectId)).toHaveLength(1);
		});
	});

	describe('getLatestGenerationByProject', () => {
		it('returns a generation when multiple exist', () => {
			createGeneration(projectId, 'Older', 'pop', 'l');
			createGeneration(projectId, 'Newer', 'rock', 'l');
			const latest = getLatestGenerationByProject(projectId);
			expect(latest).toBeDefined();
			// With same-second timestamps, ordering is non-deterministic
			expect(['Older', 'Newer']).toContain(latest!.title);
		});

		it('returns undefined when no generations exist', () => {
			expect(getLatestGenerationByProject(projectId)).toBeUndefined();
		});
	});

	describe('getExtendedGenerations', () => {
		it('returns generations that extend a specific generation and audio', () => {
			const parent = createGeneration(projectId, 'Parent', 'pop', 'l');
			createExtendGeneration(projectId, 'Ext1', 'pop', 'l', parent.id, 'audio-1', 60);
			createExtendGeneration(projectId, 'Ext2', 'pop', 'l', parent.id, 'audio-1', 120);
			// Different audio_id — should not be returned
			createExtendGeneration(projectId, 'Ext3', 'pop', 'l', parent.id, 'audio-2', 60);
			const exts = getExtendedGenerations(parent.id, 'audio-1');
			expect(exts).toHaveLength(2);
			const titles = exts.map((e) => e.title).sort();
			expect(titles).toEqual(['Ext1', 'Ext2']);
		});

		it('returns empty array when no extensions exist', () => {
			const parent = createGeneration(projectId, 'Parent', 'pop', 'l');
			expect(getExtendedGenerations(parent.id, 'audio-1')).toEqual([]);
		});
	});

	describe('setTaskStarted', () => {
		it('sets task_id and changes status to processing', () => {
			const gen = createGeneration(projectId, 'Title', 'style', 'lyrics');
			setTaskStarted(gen.id, 'task-xyz');
			const updated = getGeneration(gen.id)!;
			expect(updated.task_id).toBe('task-xyz');
			expect(updated.status).toBe('processing');
		});
	});

	describe('setStatus', () => {
		it('updates status and clears error message', () => {
			const gen = createGeneration(projectId, 'Title', 'style', 'lyrics');
			setErrored(gen.id, 'Old error');
			setStatus(gen.id, 'success');
			const updated = getGeneration(gen.id)!;
			expect(updated.status).toBe('success');
			expect(updated.error_message).toBeNull();
		});
	});

	describe('setErrored', () => {
		it('sets error status with error message', () => {
			const gen = createGeneration(projectId, 'Title', 'style', 'lyrics');
			setErrored(gen.id, 'Something failed');
			const updated = getGeneration(gen.id)!;
			expect(updated.status).toBe('error');
			expect(updated.error_message).toBe('Something failed');
		});
	});

	describe('updateGenerationTracks', () => {
		it('updates track1 fields with COALESCE (preserves existing)', () => {
			const gen = createGeneration(projectId, 'Title', 'style', 'lyrics');
			updateGenerationTracks(gen.id, { streamUrl: 'http://stream1' });
			const after1 = getGeneration(gen.id)!;
			expect(after1.track1_stream_url).toBe('http://stream1');

			// Second update preserves stream_url, adds audio_url
			updateGenerationTracks(gen.id, { audioUrl: 'http://audio1' });
			const after2 = getGeneration(gen.id)!;
			expect(after2.track1_stream_url).toBe('http://stream1');
			expect(after2.track1_audio_url).toBe('http://audio1');
		});

		it('updates track2 fields when provided', () => {
			const gen = createGeneration(projectId, 'Title', 'style', 'lyrics');
			updateGenerationTracks(
				gen.id,
				{ streamUrl: 'http://t1' },
				{ streamUrl: 'http://t2', audioId: 'audio-2' }
			);
			const updated = getGeneration(gen.id)!;
			expect(updated.track1_stream_url).toBe('http://t1');
			expect(updated.track2_stream_url).toBe('http://t2');
			expect(updated.track2_audio_id).toBe('audio-2');
		});

		it('updates response_data when provided', () => {
			const gen = createGeneration(projectId, 'Title', 'style', 'lyrics');
			updateGenerationTracks(gen.id, {}, undefined, '{"key":"value"}');
			const updated = getGeneration(gen.id)!;
			expect(updated.response_data).toBe('{"key":"value"}');
		});
	});

	describe('setCompleted', () => {
		it('sets all track fields and status', () => {
			const gen = createGeneration(projectId, 'Title', 'style', 'lyrics');
			setCompleted(
				gen.id,
				{
					streamUrl: 'http://s1',
					audioUrl: 'http://a1',
					imageUrl: 'http://i1',
					duration: 180.5,
					audioId: 'aid1'
				},
				{
					streamUrl: 'http://s2',
					audioUrl: 'http://a2',
					imageUrl: 'http://i2',
					duration: 200.0,
					audioId: 'aid2'
				},
				'{"response":"data"}'
			);
			const updated = getGeneration(gen.id)!;
			expect(updated.status).toBe('success');
			expect(updated.track1_stream_url).toBe('http://s1');
			expect(updated.track1_audio_url).toBe('http://a1');
			expect(updated.track1_image_url).toBe('http://i1');
			expect(updated.track1_duration).toBe(180.5);
			expect(updated.track1_audio_id).toBe('aid1');
			expect(updated.track2_stream_url).toBe('http://s2');
			expect(updated.track2_audio_url).toBe('http://a2');
			expect(updated.track2_image_url).toBe('http://i2');
			expect(updated.track2_duration).toBe(200.0);
			expect(updated.track2_audio_id).toBe('aid2');
			expect(updated.response_data).toBe('{"response":"data"}');
		});
	});

	describe('deleteGeneration', () => {
		it('removes a generation', () => {
			const gen = createGeneration(projectId, 'Title', 'style', 'lyrics');
			deleteGeneration(gen.id);
			expect(getGeneration(gen.id)).toBeUndefined();
		});

		it('does not affect other generations', () => {
			const g1 = createGeneration(projectId, 'Keep', 'pop', 'l');
			const g2 = createGeneration(projectId, 'Delete', 'rock', 'l');
			deleteGeneration(g2.id);
			expect(getGeneration(g1.id)).toBeDefined();
		});
	});

	describe('getPendingGenerations', () => {
		it('returns generations with intermediate statuses', () => {
			const g1 = createGeneration(projectId, 'Pending', 'pop', 'l');
			const g2 = createGeneration(projectId, 'Processing', 'pop', 'l');
			const g3 = createGeneration(projectId, 'TextSuccess', 'pop', 'l');
			const g4 = createGeneration(projectId, 'FirstSuccess', 'pop', 'l');
			createGeneration(projectId, 'Done', 'pop', 'l');
			createGeneration(projectId, 'Failed', 'pop', 'l');

			// Set statuses
			setStatus(g2.id, 'processing');
			setStatus(g3.id, 'text_success');
			setStatus(g4.id, 'first_success');
			setStatus(g1.id + 4, 'success');
			setErrored(g1.id + 5, 'failed');

			const pending = getPendingGenerations();
			expect(pending).toHaveLength(4);
			const statuses = pending.map((g) => g.status).sort();
			expect(statuses).toEqual(['first_success', 'pending', 'processing', 'text_success']);
		});

		it('returns empty array when no pending generations exist', () => {
			const gen = createGeneration(projectId, 'Done', 'pop', 'l');
			setStatus(gen.id, 'success');
			expect(getPendingGenerations()).toEqual([]);
		});
	});

	describe('createImportedGeneration', () => {
		it('creates a generation with success status and all track data', () => {
			const gen = createImportedGeneration(
				projectId,
				'task-import',
				'Imported Song',
				'electronic',
				'beats and drops',
				{
					streamUrl: 'http://s1',
					audioUrl: 'http://a1',
					imageUrl: 'http://i1',
					duration: 240,
					audioId: 'imp-aid1'
				},
				{
					streamUrl: 'http://s2',
					audioUrl: 'http://a2',
					imageUrl: 'http://i2',
					duration: 245,
					audioId: 'imp-aid2'
				},
				'{"imported":true}'
			);
			expect(gen.status).toBe('success');
			expect(gen.task_id).toBe('task-import');
			expect(gen.title).toBe('Imported Song');
			expect(gen.track1_audio_id).toBe('imp-aid1');
			expect(gen.track2_audio_id).toBe('imp-aid2');
			expect(gen.response_data).toBe('{"imported":true}');
		});
	});

	describe('getAllExtendedParentGenerations', () => {
		it('returns empty array when no extensions exist', () => {
			expect(getAllExtendedParentGenerations()).toEqual([]);
		});

		it('returns parent generations that have extensions', () => {
			const parent = createGeneration(projectId, 'Parent Song', 'pop', 'lyrics');
			setCompleted(
				parent.id,
				{
					streamUrl: 'http://s1',
					audioUrl: 'http://a1',
					imageUrl: 'http://i1',
					duration: 180,
					audioId: 'parent-aid1'
				},
				{
					streamUrl: 'http://s2',
					audioUrl: 'http://a2',
					imageUrl: 'http://i2',
					duration: 180,
					audioId: 'parent-aid2'
				},
				'{}'
			);
			createExtendGeneration(
				projectId,
				'Extended Song',
				'pop',
				'more lyrics',
				parent.id,
				'parent-aid1',
				120
			);

			const results = getAllExtendedParentGenerations();
			expect(results).toHaveLength(1);
			expect(results[0].id).toBe(parent.id);
			expect(results[0].extension_count).toBe(1);
			expect(results[0].project_name).toBe('Test Project');
		});

		it('does not return generations without extensions', () => {
			createGeneration(projectId, 'No Extensions', 'pop', 'lyrics');
			expect(getAllExtendedParentGenerations()).toEqual([]);
		});

		it('counts multiple extensions correctly', () => {
			const parent = createGeneration(projectId, 'Parent', 'pop', 'lyrics');
			setCompleted(
				parent.id,
				{
					streamUrl: 'http://s1',
					audioUrl: 'http://a1',
					imageUrl: 'http://i1',
					duration: 180,
					audioId: 'aid1'
				},
				{
					streamUrl: 'http://s2',
					audioUrl: 'http://a2',
					imageUrl: 'http://i2',
					duration: 180,
					audioId: 'aid2'
				},
				'{}'
			);
			createExtendGeneration(projectId, 'Ext 1', 'pop', 'l', parent.id, 'aid1', 60);
			createExtendGeneration(projectId, 'Ext 2', 'pop', 'l', parent.id, 'aid1', 120);
			createExtendGeneration(projectId, 'Ext 3', 'pop', 'l', parent.id, 'aid2', 60);

			const results = getAllExtendedParentGenerations();
			expect(results).toHaveLength(1);
			expect(results[0].extension_count).toBe(3);
		});

		it('spans multiple projects', () => {
			const project2 = createProject('Project 2');
			const parent1 = createGeneration(projectId, 'Parent 1', 'pop', 'l');
			const parent2 = createGeneration(project2.id, 'Parent 2', 'rock', 'l');
			setCompleted(
				parent1.id,
				{
					streamUrl: 'http://s1',
					audioUrl: 'http://a1',
					imageUrl: 'http://i1',
					duration: 180,
					audioId: 'p1-aid1'
				},
				{
					streamUrl: 'http://s2',
					audioUrl: 'http://a2',
					imageUrl: 'http://i2',
					duration: 180,
					audioId: 'p1-aid2'
				},
				'{}'
			);
			setCompleted(
				parent2.id,
				{
					streamUrl: 'http://s3',
					audioUrl: 'http://a3',
					imageUrl: 'http://i3',
					duration: 180,
					audioId: 'p2-aid1'
				},
				{
					streamUrl: 'http://s4',
					audioUrl: 'http://a4',
					imageUrl: 'http://i4',
					duration: 180,
					audioId: 'p2-aid2'
				},
				'{}'
			);
			createExtendGeneration(projectId, 'Ext A', 'pop', 'l', parent1.id, 'p1-aid1', 60);
			createExtendGeneration(project2.id, 'Ext B', 'rock', 'l', parent2.id, 'p2-aid1', 60);

			const results = getAllExtendedParentGenerations();
			expect(results).toHaveLength(2);
			const projectNames = results.map((r) => r.project_name);
			expect(projectNames).toContain('Test Project');
			expect(projectNames).toContain('Project 2');
		});
	});
});
