import type BetterSqlite3 from 'better-sqlite3';

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
		track1_audio_local_url TEXT,
		track1_image_local_url TEXT,
		track1_duration REAL,
		track2_stream_url TEXT,
		track2_audio_url TEXT,
		track2_image_url TEXT,
		track2_audio_local_url TEXT,
		track2_image_local_url TEXT,
		track2_duration REAL,
		track1_audio_id TEXT,
		track2_audio_id TEXT,
		response_data TEXT,
		extends_generation_id INTEGER,
		extends_audio_id TEXT,
		continue_at REAL,
		extends_stem_type TEXT,
		extends_stem_url TEXT,
		instrumental INTEGER NOT NULL DEFAULT 0,
		generation_type TEXT NOT NULL DEFAULT 'generate',
		negative_tags TEXT,
		source_audio_local_url TEXT,
		model TEXT NOT NULL DEFAULT 'V5',
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

	CREATE TABLE IF NOT EXISTS wav_conversions (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		generation_id INTEGER NOT NULL,
		audio_id TEXT NOT NULL,
		task_id TEXT,
		status TEXT NOT NULL DEFAULT 'pending',
		error_message TEXT,
		wav_url TEXT,
		response_data TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (generation_id) REFERENCES generations(id) ON DELETE CASCADE
	);

	CREATE INDEX IF NOT EXISTS idx_wav_conversions_generation_audio ON wav_conversions(generation_id, audio_id);
	CREATE INDEX IF NOT EXISTS idx_wav_conversions_task_id ON wav_conversions(task_id);

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

	CREATE TABLE IF NOT EXISTS style_collection (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		description TEXT NOT NULL DEFAULT '',
		style TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_style_collection_name ON style_collection(name);
`;

function columnExists(db: BetterSqlite3.Database, tableName: string, columnName: string): boolean {
	const rows = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
	return rows.some((row) => row.name === columnName);
}

function addColumnIfMissing(
	db: BetterSqlite3.Database,
	tableName: string,
	columnName: string,
	definition: string
): void {
	if (columnExists(db, tableName, columnName)) {
		return;
	}

	db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
}

export function initializeDatabase(db: BetterSqlite3.Database): BetterSqlite3.Database {
	db.pragma('journal_mode = WAL');
	db.exec(SCHEMA_DDL);

	const hasProjectIsOpen = columnExists(db, 'projects', 'is_open');
	addColumnIfMissing(db, 'projects', 'is_open', 'INTEGER NOT NULL DEFAULT 0');
	if (!hasProjectIsOpen) {
		db.exec(`UPDATE projects SET is_open = 1`);
	}

	addColumnIfMissing(db, 'generations', 'track1_audio_id', 'TEXT');
	addColumnIfMissing(db, 'generations', 'track2_audio_id', 'TEXT');
	addColumnIfMissing(db, 'generations', 'response_data', 'TEXT');
	addColumnIfMissing(db, 'generations', 'extends_generation_id', 'INTEGER');
	addColumnIfMissing(db, 'generations', 'extends_audio_id', 'TEXT');
	addColumnIfMissing(db, 'generations', 'continue_at', 'REAL');
	addColumnIfMissing(db, 'generations', 'extends_stem_type', 'TEXT');
	addColumnIfMissing(db, 'generations', 'extends_stem_url', 'TEXT');
	addColumnIfMissing(db, 'generations', 'track1_audio_local_url', 'TEXT');
	addColumnIfMissing(db, 'generations', 'track1_image_local_url', 'TEXT');
	addColumnIfMissing(db, 'generations', 'track2_audio_local_url', 'TEXT');
	addColumnIfMissing(db, 'generations', 'track2_image_local_url', 'TEXT');
	addColumnIfMissing(db, 'generations', 'instrumental', 'INTEGER NOT NULL DEFAULT 0');
	addColumnIfMissing(db, 'generations', 'generation_type', "TEXT NOT NULL DEFAULT 'generate'");
	addColumnIfMissing(db, 'generations', 'negative_tags', 'TEXT');
	addColumnIfMissing(db, 'generations', 'source_audio_local_url', 'TEXT');
	addColumnIfMissing(db, 'generations', 'model', "TEXT NOT NULL DEFAULT 'V5'");

	db.exec(`
		UPDATE generations
		SET generation_type = 'extend'
		WHERE extends_generation_id IS NOT NULL AND generation_type = 'generate'
	`);

	return db;
}
