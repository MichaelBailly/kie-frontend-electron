import type { Project } from '$lib/types';
import { getDb } from './database.server';

export function createProject(name: string = 'New Project', isOpen: boolean = true): Project {
	const db = getDb();
	const stmt = db.prepare('INSERT INTO projects (name, is_open) VALUES (?, ?) RETURNING *');
	return stmt.get(name, isOpen ? 1 : 0) as Project;
}

export function getOpenProjects(): Project[] {
	const db = getDb();
	const stmt = db.prepare('SELECT * FROM projects WHERE is_open = 1 ORDER BY updated_at DESC');
	return stmt.all() as Project[];
}

export function setProjectOpen(id: number, isOpen: boolean): void {
	const db = getDb();
	const stmt = db.prepare('UPDATE projects SET is_open = ? WHERE id = ?');
	stmt.run(isOpen ? 1 : 0, id);
}

export function getProject(id: number): Project | undefined {
	const db = getDb();
	const stmt = db.prepare('SELECT * FROM projects WHERE id = ?');
	return stmt.get(id) as Project | undefined;
}

export function getAllProjects(): Project[] {
	const db = getDb();
	const stmt = db.prepare('SELECT * FROM projects ORDER BY updated_at DESC');
	return stmt.all() as Project[];
}

export function updateProjectName(id: number, name: string): void {
	const db = getDb();
	const stmt = db.prepare(
		'UPDATE projects SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
	);
	stmt.run(name, id);
}

export function deleteProject(id: number): void {
	const db = getDb();
	const stmt = db.prepare('DELETE FROM projects WHERE id = ?');
	stmt.run(id);
}
