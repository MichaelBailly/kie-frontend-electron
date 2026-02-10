/**
 * Test helper for creating in-memory SQLite databases.
 *
 * Used by database repository tests (`src/lib/db/*.spec.ts`) to provide
 * a real SQLite backend for integration-testing SQL queries.
 *
 * Usage in test files:
 * ```typescript
 * vi.mock('./database.server', async () => {
 *   const { getTestDb, testPrepareStmt } = await import('$lib/test-utils/db-setup');
 *   return {
 *     getDb: () => getTestDb(),
 *     prepareStmt: (sql: string) => testPrepareStmt(sql)
 *   };
 * });
 *
 * import { resetTestDb, closeTestDb } from '$lib/test-utils/db-setup';
 * beforeEach(() => resetTestDb());
 * afterAll(() => closeTestDb());
 * ```
 */

import { createRequire } from 'node:module';
import type BetterSqlite3 from 'better-sqlite3';

// Use createRequire for native CJS module interop (same pattern as database.server.ts)
const nodeRequire = createRequire(import.meta.url);

/**
 * Schema DDL matching `database.server.ts`. Kept in sync manually.
 * If the production schema changes, update this constant to match.
 */
export const SCHEMA_DDL = `
	CREATE TABLE IF NOT EXISTS projects (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL DEFAULT 'New Project',
		is_open INTEGER NOT NULL DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS generations (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		project_id INTEGER NOT NULL,
		task_id TEXT,
		title TEXT NOT NULL,
		style TEXT NOT NULL,
		lyrics TEXT NOT NULL,
		status TEXT NOT NULL DEFAULT 'pending',
		error_message TEXT,
		track1_stream_url TEXT,
		track1_audio_url TEXT,
		track1_image_url TEXT,
		track1_duration REAL,
		track2_stream_url TEXT,
		track2_audio_url TEXT,
		track2_image_url TEXT,
		track2_duration REAL,
		track1_audio_id TEXT,
		track2_audio_id TEXT,
		response_data TEXT,
		extends_generation_id INTEGER,
		extends_audio_id TEXT,
		continue_at REAL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
		FOREIGN KEY (extends_generation_id) REFERENCES generations(id) ON DELETE SET NULL
	);

	CREATE INDEX IF NOT EXISTS idx_generations_project_id ON generations(project_id);
	CREATE INDEX IF NOT EXISTS idx_generations_task_id ON generations(task_id);
	CREATE INDEX IF NOT EXISTS idx_generations_extends ON generations(extends_generation_id);

	CREATE TABLE IF NOT EXISTS stem_separations (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		generation_id INTEGER NOT NULL,
		audio_id TEXT NOT NULL,
		task_id TEXT,
		type TEXT NOT NULL CHECK (type IN ('separate_vocal', 'split_stem')),
		status TEXT NOT NULL DEFAULT 'pending',
		error_message TEXT,
		vocal_url TEXT,
		instrumental_url TEXT,
		backing_vocals_url TEXT,
		drums_url TEXT,
		bass_url TEXT,
		guitar_url TEXT,
		keyboard_url TEXT,
		piano_url TEXT,
		percussion_url TEXT,
		strings_url TEXT,
		synth_url TEXT,
		fx_url TEXT,
		brass_url TEXT,
		woodwinds_url TEXT,
		response_data TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (generation_id) REFERENCES generations(id) ON DELETE CASCADE
	);

	CREATE INDEX IF NOT EXISTS idx_stem_separations_generation_audio ON stem_separations(generation_id, audio_id);
	CREATE INDEX IF NOT EXISTS idx_stem_separations_task_id ON stem_separations(task_id);

	CREATE TABLE IF NOT EXISTS settings (
		key TEXT PRIMARY KEY,
		value TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS variation_annotations (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		generation_id INTEGER NOT NULL,
		audio_id TEXT NOT NULL,
		starred INTEGER NOT NULL DEFAULT 0,
		comment TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (generation_id) REFERENCES generations(id) ON DELETE CASCADE,
		UNIQUE(generation_id, audio_id)
	);

	CREATE INDEX IF NOT EXISTS idx_variation_annotations_generation_audio ON variation_annotations(generation_id, audio_id);
	CREATE INDEX IF NOT EXISTS idx_variation_annotations_starred ON variation_annotations(starred);

	CREATE TABLE IF NOT EXISTS labels (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL UNIQUE,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_labels_last_used ON labels(last_used_at);

	CREATE TABLE IF NOT EXISTS variation_label_links (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		annotation_id INTEGER NOT NULL,
		label_id INTEGER NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (annotation_id) REFERENCES variation_annotations(id) ON DELETE CASCADE,
		FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE,
		UNIQUE(annotation_id, label_id)
	);

	CREATE INDEX IF NOT EXISTS idx_variation_label_links_annotation ON variation_label_links(annotation_id);
	CREATE INDEX IF NOT EXISTS idx_variation_label_links_label ON variation_label_links(label_id);
`;

// Module-level state (singleton per test worker)
let _testDb: BetterSqlite3.Database | null = null;
const _stmtCache = new Map<string, BetterSqlite3.Statement>();

/**
 * Get the current in-memory test database.
 * Throws if `resetTestDb()` hasn't been called yet.
 */
export function getTestDb(): BetterSqlite3.Database {
	if (!_testDb) {
		throw new Error('Test DB not initialized. Call resetTestDb() in beforeEach.');
	}
	return _testDb;
}

/**
 * Get a cached prepared statement from the test database.
 * Mirrors the signature of `prepareStmt` from `database.server.ts`.
 */
export function testPrepareStmt(sql: string): BetterSqlite3.Statement {
	const db = getTestDb();
	let stmt = _stmtCache.get(sql);
	if (!stmt) {
		stmt = db.prepare(sql);
		_stmtCache.set(sql, stmt);
	}
	return stmt;
}

/**
 * Create a fresh in-memory SQLite database with the full schema.
 * Call in `beforeEach` to ensure test isolation.
 */
export function resetTestDb(): void {
	if (_testDb) {
		_testDb.close();
	}
	const Database = nodeRequire('better-sqlite3');
	_testDb = new Database(':memory:') as BetterSqlite3.Database;
	_stmtCache.clear();
	_testDb.exec(SCHEMA_DDL);
}

/**
 * Close the test database and clean up.
 * Call in `afterAll` for explicit cleanup.
 */
export function closeTestDb(): void {
	if (_testDb) {
		_testDb.close();
		_testDb = null;
	}
	_stmtCache.clear();
}
