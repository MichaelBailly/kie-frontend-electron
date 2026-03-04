/**
 * Integration tests for the style collection individual-item API route.
 *
 * - GET    /api/style-collection/:id
 * - PATCH  /api/style-collection/:id
 * - DELETE /api/style-collection/:id
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createDbMock, type DbMock, createRequestEvent, resetFixtureIds } from '$lib/test-utils';

vi.mock('$lib/db.server', () => createDbMock());

let db: DbMock;

const STYLE_FIXTURE = {
	id: 1,
	name: 'Dark Trap',
	style: 'heavy 808s',
	description: 'aggressive',
	created_at: '2026-01-01T00:00:00.000Z',
	updated_at: '2026-01-01T00:00:00.000Z'
};

beforeEach(async () => {
	resetFixtureIds();
	db = (await import('$lib/db.server')) as unknown as DbMock;
	db.__reset();
});

// ---------------------------------------------------------------------------
// GET /api/style-collection/:id
// ---------------------------------------------------------------------------

describe('GET /api/style-collection/[id]', () => {
	it('returns the style when it exists', async () => {
		db.getStyle.mockReturnValue(STYLE_FIXTURE);

		const { GET } = await import('./+server');
		const event = createRequestEvent({
			method: 'GET',
			params: { id: '1' }
		});
		const response = await GET(event as never);
		const data = await response.json();

		expect(data).toEqual(STYLE_FIXTURE);
		expect(db.getStyle).toHaveBeenCalledWith(1);
	});

	it('throws 404 when style does not exist', async () => {
		db.getStyle.mockReturnValue(undefined);

		const { GET } = await import('./+server');
		const event = createRequestEvent({ method: 'GET', params: { id: '99' } });

		await expect(GET(event as never)).rejects.toMatchObject({ status: 404 });
	});

	it('throws 400 for non-integer id', async () => {
		const { GET } = await import('./+server');
		const event = createRequestEvent({ method: 'GET', params: { id: 'abc' } });

		await expect(GET(event as never)).rejects.toMatchObject({ status: 400 });
	});

	it('throws 400 for zero id', async () => {
		const { GET } = await import('./+server');
		const event = createRequestEvent({ method: 'GET', params: { id: '0' } });

		await expect(GET(event as never)).rejects.toMatchObject({ status: 400 });
	});

	it('throws 400 for negative id', async () => {
		const { GET } = await import('./+server');
		const event = createRequestEvent({ method: 'GET', params: { id: '-1' } });

		await expect(GET(event as never)).rejects.toMatchObject({ status: 400 });
	});
});

// ---------------------------------------------------------------------------
// PATCH /api/style-collection/:id
// ---------------------------------------------------------------------------

describe('PATCH /api/style-collection/[id]', () => {
	it('updates name and returns the updated style', async () => {
		db.getStyle.mockReturnValue(STYLE_FIXTURE);
		const updated = { ...STYLE_FIXTURE, name: 'New Name' };
		db.updateStyle.mockReturnValue(updated);

		const { PATCH } = await import('./+server');
		const event = createRequestEvent({
			method: 'PATCH',
			params: { id: '1' },
			body: { name: 'New Name' }
		});
		const response = await PATCH(event as never);
		const data = await response.json();

		expect(data.name).toBe('New Name');
		expect(db.updateStyle).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'New Name' }));
	});

	it('updates style prompt and description', async () => {
		db.getStyle.mockReturnValue(STYLE_FIXTURE);
		const updated = { ...STYLE_FIXTURE, style: 'new prompt', description: 'new desc' };
		db.updateStyle.mockReturnValue(updated);

		const { PATCH } = await import('./+server');
		const event = createRequestEvent({
			method: 'PATCH',
			params: { id: '1' },
			body: { style: 'new prompt', description: 'new desc' }
		});
		const response = await PATCH(event as never);
		const data = await response.json();

		expect(data.style).toBe('new prompt');
		expect(data.description).toBe('new desc');
	});

	it('throws 404 when style does not exist', async () => {
		db.getStyle.mockReturnValue(undefined);

		const { PATCH } = await import('./+server');
		const event = createRequestEvent({
			method: 'PATCH',
			params: { id: '99' },
			body: { name: 'Ghost' }
		});

		await expect(PATCH(event as never)).rejects.toMatchObject({ status: 404 });
	});

	it('throws 400 for invalid JSON body', async () => {
		db.getStyle.mockReturnValue(STYLE_FIXTURE);

		const { PATCH } = await import('./+server');
		const event = {
			request: new Request('http://localhost/test', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: '{invalid'
			}),
			params: { id: '1' },
			url: new URL('http://localhost/test')
		};

		await expect(PATCH(event as never)).rejects.toMatchObject({ status: 400 });
	});

	it('throws 400 when name is empty string', async () => {
		db.getStyle.mockReturnValue(STYLE_FIXTURE);

		const { PATCH } = await import('./+server');
		const event = createRequestEvent({
			method: 'PATCH',
			params: { id: '1' },
			body: { name: '   ' }
		});

		await expect(PATCH(event as never)).rejects.toMatchObject({ status: 400 });
	});

	it('throws 400 when name exceeds 100 characters', async () => {
		db.getStyle.mockReturnValue(STYLE_FIXTURE);

		const { PATCH } = await import('./+server');
		const event = createRequestEvent({
			method: 'PATCH',
			params: { id: '1' },
			body: { name: 'n'.repeat(101) }
		});

		await expect(PATCH(event as never)).rejects.toMatchObject({ status: 400 });
	});

	it('throws 400 when style is empty string', async () => {
		db.getStyle.mockReturnValue(STYLE_FIXTURE);

		const { PATCH } = await import('./+server');
		const event = createRequestEvent({
			method: 'PATCH',
			params: { id: '1' },
			body: { style: '' }
		});

		await expect(PATCH(event as never)).rejects.toMatchObject({ status: 400 });
	});

	it('throws 400 when style exceeds 2000 characters', async () => {
		db.getStyle.mockReturnValue(STYLE_FIXTURE);

		const { PATCH } = await import('./+server');
		const event = createRequestEvent({
			method: 'PATCH',
			params: { id: '1' },
			body: { style: 's'.repeat(2001) }
		});

		await expect(PATCH(event as never)).rejects.toMatchObject({ status: 400 });
	});

	it('throws 400 when description is not a string', async () => {
		db.getStyle.mockReturnValue(STYLE_FIXTURE);

		const { PATCH } = await import('./+server');
		const event = createRequestEvent({
			method: 'PATCH',
			params: { id: '1' },
			body: { description: 123 }
		});

		await expect(PATCH(event as never)).rejects.toMatchObject({ status: 400 });
	});

	it('throws 400 when description exceeds 500 characters', async () => {
		db.getStyle.mockReturnValue(STYLE_FIXTURE);

		const { PATCH } = await import('./+server');
		const event = createRequestEvent({
			method: 'PATCH',
			params: { id: '1' },
			body: { description: 'd'.repeat(501) }
		});

		await expect(PATCH(event as never)).rejects.toMatchObject({ status: 400 });
	});

	it('throws 400 for non-integer id', async () => {
		const { PATCH } = await import('./+server');
		const event = createRequestEvent({
			method: 'PATCH',
			params: { id: 'xyz' },
			body: { name: 'Test' }
		});

		await expect(PATCH(event as never)).rejects.toMatchObject({ status: 400 });
	});
});

// ---------------------------------------------------------------------------
// DELETE /api/style-collection/:id
// ---------------------------------------------------------------------------

describe('DELETE /api/style-collection/[id]', () => {
	it('deletes the style and returns 204', async () => {
		db.getStyle.mockReturnValue(STYLE_FIXTURE);

		const { DELETE } = await import('./+server');
		const event = createRequestEvent({ method: 'DELETE', params: { id: '1' } });
		const response = await DELETE(event as never);

		expect(response.status).toBe(204);
		expect(db.deleteStyle).toHaveBeenCalledWith(1);
	});

	it('throws 404 when style does not exist', async () => {
		db.getStyle.mockReturnValue(undefined);

		const { DELETE } = await import('./+server');
		const event = createRequestEvent({ method: 'DELETE', params: { id: '99' } });

		await expect(DELETE(event as never)).rejects.toMatchObject({ status: 404 });
	});

	it('throws 400 for non-integer id', async () => {
		const { DELETE } = await import('./+server');
		const event = createRequestEvent({ method: 'DELETE', params: { id: 'xyz' } });

		await expect(DELETE(event as never)).rejects.toMatchObject({ status: 400 });
	});

	it('does not call deleteStyle when style is not found', async () => {
		db.getStyle.mockReturnValue(undefined);

		const { DELETE } = await import('./+server');
		const event = createRequestEvent({ method: 'DELETE', params: { id: '99' } });

		await expect(DELETE(event as never)).rejects.toThrow();
		expect(db.deleteStyle).not.toHaveBeenCalled();
	});
});
