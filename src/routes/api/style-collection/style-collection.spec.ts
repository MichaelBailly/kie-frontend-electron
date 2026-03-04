/**
 * Integration tests for GET /api/style-collection and POST /api/style-collection.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createDbMock, type DbMock, createRequestEvent, resetFixtureIds } from '$lib/test-utils';

vi.mock('$lib/db.server', () => createDbMock());

let db: DbMock;

beforeEach(async () => {
	resetFixtureIds();
	db = (await import('$lib/db.server')) as unknown as DbMock;
	db.__reset();
});

// ---------------------------------------------------------------------------
// GET /api/style-collection
// ---------------------------------------------------------------------------

describe('GET /api/style-collection', () => {
	it('returns all styles when no query is provided', async () => {
		db.getAllStyles.mockReturnValue([
			{
				id: 1,
				name: 'Dark Trap',
				style: 'heavy 808s',
				description: '',
				created_at: '2026-01-01',
				updated_at: '2026-01-01'
			}
		]);

		const { GET } = await import('./+server');
		const event = createRequestEvent({
			method: 'GET',
			url: 'http://localhost/api/style-collection'
		});
		const response = await GET(event as never);
		const data = await response.json();

		expect(data.styles).toHaveLength(1);
		expect(data.styles[0].name).toBe('Dark Trap');
		expect(db.getAllStyles).toHaveBeenCalled();
		expect(db.searchStyles).not.toHaveBeenCalled();
	});

	it('calls searchStyles when q is provided', async () => {
		db.searchStyles.mockReturnValue([]);

		const { GET } = await import('./+server');
		const event = createRequestEvent({
			method: 'GET',
			url: 'http://localhost/api/style-collection?q=trap'
		});
		const response = await GET(event as never);
		const data = await response.json();

		expect(data.styles).toEqual([]);
		expect(db.searchStyles).toHaveBeenCalledWith('trap', 20);
		expect(db.getAllStyles).not.toHaveBeenCalled();
	});

	it('passes custom limit to searchStyles', async () => {
		db.searchStyles.mockReturnValue([]);

		const { GET } = await import('./+server');
		const event = createRequestEvent({
			method: 'GET',
			url: 'http://localhost/api/style-collection?q=pop&limit=5'
		});
		await GET(event as never);

		expect(db.searchStyles).toHaveBeenCalledWith('pop', 5);
	});

	it('throws 400 when limit is not a number', async () => {
		const { GET } = await import('./+server');
		const event = createRequestEvent({
			method: 'GET',
			url: 'http://localhost/api/style-collection?limit=abc'
		});

		await expect(GET(event as never)).rejects.toMatchObject({ status: 400 });
	});

	it('throws 400 when limit is below 1', async () => {
		const { GET } = await import('./+server');
		const event = createRequestEvent({
			method: 'GET',
			url: 'http://localhost/api/style-collection?limit=0'
		});

		await expect(GET(event as never)).rejects.toMatchObject({ status: 400 });
	});

	it('throws 400 when limit exceeds 100', async () => {
		const { GET } = await import('./+server');
		const event = createRequestEvent({
			method: 'GET',
			url: 'http://localhost/api/style-collection?limit=101'
		});

		await expect(GET(event as never)).rejects.toMatchObject({ status: 400 });
	});

	it('throws 400 when query is longer than 256 characters', async () => {
		const { GET } = await import('./+server');
		const longQuery = 'a'.repeat(257);
		const event = createRequestEvent({
			method: 'GET',
			url: `http://localhost/api/style-collection?q=${longQuery}`
		});

		await expect(GET(event as never)).rejects.toMatchObject({ status: 400 });
	});
});

// ---------------------------------------------------------------------------
// POST /api/style-collection
// ---------------------------------------------------------------------------

describe('POST /api/style-collection', () => {
	it('creates and returns a new style with 201 status', async () => {
		const created = {
			id: 1,
			name: 'Cinematic',
			style: 'epic strings',
			description: 'big sound',
			created_at: '2026-01-01',
			updated_at: '2026-01-01'
		};
		db.createStyle.mockReturnValue(created);

		const { POST } = await import('./+server');
		const event = createRequestEvent({
			method: 'POST',
			body: { name: 'Cinematic', style: 'epic strings', description: 'big sound' }
		});
		const response = await POST(event as never);

		expect(response.status).toBe(201);
		const data = await response.json();
		expect(data).toEqual(created);
		expect(db.createStyle).toHaveBeenCalledWith('Cinematic', 'epic strings', 'big sound');
	});

	it('uses empty string for description when not provided', async () => {
		db.createStyle.mockReturnValue({
			id: 1,
			name: 'Pop',
			style: 'upbeat',
			description: '',
			created_at: '2026-01-01',
			updated_at: '2026-01-01'
		});

		const { POST } = await import('./+server');
		const event = createRequestEvent({ method: 'POST', body: { name: 'Pop', style: 'upbeat' } });
		await POST(event as never);

		expect(db.createStyle).toHaveBeenCalledWith('Pop', 'upbeat', '');
	});

	it('throws 400 when body is invalid JSON', async () => {
		const { POST } = await import('./+server');
		const event = {
			request: new Request('http://localhost/test', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: '{invalid'
			}),
			params: {},
			url: new URL('http://localhost/test')
		};

		await expect(POST(event as never)).rejects.toMatchObject({ status: 400 });
	});

	it('throws 400 when name is missing', async () => {
		const { POST } = await import('./+server');
		const event = createRequestEvent({ method: 'POST', body: { style: 'some style' } });

		await expect(POST(event as never)).rejects.toMatchObject({ status: 400 });
	});

	it('throws 400 when name is empty string', async () => {
		const { POST } = await import('./+server');
		const event = createRequestEvent({
			method: 'POST',
			body: { name: '   ', style: 'some style' }
		});

		await expect(POST(event as never)).rejects.toMatchObject({ status: 400 });
	});

	it('throws 400 when style is missing', async () => {
		const { POST } = await import('./+server');
		const event = createRequestEvent({ method: 'POST', body: { name: 'Test' } });

		await expect(POST(event as never)).rejects.toMatchObject({ status: 400 });
	});

	it('throws 400 when style is empty string', async () => {
		const { POST } = await import('./+server');
		const event = createRequestEvent({
			method: 'POST',
			body: { name: 'Test', style: '   ' }
		});

		await expect(POST(event as never)).rejects.toMatchObject({ status: 400 });
	});

	it('throws 400 when name exceeds 100 characters', async () => {
		const { POST } = await import('./+server');
		const event = createRequestEvent({
			method: 'POST',
			body: { name: 'n'.repeat(101), style: 'valid style' }
		});

		await expect(POST(event as never)).rejects.toMatchObject({ status: 400 });
	});

	it('throws 400 when style exceeds 2000 characters', async () => {
		const { POST } = await import('./+server');
		const event = createRequestEvent({
			method: 'POST',
			body: { name: 'Test', style: 's'.repeat(2001) }
		});

		await expect(POST(event as never)).rejects.toMatchObject({ status: 400 });
	});

	it('throws 400 when description exceeds 500 characters', async () => {
		const { POST } = await import('./+server');
		const event = createRequestEvent({
			method: 'POST',
			body: { name: 'Test', style: 'valid', description: 'd'.repeat(501) }
		});

		await expect(POST(event as never)).rejects.toMatchObject({ status: 400 });
	});

	it('throws 400 when description is not a string', async () => {
		const { POST } = await import('./+server');
		const event = createRequestEvent({
			method: 'POST',
			body: { name: 'Test', style: 'valid', description: 42 }
		});

		await expect(POST(event as never)).rejects.toMatchObject({ status: 400 });
	});
});
