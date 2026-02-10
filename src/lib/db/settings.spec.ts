import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';

vi.mock('./database.server', async () => {
	const dbSetup = await import('$lib/test-utils/db-setup');
	return {
		getDb: () => dbSetup.getTestDb(),
		prepareStmt: (sql: string) => dbSetup.testPrepareStmt(sql)
	};
});

import { resetTestDb, closeTestDb } from '$lib/test-utils/db-setup';
import {
	getSetting,
	setSetting,
	deleteSetting,
	getAllSettings,
	getApiKey,
	setApiKey
} from './settings.server';

beforeEach(() => {
	resetTestDb();
});

afterAll(() => {
	closeTestDb();
});

describe('Settings repository', () => {
	describe('getSetting', () => {
		it('returns null for non-existent key', () => {
			expect(getSetting('nonexistent')).toBeNull();
		});

		it('returns value for existing key', () => {
			setSetting('test_key', 'test_value');
			expect(getSetting('test_key')).toBe('test_value');
		});
	});

	describe('setSetting', () => {
		it('creates a new setting', () => {
			setSetting('new_key', 'new_value');
			expect(getSetting('new_key')).toBe('new_value');
		});

		it('updates an existing setting via upsert', () => {
			setSetting('key', 'value1');
			setSetting('key', 'value2');
			expect(getSetting('key')).toBe('value2');
		});

		it('does not create duplicate rows on upsert', () => {
			setSetting('key', 'v1');
			setSetting('key', 'v2');
			const all = getAllSettings();
			expect(all.filter((s) => s.key === 'key')).toHaveLength(1);
		});
	});

	describe('deleteSetting', () => {
		it('removes an existing setting', () => {
			setSetting('key', 'value');
			deleteSetting('key');
			expect(getSetting('key')).toBeNull();
		});

		it('does nothing for non-existent key', () => {
			expect(() => deleteSetting('nonexistent')).not.toThrow();
		});
	});

	describe('getAllSettings', () => {
		it('returns empty array when no settings exist', () => {
			expect(getAllSettings()).toEqual([]);
		});

		it('returns all settings sorted by key', () => {
			setSetting('z_key', 'z_value');
			setSetting('a_key', 'a_value');
			setSetting('m_key', 'm_value');
			const settings = getAllSettings();
			expect(settings).toHaveLength(3);
			expect(settings.map((s) => s.key)).toEqual(['a_key', 'm_key', 'z_key']);
		});

		it('includes created_at and updated_at timestamps', () => {
			setSetting('key', 'value');
			const [setting] = getAllSettings();
			expect(setting.created_at).toBeDefined();
			expect(setting.updated_at).toBeDefined();
		});
	});

	describe('getApiKey / setApiKey', () => {
		it('returns null when no API key is set', () => {
			expect(getApiKey()).toBeNull();
		});

		it('stores and retrieves API key', () => {
			setApiKey('test-api-key-12345');
			expect(getApiKey()).toBe('test-api-key-12345');
		});

		it('updates existing API key', () => {
			setApiKey('first-key');
			setApiKey('second-key');
			expect(getApiKey()).toBe('second-key');
		});

		it('uses kie_api_key as the settings key', () => {
			setApiKey('my-key');
			expect(getSetting('kie_api_key')).toBe('my-key');
		});
	});
});
