import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';

vi.mock('$lib/db/database.server', async () => {
	const dbSetup = await import('$lib/test-utils/db-setup');
	return {
		getDb: () => dbSetup.getTestDb(),
		prepareStmt: (sql: string) => dbSetup.testPrepareStmt(sql)
	};
});

import { resetTestDb, closeTestDb } from '$lib/test-utils/db-setup';
import { createProject } from '$lib/db/projects.server';
import { createGeneration, setCompleted, createExtendGeneration } from '$lib/db/generations.server';
import { toggleStar, updateComment, setAnnotationLabels } from '$lib/db/annotations.server';
import { createStemSeparation } from '$lib/db/stem-separations.server';
import { setCompleted as setStemCompleted } from '$lib/db/stem-separations.server';
import { load } from './+page.server';
import type { HighlightVariation, HighlightStem, HighlightExtension } from './+page.server';

interface LoadResult {
	starred: HighlightVariation[];
	noted: HighlightVariation[];
	labeled: HighlightVariation[];
	stems: HighlightStem[];
	extensions: HighlightExtension[];
	totalCount: number;
}

async function loadHighlights(): Promise<LoadResult> {
	return (await load({} as never)) as unknown as LoadResult;
}

let projectId: number;

const trackData1 = {
	streamUrl: 'http://s1',
	audioUrl: 'http://a1',
	imageUrl: 'http://i1',
	duration: 180,
	audioId: 'aid1'
};
const trackData2 = {
	streamUrl: 'http://s2',
	audioUrl: 'http://a2',
	imageUrl: 'http://i2',
	duration: 185,
	audioId: 'aid2'
};

beforeEach(() => {
	resetTestDb();
	projectId = createProject('Test Project').id;
});

afterAll(() => {
	closeTestDb();
});

describe('Highlights page load', () => {
	it('returns empty arrays when no highlights exist', async () => {
		const result = await loadHighlights();
		expect(result.starred).toEqual([]);
		expect(result.noted).toEqual([]);
		expect(result.labeled).toEqual([]);
		expect(result.stems).toEqual([]);
		expect(result.extensions).toEqual([]);
		expect(result.totalCount).toBe(0);
	});

	describe('starred', () => {
		it('returns starred variations with song data', async () => {
			const gen = createGeneration(projectId, 'Song', 'pop', 'lyrics');
			setCompleted(gen.id, trackData1, trackData2, '{}');
			toggleStar(gen.id, 'aid1');

			const result = await loadHighlights();
			expect(result.starred).toHaveLength(1);
			expect(result.starred[0].annotation.starred).toBe(1);
			expect(result.starred[0].song.id).toBe('aid1');
			expect(result.starred[0].song.trackNumber).toBe(1);
			expect(result.starred[0].song.streamUrl).toBe('http://s1');
			expect(result.starred[0].generation.title).toBe('Song');
		});

		it('maps track 2 correctly', async () => {
			const gen = createGeneration(projectId, 'Song', 'pop', 'lyrics');
			setCompleted(gen.id, trackData1, trackData2, '{}');
			toggleStar(gen.id, 'aid2');

			const result = await loadHighlights();
			expect(result.starred).toHaveLength(1);
			expect(result.starred[0].song.trackNumber).toBe(2);
			expect(result.starred[0].song.streamUrl).toBe('http://s2');
		});

		it('includes project info on annotation', async () => {
			const gen = createGeneration(projectId, 'Song', 'pop', 'lyrics');
			setCompleted(gen.id, trackData1, trackData2, '{}');
			toggleStar(gen.id, 'aid1');

			const result = await loadHighlights();
			expect(result.starred[0].annotation.project_name).toBe('Test Project');
			expect(result.starred[0].annotation.project_id).toBe(projectId);
		});
	});

	describe('noted', () => {
		it('returns variations with comments', async () => {
			const gen = createGeneration(projectId, 'Song', 'pop', 'lyrics');
			setCompleted(gen.id, trackData1, trackData2, '{}');
			updateComment(gen.id, 'aid1', 'Great bass line');

			const result = await loadHighlights();
			expect(result.noted).toHaveLength(1);
			expect(result.noted[0].annotation.comment).toBe('Great bass line');
		});

		it('excludes star-only annotations from noted', async () => {
			const gen = createGeneration(projectId, 'Song', 'pop', 'lyrics');
			setCompleted(gen.id, trackData1, trackData2, '{}');
			toggleStar(gen.id, 'aid1'); // star but no comment

			const result = await loadHighlights();
			expect(result.noted).toHaveLength(0);
		});
	});

	describe('labeled', () => {
		it('returns variations with labels', async () => {
			const gen = createGeneration(projectId, 'Song', 'pop', 'lyrics');
			setCompleted(gen.id, trackData1, trackData2, '{}');
			setAnnotationLabels(gen.id, 'aid1', ['rock', 'energetic']);

			const result = await loadHighlights();
			expect(result.labeled).toHaveLength(1);
			expect(result.labeled[0].annotation.labels).toEqual(['energetic', 'rock']);
		});
	});

	describe('stems', () => {
		it('returns completed stem separations', async () => {
			const gen = createGeneration(projectId, 'Song', 'pop', 'lyrics');
			setCompleted(gen.id, trackData1, trackData2, '{}');
			const sep = createStemSeparation(gen.id, 'aid1', 'separate_vocal');
			setStemCompleted(sep.id, { vocalUrl: 'http://vocal' }, '{}');

			const result = await loadHighlights();
			expect(result.stems).toHaveLength(1);
			expect(result.stems[0].stemSeparation.type).toBe('separate_vocal');
			expect(result.stems[0].stemSeparation.project_name).toBe('Test Project');
			expect(result.stems[0].song.id).toBe('aid1');
		});

		it('excludes pending stem separations', async () => {
			const gen = createGeneration(projectId, 'Song', 'pop', 'lyrics');
			setCompleted(gen.id, trackData1, trackData2, '{}');
			createStemSeparation(gen.id, 'aid1', 'separate_vocal'); // pending

			const result = await loadHighlights();
			expect(result.stems).toHaveLength(0);
		});
	});

	describe('extensions', () => {
		it('returns parent generations with extensions', async () => {
			const parent = createGeneration(projectId, 'Parent', 'pop', 'lyrics');
			setCompleted(parent.id, trackData1, trackData2, '{}');
			createExtendGeneration(projectId, 'Child', 'pop', 'l', parent.id, 'aid1', 60);

			const result = await loadHighlights();
			expect(result.extensions).toHaveLength(1);
			expect(result.extensions[0].generation.title).toBe('Parent');
			expect(result.extensions[0].generation.extension_count).toBe(1);
			expect(result.extensions[0].songs).toHaveLength(2); // both tracks
		});

		it('does not return unextended generations', async () => {
			createGeneration(projectId, 'No Extensions', 'pop', 'lyrics');

			const result = await loadHighlights();
			expect(result.extensions).toHaveLength(0);
		});
	});

	describe('totalCount', () => {
		it('sums all sections', async () => {
			const gen = createGeneration(projectId, 'Song', 'pop', 'lyrics');
			setCompleted(gen.id, trackData1, trackData2, '{}');

			// starred: 1
			toggleStar(gen.id, 'aid1');
			// noted: 1 (same annotation, comment)
			updateComment(gen.id, 'aid1', 'note');
			// labeled: 1 (different track)
			setAnnotationLabels(gen.id, 'aid2', ['tag']);
			// stems: 1
			const sep = createStemSeparation(gen.id, 'aid2', 'separate_vocal');
			setStemCompleted(sep.id, { vocalUrl: 'http://v' }, '{}');
			// extensions: need a parent
			const parent = createGeneration(projectId, 'Parent', 'pop', 'l');
			setCompleted(
				parent.id,
				{
					streamUrl: 'http://ps1',
					audioUrl: 'http://pa1',
					imageUrl: 'http://pi1',
					duration: 100,
					audioId: 'paid1'
				},
				{
					streamUrl: 'http://ps2',
					audioUrl: 'http://pa2',
					imageUrl: 'http://pi2',
					duration: 100,
					audioId: 'paid2'
				},
				'{}'
			);
			createExtendGeneration(projectId, 'Ext', 'pop', 'l', parent.id, 'paid1', 60);

			const result = await loadHighlights();
			// starred: 1, noted: 1, labeled: 1, stems: 1, extensions: 1
			expect(result.totalCount).toBe(5);
		});
	});

	describe('cross-project', () => {
		it('aggregates data from multiple projects', async () => {
			const project2 = createProject('Project 2');
			const gen1 = createGeneration(projectId, 'Song 1', 'pop', 'lyrics');
			const gen2 = createGeneration(project2.id, 'Song 2', 'rock', 'lyrics');
			setCompleted(gen1.id, trackData1, trackData2, '{}');
			setCompleted(
				gen2.id,
				{
					streamUrl: 'http://p2s1',
					audioUrl: 'http://p2a1',
					imageUrl: 'http://p2i1',
					duration: 200,
					audioId: 'p2aid1'
				},
				{
					streamUrl: 'http://p2s2',
					audioUrl: 'http://p2a2',
					imageUrl: 'http://p2i2',
					duration: 200,
					audioId: 'p2aid2'
				},
				'{}'
			);

			toggleStar(gen1.id, 'aid1');
			toggleStar(gen2.id, 'p2aid1');

			const result = await loadHighlights();
			expect(result.starred).toHaveLength(2);
			const projectNames = result.starred.map((s) => s.annotation.project_name);
			expect(projectNames).toContain('Test Project');
			expect(projectNames).toContain('Project 2');
		});
	});
});
