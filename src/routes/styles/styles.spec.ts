/**
 * Tests for the styles page server load function.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createDbMock, type DbMock, resetFixtureIds } from '$lib/test-utils';
import type { StyleCollection } from '$lib/types';

vi.mock('$lib/db.server', () => createDbMock());

interface LoadResult {
	styles: StyleCollection[];
}

let db: DbMock;

beforeEach(async () => {
	resetFixtureIds();
	db = (await import('$lib/db.server')) as unknown as DbMock;
	db.__reset();
});

describe('Styles page load', () => {
	it('returns empty styles array when collection is empty', async () => {
		db.getAllStyles.mockReturnValue([]);

		const { load } = await import('./+page.server');
		const result = (await load({} as never)) as unknown as LoadResult;

		expect(result.styles).toEqual([]);
	});

	it('returns all styles from the collection', async () => {
		const styles = [
			{
				id: 1,
				name: 'Dark Trap',
				style: 'heavy 808s',
				description: '',
				created_at: '2026-01-01',
				updated_at: '2026-01-01'
			},
			{
				id: 2,
				name: 'Lo-Fi',
				style: 'soft beats',
				description: 'chill',
				created_at: '2026-01-02',
				updated_at: '2026-01-02'
			}
		];
		db.getAllStyles.mockReturnValue(styles);

		const { load } = await import('./+page.server');
		const result = (await load({} as never)) as unknown as LoadResult;

		expect(result.styles).toHaveLength(2);
		expect(result.styles[0].name).toBe('Dark Trap');
		expect(result.styles[1].name).toBe('Lo-Fi');
	});

	it('calls getAllStyles exactly once', async () => {
		db.getAllStyles.mockReturnValue([]);

		const { load } = await import('./+page.server');
		await load({} as never);

		expect(db.getAllStyles).toHaveBeenCalledTimes(1);
	});
});
