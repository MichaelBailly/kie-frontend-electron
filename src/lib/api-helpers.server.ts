/**
 * Shared helpers for SvelteKit API routes.
 *
 * Provides two categories of utilities:
 * 1. **Validation** — required-field checks, entity-existence lookups, safe
 *    integer parsing, and error-message extraction.
 * 2. **Async task runners** — standardized lifecycle for KIE API calls that
 *    start background tasks (generate, extend, stem-separate): API call →
 *    error/success handling → DB updates → SSE notifications → polling.
 */

import { error } from '@sveltejs/kit';
import {
	getProject,
	getGeneration,
	updateGenerationStatus,
	updateGenerationTaskId,
	updateStemSeparationStatus,
	updateStemSeparationTaskId
} from '$lib/db.server';
import type { GenerateMusicResponse, StemSeparationResponse } from '$lib/kie-api.server';
import { notifyClients, notifyStemSeparationClients } from '$lib/sse.server';
import { pollForResults, pollForStemSeparationResults } from '$lib/polling.server';
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

// ============================================================================
// Async task runners
// ============================================================================

/**
 * Common shape of KIE API responses that start an async task.
 */
interface KieTaskResponse {
	code: number;
	msg: string;
	data: { taskId: string };
}

/**
 * Run a KIE API call that starts an async task, with standardized error
 * handling.
 *
 * Handles three outcomes:
 * 1. API returns non-200 code → calls `onError` with the API error message
 * 2. API returns 200 → calls `onSuccess` with the extracted taskId
 * 3. API call throws → calls `onError` with the extracted error message
 */
async function runKieApiTask<T extends KieTaskResponse>(options: {
	apiCall: () => Promise<T>;
	onError: (message: string) => void;
	onSuccess: (taskId: string) => void;
}): Promise<void> {
	try {
		const response = await options.apiCall();
		if (response.code !== 200) {
			options.onError(response.msg);
			return;
		}
		options.onSuccess(response.data.taskId);
	} catch (err) {
		options.onError(getErrorMessage(err));
	}
}

/**
 * Start an async generation task (used by both generate and extend routes).
 *
 * Handles the full lifecycle:
 * 1. Calls the KIE API via the provided `apiCall`
 * 2. On API error → marks generation as error + notifies clients
 * 3. On success → saves taskId + notifies clients + starts polling
 * 4. On exception → marks generation as error + notifies clients
 */
export async function startGenerationTask(
	generationId: number,
	apiCall: () => Promise<GenerateMusicResponse>
): Promise<void> {
	await runKieApiTask({
		apiCall,
		onError(message) {
			updateGenerationStatus(generationId, 'error', message);
			notifyClients(generationId, 'generation_error', {
				status: 'error',
				error_message: message
			});
		},
		onSuccess(taskId) {
			updateGenerationTaskId(generationId, taskId);
			notifyClients(generationId, 'generation_update', { status: 'processing', task_id: taskId });
			pollForResults(generationId, taskId);
		}
	});
}

/**
 * Start an async stem separation task.
 *
 * Same lifecycle as `startGenerationTask` but uses stem-separation-specific
 * DB updates, SSE notifications, and polling.
 */
export async function startStemSeparationTask(
	separationId: number,
	generationId: number,
	audioId: string,
	apiCall: () => Promise<StemSeparationResponse>
): Promise<void> {
	await runKieApiTask({
		apiCall,
		onError(message) {
			updateStemSeparationStatus(separationId, 'error', message);
			notifyStemSeparationClients(separationId, generationId, audioId, 'stem_separation_error', {
				status: 'error',
				error_message: message
			});
		},
		onSuccess(taskId) {
			updateStemSeparationTaskId(separationId, taskId);
			notifyStemSeparationClients(
				separationId,
				generationId,
				audioId,
				'stem_separation_update',
				{
					status: 'processing',
					task_id: taskId
				}
			);
			pollForStemSeparationResults(separationId, taskId, generationId, audioId);
		}
	});
}
