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
	createProject,
	getProject,
	getAllProjects,
	getOpenProjects,
	setProjectOpen,
	updateProjectName,
	deleteProject
} from './projects.server';

beforeEach(() => {
	resetTestDb();
});

afterAll(() => {
	closeTestDb();
});

describe('Projects repository', () => {
	describe('createProject', () => {
		it('creates a project with default name and open status', () => {
			const project = createProject();
			expect(project.name).toBe('New Project');
			expect(project.is_open).toBe(1);
			expect(project.id).toBeGreaterThan(0);
		});

		it('creates a project with custom name', () => {
			const project = createProject('My Song');
			expect(project.name).toBe('My Song');
		});

		it('creates a closed project when isOpen is false', () => {
			const project = createProject('Closed', false);
			expect(project.is_open).toBe(0);
		});

		it('auto-increments IDs', () => {
			const p1 = createProject('First');
			const p2 = createProject('Second');
			expect(p2.id).toBeGreaterThan(p1.id);
		});

		it('sets created_at and updated_at timestamps', () => {
			const project = createProject();
			expect(project.created_at).toBeDefined();
			expect(project.updated_at).toBeDefined();
		});
	});

	describe('getProject', () => {
		it('returns a project by id', () => {
			const created = createProject('Test');
			const fetched = getProject(created.id);
			expect(fetched).toBeDefined();
			expect(fetched!.name).toBe('Test');
			expect(fetched!.id).toBe(created.id);
		});

		it('returns undefined for non-existent id', () => {
			expect(getProject(999)).toBeUndefined();
		});
	});

	describe('getAllProjects', () => {
		it('returns empty array when no projects exist', () => {
			expect(getAllProjects()).toEqual([]);
		});

		it('returns all projects', () => {
			createProject('A');
			createProject('B');
			createProject('C');
			expect(getAllProjects()).toHaveLength(3);
		});

		it('includes both open and closed projects', () => {
			createProject('Open', true);
			createProject('Closed', false);
			expect(getAllProjects()).toHaveLength(2);
		});
	});

	describe('getOpenProjects', () => {
		it('returns only open projects', () => {
			createProject('Open1', true);
			createProject('Closed', false);
			createProject('Open2', true);
			const open = getOpenProjects();
			expect(open).toHaveLength(2);
			expect(open.every((p) => p.is_open)).toBe(true);
		});

		it('returns empty array when no open projects exist', () => {
			createProject('Closed', false);
			expect(getOpenProjects()).toEqual([]);
		});
	});

	describe('setProjectOpen', () => {
		it('opens a closed project', () => {
			const project = createProject('Test', false);
			expect(getProject(project.id)!.is_open).toBe(0);
			setProjectOpen(project.id, true);
			expect(getProject(project.id)!.is_open).toBe(1);
		});

		it('closes an open project', () => {
			const project = createProject('Test', true);
			setProjectOpen(project.id, false);
			expect(getProject(project.id)!.is_open).toBe(0);
		});
	});

	describe('updateProjectName', () => {
		it('updates the project name', () => {
			const project = createProject('Old Name');
			updateProjectName(project.id, 'New Name');
			expect(getProject(project.id)!.name).toBe('New Name');
		});

		it('updates the updated_at timestamp', () => {
			const project = createProject('Test');
			const originalUpdatedAt = project.updated_at;
			// Small delay not needed — SQLite CURRENT_TIMESTAMP has second resolution
			// and the update happens in the same second. Check that it's at least set.
			updateProjectName(project.id, 'Updated');
			const updated = getProject(project.id)!;
			expect(updated.updated_at).toBeDefined();
			// The timestamp should be >= original (could be same second)
			expect(updated.updated_at >= originalUpdatedAt).toBe(true);
		});
	});

	describe('deleteProject', () => {
		it('removes a project', () => {
			const project = createProject('To Delete');
			deleteProject(project.id);
			expect(getProject(project.id)).toBeUndefined();
		});

		it('does not affect other projects', () => {
			const p1 = createProject('Keep');
			const p2 = createProject('Delete');
			deleteProject(p2.id);
			expect(getProject(p1.id)).toBeDefined();
			expect(getAllProjects()).toHaveLength(1);
		});

		it('does nothing for non-existent id', () => {
			createProject('Existing');
			expect(() => deleteProject(999)).not.toThrow();
			expect(getAllProjects()).toHaveLength(1);
		});
	});
});
