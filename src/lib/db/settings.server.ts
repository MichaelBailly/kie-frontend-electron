import type { Setting } from '$lib/types';
import { prepareStmt } from './database.server';

export function getSetting(key: string): string | null {
	const stmt = prepareStmt('SELECT value FROM settings WHERE key = ?');
	const result = stmt.get(key) as { value: string } | undefined;
	return result?.value ?? null;
}

export function setSetting(key: string, value: string): void {
	const stmt = prepareStmt(`
		INSERT INTO settings (key, value, updated_at) 
		VALUES (?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
	`);
	stmt.run(key, value);
}

export function deleteSetting(key: string): void {
	const stmt = prepareStmt('DELETE FROM settings WHERE key = ?');
	stmt.run(key);
}

export function getAllSettings(): Setting[] {
	const stmt = prepareStmt('SELECT * FROM settings ORDER BY key');
	return stmt.all() as Setting[];
}

// Specific settings helpers
export function getApiKey(): string | null {
	return getSetting('kie_api_key');
}

export function setApiKey(apiKey: string): void {
	setSetting('kie_api_key', apiKey);
}
