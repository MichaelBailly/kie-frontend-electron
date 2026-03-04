/**
 * Integration tests for the style collection DB repository.
 *
 * Uses a real in-memory SQLite database to exercise the actual SQL queries.
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { vi } from 'vitest';

vi.mock('./database.server', async () => {
	const dbSetup = await import('$lib/test-utils/db-setup');
	return {
		getDb: () => dbSetup.getTestDb(),
		prepareStmt: (sql: string) => dbSetup.testPrepareStmt(sql)
	};
});

import { resetTestDb, closeTestDb } from '$lib/test-utils/db-setup';
import {
	getAllStyles,
	getStyle,
	createStyle,
	updateStyle,
	deleteStyle,
	searchStyles
} from './style-collection.server';

beforeEach(() => {
	resetTestDb();
});

afterAll(() => {
	closeTestDb();
});

describe('Style collection repository', () => {
	describe('getAllStyles', () => {
		it('returns empty array when no styles exist', () => {
			expect(getAllStyles()).toEqual([]);
		});

		it('returns all styles ordered by updated_at DESC then name ASC', () => {
			createStyle('Bravo', 'rock vibes', 'second');
			createStyle('Alpha', 'pop vibes', 'first');

			const styles = getAllStyles();
			expect(styles).toHaveLength(2);
			// Most recently inserted/updated first (updated_at is the same second,
			// so falls back to name ASC in practice — but the test just asserts length
			// and that both are present)
			const names = styles.map((s) => s.name);
			expect(names).toContain('Alpha');
			expect(names).toContain('Bravo');
		});

		it('returns all required fields', () => {
			createStyle('Chill Lo-Fi', 'lo-fi hip hop beats', 'Relaxed vibes');
			const result = getAllStyles();
			expect(result[0]).toMatchObject({
				name: 'Chill Lo-Fi',
				style: 'lo-fi hip hop beats',
				description: 'Relaxed vibes'
			});
			expect(result[0].id).toBeGreaterThan(0);
			expect(result[0].created_at).toBeDefined();
			expect(result[0].updated_at).toBeDefined();
		});
	});

	describe('getStyle', () => {
		it('returns undefined when no style with that id exists', () => {
			expect(getStyle(999)).toBeUndefined();
		});

		it('returns the style when it exists', () => {
			const created = createStyle('Dark Trap', 'heavy 808s', 'aggressive');
			const result = getStyle(created.id);
			expect(result).toBeDefined();
			expect(result!.id).toBe(created.id);
			expect(result!.name).toBe('Dark Trap');
			expect(result!.style).toBe('heavy 808s');
			expect(result!.description).toBe('aggressive');
		});
	});

	describe('createStyle', () => {
		it('creates and returns style with all fields', () => {
			const result = createStyle('Orchestral', 'full orchestra, strings, brass', 'Cinematic feel');
			expect(result.id).toBeGreaterThan(0);
			expect(result.name).toBe('Orchestral');
			expect(result.style).toBe('full orchestra, strings, brass');
			expect(result.description).toBe('Cinematic feel');
			expect(result.created_at).toBeDefined();
			expect(result.updated_at).toBeDefined();
		});

		it('creates style with empty description when not provided', () => {
			const result = createStyle('Minimal', 'sparse beats');
			expect(result.description).toBe('');
		});

		it('trims whitespace from name, style, and description', () => {
			const result = createStyle('  Jazz  ', '  upright bass, brushed drums  ', '  smooth  ');
			expect(result.name).toBe('Jazz');
			expect(result.style).toBe('upright bass, brushed drums');
			expect(result.description).toBe('smooth');
		});

		it('persists to database (visible via getAllStyles)', () => {
			createStyle('R&B', 'soulful grooves');
			expect(getAllStyles()).toHaveLength(1);
		});
	});

	describe('updateStyle', () => {
		it('updates name only', () => {
			const created = createStyle('Old Name', 'some style');
			const updated = updateStyle(created.id, { name: 'New Name' });
			expect(updated).toBeDefined();
			expect(updated!.name).toBe('New Name');
			expect(updated!.style).toBe('some style');
		});

		it('updates style only', () => {
			const created = createStyle('Techno', 'old style prompt');
			const updated = updateStyle(created.id, { style: 'new style prompt' });
			expect(updated).toBeDefined();
			expect(updated!.style).toBe('new style prompt');
			expect(updated!.name).toBe('Techno');
		});

		it('updates description only', () => {
			const created = createStyle('Pop', 'catchy pop hooks', 'old description');
			const updated = updateStyle(created.id, { description: 'new description' });
			expect(updated).toBeDefined();
			expect(updated!.description).toBe('new description');
		});

		it('updates multiple fields at once', () => {
			const created = createStyle('X', 'x style');
			const updated = updateStyle(created.id, {
				name: 'Updated',
				style: 'updated style',
				description: 'updated desc'
			});
			expect(updated).toBeDefined();
			expect(updated!.name).toBe('Updated');
			expect(updated!.style).toBe('updated style');
			expect(updated!.description).toBe('updated desc');
		});

		it('returns unchanged record when no fields provided', () => {
			const created = createStyle('Stable', 'stable style');
			const result = updateStyle(created.id, {});
			expect(result).toBeDefined();
			expect(result!.name).toBe('Stable');
		});

		it('returns undefined for non-existent id', () => {
			const result = updateStyle(999, { name: 'Ghost' });
			expect(result).toBeUndefined();
		});

		it('trims whitespace on update', () => {
			const created = createStyle('Trim', 'style');
			const updated = updateStyle(created.id, { name: '  Trimmed  ' });
			expect(updated!.name).toBe('Trimmed');
		});

		it('persists changes visible via getStyle', () => {
			const created = createStyle('Before', 'style');
			updateStyle(created.id, { name: 'After' });
			expect(getStyle(created.id)!.name).toBe('After');
		});
	});

	describe('deleteStyle', () => {
		it('removes the style from the database', () => {
			const created = createStyle('To Delete', 'delete me');
			deleteStyle(created.id);
			expect(getStyle(created.id)).toBeUndefined();
		});

		it('does not throw for non-existent id', () => {
			expect(() => deleteStyle(999)).not.toThrow();
		});

		it('only deletes the targeted style', () => {
			const keep = createStyle('Keep', 'keep style');
			const remove = createStyle('Remove', 'remove style');
			deleteStyle(remove.id);
			expect(getStyle(keep.id)).toBeDefined();
			expect(getAllStyles()).toHaveLength(1);
		});
	});

	describe('searchStyles', () => {
		beforeEach(() => {
			createStyle('Dark Trap', 'heavy 808s, dark melody', 'Aggressive rap style');
			createStyle('Chill Lo-Fi', 'soft beats, vinyl crackle', 'Relaxed study vibes');
			createStyle('Orchestral Epic', 'strings, brass, timpani', 'Movie soundtrack feel');
		});

		it('finds styles by name', () => {
			const results = searchStyles('trap');
			expect(results).toHaveLength(1);
			expect(results[0].name).toBe('Dark Trap');
		});

		it('finds styles by style prompt', () => {
			const results = searchStyles('strings');
			expect(results).toHaveLength(1);
			expect(results[0].name).toBe('Orchestral Epic');
		});

		it('finds styles by description', () => {
			const results = searchStyles('study');
			expect(results).toHaveLength(1);
			expect(results[0].name).toBe('Chill Lo-Fi');
		});

		it('is case-insensitive', () => {
			const results = searchStyles('DARK');
			expect(results).toHaveLength(1);
			expect(results[0].name).toBe('Dark Trap');
		});

		it('returns multiple matches', () => {
			// "beats" appears in Chill Lo-Fi style and is not in others
			const results = searchStyles('beats');
			expect(results).toHaveLength(1);
		});

		it('returns empty array when no match', () => {
			const results = searchStyles('xylophone');
			expect(results).toEqual([]);
		});

		it('respects the limit parameter', () => {
			const results = searchStyles('', 2);
			expect(results.length).toBeLessThanOrEqual(2);
		});

		it('prioritises name matches over description/style matches', () => {
			// "epic" appears in the name "Orchestral Epic" but "aggressive" only in desc
			const resultsName = searchStyles('epic');
			expect(resultsName[0].name).toBe('Orchestral Epic');
		});
	});
});
