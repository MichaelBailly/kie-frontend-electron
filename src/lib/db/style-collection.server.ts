import type { StyleCollection } from '$lib/types';
import { prepareStmt, getDb } from './database.server';

export function getAllStyles(): StyleCollection[] {
	const stmt = prepareStmt('SELECT * FROM style_collection ORDER BY updated_at DESC, name ASC');
	return stmt.all() as StyleCollection[];
}

export function getStyle(id: number): StyleCollection | undefined {
	const stmt = prepareStmt('SELECT * FROM style_collection WHERE id = ?');
	return stmt.get(id) as StyleCollection | undefined;
}

export function createStyle(
	name: string,
	style: string,
	description: string = ''
): StyleCollection {
	const stmt = prepareStmt(`
		INSERT INTO style_collection (name, description, style)
		VALUES (?, ?, ?)
		RETURNING *
	`);
	return stmt.get(name.trim(), description.trim(), style.trim()) as StyleCollection;
}

export function updateStyle(
	id: number,
	fields: Partial<Pick<StyleCollection, 'name' | 'description' | 'style'>>
): StyleCollection | undefined {
	const updates: string[] = [];
	const values: unknown[] = [];

	if (fields.name !== undefined) {
		updates.push('name = ?');
		values.push(fields.name.trim());
	}
	if (fields.description !== undefined) {
		updates.push('description = ?');
		values.push(fields.description.trim());
	}
	if (fields.style !== undefined) {
		updates.push('style = ?');
		values.push(fields.style.trim());
	}

	if (updates.length === 0) return getStyle(id);

	updates.push('updated_at = CURRENT_TIMESTAMP');
	values.push(id);

	const sql = `UPDATE style_collection SET ${updates.join(', ')} WHERE id = ? RETURNING *`;
	// Dynamic SQL — cannot use prepareStmt (cache-keyed by SQL string)
	const stmt = getDb().prepare(sql);
	return stmt.get(...values) as StyleCollection | undefined;
}

export function deleteStyle(id: number): void {
	const stmt = prepareStmt('DELETE FROM style_collection WHERE id = ?');
	stmt.run(id);
}

export function searchStyles(query: string, limit = 10): StyleCollection[] {
	const pattern = `%${query.toLowerCase()}%`;
	const stmt = prepareStmt(`
		SELECT * FROM style_collection
		WHERE lower(name) LIKE ? OR lower(description) LIKE ? OR lower(style) LIKE ?
		ORDER BY
			CASE WHEN lower(name) LIKE ? THEN 0 ELSE 1 END,
			updated_at DESC
		LIMIT ?
	`);
	return stmt.all(pattern, pattern, pattern, pattern, limit) as StyleCollection[];
}
