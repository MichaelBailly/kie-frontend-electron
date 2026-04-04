import type BetterSqlite3 from 'better-sqlite3';
import { dev } from '$app/environment';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { initializeDatabase } from './bootstrap.server';

// Lazy-load the database to avoid loading native module during build
let _db: BetterSqlite3.Database | null = null;

// Prepared statement cache — avoids re-parsing SQL on every call
const _stmtCache = new Map<string, BetterSqlite3.Statement>();

/**
 * Get a cached prepared statement for the given SQL.
 * If the statement hasn't been prepared yet, it will be prepared and cached.
 * Use this instead of `getDb().prepare(sql)` for static SQL queries.
 * For dynamic SQL (e.g., variable placeholder counts), use `getDb().prepare()` directly.
 */
export function prepareStmt(sql: string): BetterSqlite3.Statement {
	let stmt = _stmtCache.get(sql);
	if (!stmt) {
		stmt = getDb().prepare(sql);
		_stmtCache.set(sql, stmt);
	}
	return stmt;
}

function getDatabasePath(): string {
	if (process.env.DATABASE_PATH) {
		return process.env.DATABASE_PATH;
	}
	if (dev) {
		return 'kie-music.db';
	}
	// Fallback for production
	return path.join(process.cwd(), 'kie-music.db');
}

export function getDb(): BetterSqlite3.Database {
	if (_db) return _db;

	// Use createRequire to load native module in ESM context
	// In production Electron, resolve from app.asar.unpacked
	let modulePath = import.meta.url;
	if (process.env.ELECTRON_RESOURCES_PATH && !dev) {
		const unpackedModules = path.join(
			process.env.ELECTRON_RESOURCES_PATH,
			'app.asar.unpacked',
			'node_modules'
		);
		modulePath = pathToFileURL(path.join(unpackedModules, 'better-sqlite3', 'package.json')).href;
	}

	const require = createRequire(modulePath);
	const Database = require('better-sqlite3');
	const dbPath = getDatabasePath();

	_db = initializeDatabase(new Database(dbPath) as BetterSqlite3.Database);
	return _db;
}
