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
import { SCHEMA_DDL } from '$lib/db/bootstrap.server';

// Use createRequire for native CJS module interop (same pattern as database.server.ts)
const nodeRequire = createRequire(import.meta.url);

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
