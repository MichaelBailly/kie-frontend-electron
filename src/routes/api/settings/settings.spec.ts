/**
 * Integration tests for the settings API routes.
 *
 * - GET /api/settings — get masked API key info
 * - PUT /api/settings — set or clear API key
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createDbMock, type DbMock, createRequestEvent, resetFixtureIds } from '$lib/test-utils';

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
// GET /api/settings
// ---------------------------------------------------------------------------

describe('GET /api/settings', () => {
	it('returns hasApiKey false when no key is set', async () => {
		const { GET } = await import('./+server');
		const event = createRequestEvent({ method: 'GET' });
		const response = await GET(event as never);
		const data = await response.json();

		expect(data.hasApiKey).toBe(false);
		expect(data.apiKey).toBeNull();
	});

	it('returns masked API key when key is set', async () => {
		db.__setSettings({ kie_api_key: 'sk-1234567890abcdef' });

		const { GET } = await import('./+server');
		const event = createRequestEvent({ method: 'GET' });
		const response = await GET(event as never);
		const data = await response.json();

		expect(data.hasApiKey).toBe(true);
		// Masked: first 4 + stars + last 4
		expect(data.apiKey).toMatch(/^sk-1.*cdef$/);
		expect(data.apiKey).not.toBe('sk-1234567890abcdef');
	});

	it('masks short API keys completely', async () => {
		db.__setSettings({ kie_api_key: '12345678' });

		const { GET } = await import('./+server');
		const event = createRequestEvent({ method: 'GET' });
		const response = await GET(event as never);
		const data = await response.json();

		expect(data.hasApiKey).toBe(true);
		expect(data.apiKey).toBe('********');
	});
});

// ---------------------------------------------------------------------------
// PUT /api/settings
// ---------------------------------------------------------------------------

describe('PUT /api/settings', () => {
	it('throws 400 for invalid JSON body', async () => {
		const { PUT } = await import('./+server');
		const event = {
			request: new Request('http://localhost/test', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: '{invalid-json'
			}),
			params: {},
			url: new URL('http://localhost/test')
		};

		await expect(PUT(event as never)).rejects.toMatchObject({
			status: 400,
			body: { message: 'Invalid JSON body' }
		});
	});

	it('throws 400 when apiKey has invalid type', async () => {
		const { PUT } = await import('./+server');
		const event = createRequestEvent({
			method: 'PUT',
			body: { apiKey: 123 }
		});

		await expect(PUT(event as never)).rejects.toMatchObject({
			status: 400,
			body: { message: 'Invalid apiKey: must be a string or null' }
		});
	});

	it('sets the API key', async () => {
		const { PUT } = await import('./+server');
		const event = createRequestEvent({
			method: 'PUT',
			body: { apiKey: 'new-key-12345678' }
		});
		const response = await PUT(event as never);
		const data = await response.json();

		expect(data.success).toBe(true);
		expect(data.hasApiKey).toBe(true);
		expect(db.setApiKey).toHaveBeenCalledWith('new-key-12345678');
	});

	it('clears the API key when set to empty string', async () => {
		db.__setSettings({ kie_api_key: 'old-key' });

		const { PUT } = await import('./+server');
		const event = createRequestEvent({
			method: 'PUT',
			body: { apiKey: '' }
		});
		const response = await PUT(event as never);
		const data = await response.json();

		expect(data.success).toBe(true);
		expect(db.setSetting).toHaveBeenCalledWith('kie_api_key', '');
	});

	it('clears the API key when set to null', async () => {
		db.__setSettings({ kie_api_key: 'old-key' });

		const { PUT } = await import('./+server');
		const event = createRequestEvent({
			method: 'PUT',
			body: { apiKey: null }
		});
		const response = await PUT(event as never);
		const data = await response.json();

		expect(data.success).toBe(true);
		expect(db.setSetting).toHaveBeenCalledWith('kie_api_key', '');
	});

	it('does nothing when apiKey is not provided', async () => {
		db.__setSettings({ kie_api_key: 'existing-key' });

		const { PUT } = await import('./+server');
		const event = createRequestEvent({
			method: 'PUT',
			body: {}
		});
		const response = await PUT(event as never);
		const data = await response.json();

		expect(data.success).toBe(true);
		expect(data.hasApiKey).toBe(true);
		expect(db.setApiKey).not.toHaveBeenCalled();
		expect(db.setSetting).not.toHaveBeenCalled();
	});
});
