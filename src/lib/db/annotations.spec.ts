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
	getAnnotation,
	getAnnotationsForGeneration,
	getAnnotationsByProject,
	getStarredAnnotationsByProject,
	getAllNotableAnnotations,
	getAllAnnotationsWithLabels,
	getHighlightsCount,
	toggleStar,
	updateComment,
	setAnnotationLabels,
	getLabelSuggestions
} from './annotations.server';

let projectId: number;
let generationId: number;
const audioId1 = 'audio-001';
const audioId2 = 'audio-002';

beforeEach(() => {
	resetTestDb();
	projectId = createProject('Test Project').id;
	generationId = createGeneration(projectId, 'Test Song', 'pop', 'lyrics').id;
});

afterAll(() => {
	closeTestDb();
});

describe('Annotations repository', () => {
	describe('getAnnotation', () => {
		it('returns undefined when no annotation exists', () => {
			expect(getAnnotation(generationId, audioId1)).toBeUndefined();
		});

		it('returns annotation with empty labels array after creation', () => {
			toggleStar(generationId, audioId1);
			const ann = getAnnotation(generationId, audioId1);
			expect(ann).toBeDefined();
			expect(ann!.labels).toEqual([]);
		});

		it('returns annotation with populated labels', () => {
			setAnnotationLabels(generationId, audioId1, ['rock', 'energetic']);
			const ann = getAnnotation(generationId, audioId1);
			expect(ann).toBeDefined();
			expect(ann!.labels).toEqual(['energetic', 'rock']); // alphabetical order
		});
	});

	describe('toggleStar', () => {
		it('creates annotation with starred=1 when none exists', () => {
			const result = toggleStar(generationId, audioId1);
			expect(result.starred).toBe(1);
			expect(result.generation_id).toBe(generationId);
			expect(result.audio_id).toBe(audioId1);
		});

		it('toggles starred from 1 to 0', () => {
			toggleStar(generationId, audioId1); // starred = 1
			const result = toggleStar(generationId, audioId1); // starred = 0
			expect(result.starred).toBe(0);
		});

		it('toggles starred from 0 back to 1', () => {
			toggleStar(generationId, audioId1); // 1
			toggleStar(generationId, audioId1); // 0
			const result = toggleStar(generationId, audioId1); // 1
			expect(result.starred).toBe(1);
		});

		it('preserves existing comment when toggling', () => {
			updateComment(generationId, audioId1, 'My comment');
			toggleStar(generationId, audioId1);
			const ann = getAnnotation(generationId, audioId1)!;
			expect(ann.comment).toBe('My comment');
			expect(ann.starred).toBe(1);
		});
	});

	describe('updateComment', () => {
		it('creates annotation with comment when none exists', () => {
			const result = updateComment(generationId, audioId1, 'Great track!');
			expect(result.comment).toBe('Great track!');
		});

		it('updates existing comment', () => {
			updateComment(generationId, audioId1, 'First');
			const result = updateComment(generationId, audioId1, 'Updated');
			expect(result.comment).toBe('Updated');
		});

		it('stores null for empty string comment', () => {
			updateComment(generationId, audioId1, 'Something');
			const result = updateComment(generationId, audioId1, '');
			expect(result.comment).toBeNull();
		});

		it('preserves starred status when updating comment', () => {
			toggleStar(generationId, audioId1);
			updateComment(generationId, audioId1, 'With star');
			const ann = getAnnotation(generationId, audioId1)!;
			expect(ann.starred).toBe(1);
			expect(ann.comment).toBe('With star');
		});
	});

	describe('getAnnotationsForGeneration', () => {
		it('returns all annotations for a generation', () => {
			toggleStar(generationId, audioId1);
			updateComment(generationId, audioId2, 'Note');
			const anns = getAnnotationsForGeneration(generationId);
			expect(anns).toHaveLength(2);
		});

		it('returns empty array when no annotations exist', () => {
			expect(getAnnotationsForGeneration(generationId)).toEqual([]);
		});

		it('includes labels in results', () => {
			setAnnotationLabels(generationId, audioId1, ['chill']);
			const anns = getAnnotationsForGeneration(generationId);
			expect(anns[0].labels).toEqual(['chill']);
		});
	});

	describe('getAnnotationsByProject', () => {
		it('returns annotations across all generations in a project', () => {
			const gen2 = createGeneration(projectId, 'Song 2', 'rock', 'lyrics2');
			toggleStar(generationId, audioId1);
			toggleStar(gen2.id, 'audio-gen2');
			const anns = getAnnotationsByProject(projectId);
			expect(anns).toHaveLength(2);
		});

		it('does not include annotations from other projects', () => {
			const otherProject = createProject('Other');
			const otherGen = createGeneration(otherProject.id, 'Other Song', 'jazz', 'lyrics');
			toggleStar(generationId, audioId1);
			toggleStar(otherGen.id, 'audio-other');
			expect(getAnnotationsByProject(projectId)).toHaveLength(1);
		});
	});

	describe('getStarredAnnotationsByProject', () => {
		it('returns starred annotations', () => {
			toggleStar(generationId, audioId1); // starred
			const results = getStarredAnnotationsByProject(projectId);
			expect(results).toHaveLength(1);
			expect(results[0].starred).toBe(1);
		});

		it('returns annotations with comments', () => {
			updateComment(generationId, audioId1, 'A comment'); // not starred, but has comment
			const results = getStarredAnnotationsByProject(projectId);
			expect(results).toHaveLength(1);
			expect(results[0].comment).toBe('A comment');
		});

		it('excludes unstarred annotations with no comment', () => {
			// Create annotation via labels only — not starred, no comment
			setAnnotationLabels(generationId, audioId1, ['tag']);
			expect(getStarredAnnotationsByProject(projectId)).toEqual([]);
		});
	});

	describe('setAnnotationLabels', () => {
		it('creates annotation and attaches labels', () => {
			const result = setAnnotationLabels(generationId, audioId1, ['rock', 'energetic']);
			expect(result.labels).toEqual(['energetic', 'rock']); // sorted
		});

		it('normalizes labels to lowercase', () => {
			const result = setAnnotationLabels(generationId, audioId1, ['ROCK', 'Jazz']);
			expect(result.labels).toEqual(['jazz', 'rock']);
		});

		it('trims whitespace from labels', () => {
			const result = setAnnotationLabels(generationId, audioId1, ['  rock  ', ' pop ']);
			expect(result.labels).toEqual(['pop', 'rock']);
		});

		it('deduplicates labels', () => {
			const result = setAnnotationLabels(generationId, audioId1, ['rock', 'Rock', 'ROCK']);
			expect(result.labels).toEqual(['rock']);
		});

		it('filters out empty labels', () => {
			const result = setAnnotationLabels(generationId, audioId1, ['rock', '', '  ', 'pop']);
			expect(result.labels).toEqual(['pop', 'rock']);
		});

		it('replaces existing labels', () => {
			setAnnotationLabels(generationId, audioId1, ['rock', 'pop']);
			const result = setAnnotationLabels(generationId, audioId1, ['jazz', 'classical']);
			expect(result.labels).toEqual(['classical', 'jazz']);
		});

		it('clears all labels when given empty array', () => {
			setAnnotationLabels(generationId, audioId1, ['rock']);
			const result = setAnnotationLabels(generationId, audioId1, []);
			expect(result.labels).toEqual([]);
		});

		it('reuses existing label rows', () => {
			setAnnotationLabels(generationId, audioId1, ['rock']);
			setAnnotationLabels(generationId, audioId2, ['rock']);
			// Both annotations should reference the same label
			const ann1 = getAnnotation(generationId, audioId1)!;
			const ann2 = getAnnotation(generationId, audioId2)!;
			expect(ann1.labels).toEqual(['rock']);
			expect(ann2.labels).toEqual(['rock']);
		});

		it('preserves starred and comment when setting labels', () => {
			toggleStar(generationId, audioId1);
			updateComment(generationId, audioId1, 'My note');
			setAnnotationLabels(generationId, audioId1, ['favorite']);
			const ann = getAnnotation(generationId, audioId1)!;
			expect(ann.starred).toBe(1);
			expect(ann.comment).toBe('My note');
			expect(ann.labels).toEqual(['favorite']);
		});
	});

	describe('getLabelSuggestions', () => {
		it('returns empty array when no labels exist', () => {
			expect(getLabelSuggestions('')).toEqual([]);
		});

		it('returns all labels when query is empty', () => {
			setAnnotationLabels(generationId, audioId1, ['rock', 'pop', 'jazz']);
			const suggestions = getLabelSuggestions('');
			expect(suggestions).toHaveLength(3);
		});

		it('filters labels by prefix', () => {
			setAnnotationLabels(generationId, audioId1, ['rock', 'reggae', 'pop']);
			const suggestions = getLabelSuggestions('r');
			expect(suggestions).toHaveLength(2);
			expect(suggestions).toContain('rock');
			expect(suggestions).toContain('reggae');
		});

		it('is case-insensitive for query', () => {
			setAnnotationLabels(generationId, audioId1, ['rock']);
			const suggestions = getLabelSuggestions('R');
			expect(suggestions).toHaveLength(1);
			expect(suggestions[0]).toBe('rock');
		});

		it('respects the limit parameter', () => {
			setAnnotationLabels(generationId, audioId1, [
				'a',
				'b',
				'c',
				'd',
				'e',
				'f',
				'g',
				'h',
				'i',
				'j'
			]);
			const suggestions = getLabelSuggestions('', 3);
			expect(suggestions).toHaveLength(3);
		});

		it('defaults to limit of 8', () => {
			setAnnotationLabels(generationId, audioId1, [
				'a',
				'b',
				'c',
				'd',
				'e',
				'f',
				'g',
				'h',
				'i',
				'j'
			]);
			const suggestions = getLabelSuggestions('');
			expect(suggestions).toHaveLength(8);
		});
	});

	describe('getAllNotableAnnotations', () => {
		it('returns empty array when no annotations exist', () => {
			expect(getAllNotableAnnotations()).toEqual([]);
		});

		it('returns starred annotations across all projects', () => {
			const project2 = createProject('Project 2');
			const gen2 = createGeneration(project2.id, 'Song 2', 'rock', 'lyrics');
			toggleStar(generationId, audioId1);
			toggleStar(gen2.id, 'audio-gen2');
			const results = getAllNotableAnnotations();
			expect(results).toHaveLength(2);
		});

		it('returns annotations with comments', () => {
			updateComment(generationId, audioId1, 'A note');
			const results = getAllNotableAnnotations();
			expect(results).toHaveLength(1);
			expect(results[0].comment).toBe('A note');
		});

		it('includes project_id and project_name', () => {
			toggleStar(generationId, audioId1);
			const results = getAllNotableAnnotations();
			expect(results[0].project_id).toBe(projectId);
			expect(results[0].project_name).toBe('Test Project');
		});

		it('excludes annotations with only labels (no star or comment)', () => {
			setAnnotationLabels(generationId, audioId1, ['tag']);
			expect(getAllNotableAnnotations()).toEqual([]);
		});

		it('includes labels in results', () => {
			toggleStar(generationId, audioId1);
			setAnnotationLabels(generationId, audioId1, ['rock', 'favorite']);
			const results = getAllNotableAnnotations();
			expect(results[0].labels).toEqual(['favorite', 'rock']);
		});

		it('returns all notable annotations regardless of type', () => {
			toggleStar(generationId, audioId1);
			updateComment(generationId, audioId2, 'second');
			const results = getAllNotableAnnotations();
			expect(results).toHaveLength(2);
			const audioIds = results.map((r) => r.audio_id);
			expect(audioIds).toContain(audioId1);
			expect(audioIds).toContain(audioId2);
		});
	});

	describe('getAllAnnotationsWithLabels', () => {
		it('returns empty array when no labels exist', () => {
			expect(getAllAnnotationsWithLabels()).toEqual([]);
		});

		it('returns annotations that have labels', () => {
			setAnnotationLabels(generationId, audioId1, ['rock']);
			const results = getAllAnnotationsWithLabels();
			expect(results).toHaveLength(1);
			expect(results[0].labels).toEqual(['rock']);
		});

		it('excludes annotations without labels', () => {
			toggleStar(generationId, audioId1); // starred but no labels
			setAnnotationLabels(generationId, audioId2, ['pop']);
			const results = getAllAnnotationsWithLabels();
			expect(results).toHaveLength(1);
			expect(results[0].audio_id).toBe(audioId2);
		});

		it('includes project_id and project_name', () => {
			setAnnotationLabels(generationId, audioId1, ['rock']);
			const results = getAllAnnotationsWithLabels();
			expect(results[0].project_id).toBe(projectId);
			expect(results[0].project_name).toBe('Test Project');
		});

		it('spans multiple projects', () => {
			const project2 = createProject('Project 2');
			const gen2 = createGeneration(project2.id, 'Song 2', 'rock', 'lyrics');
			setAnnotationLabels(generationId, audioId1, ['rock']);
			setAnnotationLabels(gen2.id, 'audio-gen2', ['jazz']);
			const results = getAllAnnotationsWithLabels();
			expect(results).toHaveLength(2);
			const projectNames = results.map((r) => r.project_name);
			expect(projectNames).toContain('Test Project');
			expect(projectNames).toContain('Project 2');
		});
	});

	describe('getHighlightsCount', () => {
		it('returns 0 when no notable annotations exist', () => {
			expect(getHighlightsCount()).toBe(0);
		});

		it('counts starred annotations', () => {
			toggleStar(generationId, audioId1);
			expect(getHighlightsCount()).toBe(1);
		});

		it('counts annotations with comments', () => {
			updateComment(generationId, audioId1, 'My note');
			expect(getHighlightsCount()).toBe(1);
		});

		it('counts starred + commented as one if same annotation', () => {
			toggleStar(generationId, audioId1);
			updateComment(generationId, audioId1, 'My note');
			expect(getHighlightsCount()).toBe(1);
		});

		it('does not count label-only annotations', () => {
			setAnnotationLabels(generationId, audioId1, ['tag']);
			expect(getHighlightsCount()).toBe(0);
		});

		it('counts across projects', () => {
			const project2 = createProject('Project 2');
			const gen2 = createGeneration(project2.id, 'Song 2', 'rock', 'lyrics');
			toggleStar(generationId, audioId1);
			toggleStar(gen2.id, 'audio-gen2');
			expect(getHighlightsCount()).toBe(2);
		});
	});
});
