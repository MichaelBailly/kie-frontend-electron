/**
 * Shared validation helpers for SvelteKit API routes.
 *
 * These helpers eliminate repeated validation boilerplate across API route
 * handlers — required-field checks, entity-existence lookups, safe integer
 * parsing, and error-message extraction.
 */

import { error } from '@sveltejs/kit';
import { getProject, getGeneration } from '$lib/db.server';
import type { Project, Generation } from '$lib/types';

// ============================================================================
// Required-field validation
// ============================================================================

/**
 * Validate that all specified fields are present (truthy) in the request body.
 * Throws a 400 error listing the missing fields if any are falsy.
 *
 * @example
 * const body = await request.json();
 * requireFields(body, ['projectId', 'title', 'style']);
 */
export function requireFields<T extends Record<string, unknown>>(
	body: T,
	fields: (keyof T & string)[]
): void {
	const missing = fields.filter((f) => !body[f]);
	if (missing.length > 0) {
		throw error(400, `Missing required fields: ${missing.join(', ')}`);
	}
}

// ============================================================================
// Entity-existence helpers
// ============================================================================

/**
 * Fetch a project by id and throw 404 if it does not exist.
 * Returns the project so callers can use it immediately.
 */
export function requireProject(id: number): Project {
	const project = getProject(id);
	if (!project) {
		throw error(404, 'Project not found');
	}
	return project;
}

/**
 * Fetch a generation by id and throw 404 if it does not exist.
 * Accepts an optional `label` for the error message (e.g. "Parent generation").
 */
export function requireGeneration(id: number, label = 'Generation'): Generation {
	const generation = getGeneration(id);
	if (!generation) {
		throw error(404, `${label} not found`);
	}
	return generation;
}

// ============================================================================
// Parameter parsing
// ============================================================================

/**
 * Safely parse a route parameter as an integer.
 * Throws 400 if the value is not a valid integer.
 */
export function parseIntParam(value: string, name = 'id'): number {
	const parsed = parseInt(value, 10);
	if (Number.isNaN(parsed)) {
		throw error(400, `Invalid ${name}: must be an integer`);
	}
	return parsed;
}

// ============================================================================
// Error-message extraction
// ============================================================================

/**
 * Extract a human-readable message from an unknown caught value.
 */
export function getErrorMessage(err: unknown): string {
	return err instanceof Error ? err.message : 'Unknown error';
}
