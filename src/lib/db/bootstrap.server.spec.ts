import { afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import type BetterSqlite3 from 'better-sqlite3';
import { initializeDatabase } from './bootstrap.server';

const nodeRequire = createRequire(import.meta.url);

let db: BetterSqlite3.Database | null = null;

function createDb(): BetterSqlite3.Database {
	const Database = nodeRequire('better-sqlite3');
	db = new Database(':memory:') as BetterSqlite3.Database;
	return db;
}

function tableExists(database: BetterSqlite3.Database, tableName: string): boolean {
	const row = database
		.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`)
		.get(tableName) as { name: string } | undefined;
	return row?.name === tableName;
}

function getColumnNames(database: BetterSqlite3.Database, tableName: string): string[] {
	return (database.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>).map(
		(column) => column.name
	);
}

afterEach(() => {
	db?.close();
	db = null;
});

describe('initializeDatabase', () => {
	it('creates the full application schema', () => {
		const database = createDb();

		initializeDatabase(database);

		expect(tableExists(database, 'projects')).toBe(true);
		expect(tableExists(database, 'generations')).toBe(true);
		expect(tableExists(database, 'stem_separations')).toBe(true);
		expect(tableExists(database, 'wav_conversions')).toBe(true);
		expect(tableExists(database, 'variation_annotations')).toBe(true);
		expect(tableExists(database, 'style_collection')).toBe(true);
		expect(getColumnNames(database, 'projects')).toContain('is_open');
		expect(getColumnNames(database, 'generations')).toContain('model');
	});

	it('backfills legacy projects as open when adding is_open', () => {
		const database = createDb();
		database.exec(`
			CREATE TABLE projects (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				name TEXT NOT NULL DEFAULT 'New Project',
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
			);
		`);
		database.prepare(`INSERT INTO projects (name) VALUES ('Legacy Project')`).run();

		initializeDatabase(database);

		const row = database.prepare(`SELECT is_open FROM projects`).get() as { is_open: number };
		expect(row.is_open).toBe(1);
	});

	it('marks extended legacy generations with the extend type during migration', () => {
		const database = createDb();
		database.exec(`
			CREATE TABLE projects (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				name TEXT NOT NULL DEFAULT 'New Project',
				is_open INTEGER NOT NULL DEFAULT 1,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
			);

			CREATE TABLE generations (
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
				extends_generation_id INTEGER,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
			);

			CREATE INDEX idx_generations_project_id ON generations(project_id);
			CREATE INDEX idx_generations_task_id ON generations(task_id);
			CREATE INDEX idx_generations_extends ON generations(extends_generation_id);
		`);
		database.prepare(`INSERT INTO projects (name) VALUES ('Project')`).run();
		database
			.prepare(
				`INSERT INTO generations (project_id, title, style, lyrics, status, extends_generation_id)
				 VALUES (?, ?, ?, ?, ?, ?)`
			)
			.run(1, 'Extended Song', 'pop', 'lyrics', 'completed', 42);

		initializeDatabase(database);

		const row = database.prepare(`SELECT generation_type FROM generations`).get() as {
			generation_type: string;
		};
		expect(row.generation_type).toBe('extend');
	});
});
