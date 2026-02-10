/**
 * Integration tests for the labels API route.
 *
 * - GET /api/labels — get label suggestions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	createDbMock,
	type DbMock,
	createRequestEvent,
	resetFixtureIds
} from '$lib/test-utils';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('$lib/db.server', () => createDbMock());

let db: DbMock;

beforeEach(async () => {
	resetFixtureIds();
	db = (await import('$lib/db.server')) as unknown as DbMock;
	db.__reset();
});

// ---------------------------------------------------------------------------
// GET /api/labels
// ---------------------------------------------------------------------------

describe('GET /api/labels', () => {
	it('returns suggestions with default limit', async () => {
		db.getLabelSuggestions.mockReturnValue(['rock', 'rockabilly']);

		const { GET } = await import('./+server');
		const event = createRequestEvent({
			method: 'GET',
			url: 'http://localhost/api/labels?query=rock'
		});
		const response = await GET(event as never);
		const data = await response.json();

		expect(data.suggestions).toEqual(['rock', 'rockabilly']);
		expect(db.getLabelSuggestions).toHaveBeenCalledWith('rock', 8);
	});

	it('returns suggestions with custom limit', async () => {
		db.getLabelSuggestions.mockReturnValue(['pop']);

		const { GET } = await import('./+server');
		const event = createRequestEvent({
			method: 'GET',
			url: 'http://localhost/api/labels?query=pop&limit=5'
		});
		const response = await GET(event as never);
		const data = await response.json();

		expect(data.suggestions).toEqual(['pop']);
		expect(db.getLabelSuggestions).toHaveBeenCalledWith('pop', 5);
	});

	it('defaults to empty query when not provided', async () => {
		db.getLabelSuggestions.mockReturnValue([]);

		const { GET } = await import('./+server');
		const event = createRequestEvent({
			method: 'GET',
			url: 'http://localhost/api/labels'
		});
		const response = await GET(event as never);
		const data = await response.json();

		expect(data.suggestions).toEqual([]);
		expect(db.getLabelSuggestions).toHaveBeenCalledWith('', 8);
	});

	it('throws 400 when limit is out of range (too low)', async () => {
		const { GET } = await import('./+server');
		const event = createRequestEvent({
			method: 'GET',
			url: 'http://localhost/api/labels?query=x&limit=0'
		});

		await expect(GET(event as never)).rejects.toMatchObject({
			status: 400,
			body: { message: 'limit must be between 1 and 50' }
		});
	});

	it('throws 400 when limit is out of range (too high)', async () => {
		const { GET } = await import('./+server');
		const event = createRequestEvent({
			method: 'GET',
			url: 'http://localhost/api/labels?query=x&limit=51'
		});

		await expect(GET(event as never)).rejects.toMatchObject({
			status: 400,
			body: { message: 'limit must be between 1 and 50' }
		});
	});

	it('throws 400 when limit is NaN', async () => {
		const { GET } = await import('./+server');
		const event = createRequestEvent({
			method: 'GET',
			url: 'http://localhost/api/labels?query=x&limit=abc'
		});

		await expect(GET(event as never)).rejects.toMatchObject({
			status: 400,
			body: { message: 'limit must be between 1 and 50' }
		});
	});

	it('throws 400 when query exceeds 128 characters', async () => {
		const longQuery = 'a'.repeat(129);
		const { GET } = await import('./+server');
		const event = createRequestEvent({
			method: 'GET',
			url: `http://localhost/api/labels?query=${encodeURIComponent(longQuery)}`
		});

		await expect(GET(event as never)).rejects.toMatchObject({
			status: 400,
			body: { message: 'query must be 128 characters or less' }
		});
	});
});
