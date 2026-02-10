import type BetterSqlite3 from 'better-sqlite3';
import { dev } from '$app/environment';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

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
	console.log('Database path:', dbPath);

	_db = new Database(dbPath) as BetterSqlite3.Database;

	// Enable WAL mode for better performance
	_db.pragma('journal_mode = WAL');

	// Initialize database schema
	_db.exec(`
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
			-- Extend song tracking
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
			-- separate_vocal results
			vocal_url TEXT,
			instrumental_url TEXT,
			-- split_stem results
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
	`);

	// Migration: Add is_open column to existing projects table
	try {
		_db.exec(`ALTER TABLE projects ADD COLUMN is_open INTEGER NOT NULL DEFAULT 0`);
		// Set all existing projects as open for backwards compatibility
		_db.exec(`UPDATE projects SET is_open = 1`);
	} catch {
		// Column already exists, ignore error
	}

	return _db;
}
