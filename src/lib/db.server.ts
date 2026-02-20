/**
 * Barrel file for database operations.
 *
 * All database logic has been split into focused repository modules under `src/lib/db/`.
 * This file re-exports everything so existing importers (`from '$lib/db.server'`) continue
 * to work without any changes.
 *
 * Repository modules:
 *   - database.server.ts  — DB initialization, schema, migrations
 *   - projects.server.ts  — Project CRUD
 *   - generations.server.ts — Generation CRUD + tracking
 *   - stem-separations.server.ts — Stem separation operations
 *   - annotations.server.ts — Variation annotations + label management
 *   - settings.server.ts  — Settings CRUD + helpers
 */

// Re-export types from canonical location
export type {
	Project,
	Generation,
	StemSeparationType,
	StemSeparation,
	VariationAnnotation,
	Label,
	Setting
} from '$lib/types';

// Database core
export { getDb, prepareStmt } from './db/database.server';

// Project operations
export {
	createProject,
	getOpenProjects,
	setProjectOpen,
	getProject,
	getAllProjects,
	updateProjectName,
	deleteProject
} from './db/projects.server';

// Generation operations
export {
	createGeneration,
	createExtendGeneration,
	getExtendedGenerations,
	getGeneration,
	getGenerationByTaskId,
	getGenerationsByProject,
	getLatestGenerationByProject,
	setTaskStarted as setGenerationTaskStarted,
	setStatus as setGenerationStatus,
	setErrored as setGenerationErrored,
	setCompleted as setGenerationCompleted,
	updateGenerationTaskId,
	updateGenerationStatus,
	updateGenerationTracks,
	completeGeneration,
	deleteGeneration,
	getPendingGenerations,
	createImportedGeneration,
	getAllExtendedParentGenerations
} from './db/generations.server';

// Stem separation operations
export {
	createStemSeparation,
	getStemSeparation,
	getStemSeparationByTaskId,
	getStemSeparationsForSong,
	getStemSeparationByType,
	setTaskStarted as setStemSeparationTaskStarted,
	setStatus as setStemSeparationStatus,
	setErrored as setStemSeparationErrored,
	setCompleted as setStemSeparationCompleted,
	updateStemSeparationTaskId,
	updateStemSeparationStatus,
	completeStemSeparation,
	getPendingStemSeparations,
	getAllCompletedStemSeparations
} from './db/stem-separations.server';

// Variation annotation operations
export {
	getLabelSuggestions,
	getAnnotation,
	getAnnotationsForGeneration,
	getAnnotationsByProject,
	getStarredAnnotationsByProject,
	getAllNotableAnnotations,
	getAllAnnotationsWithLabels,
	getHighlightsCount,
	toggleStar,
	updateComment,
	setAnnotationLabels
} from './db/annotations.server';

// Settings operations
export {
	getSetting,
	setSetting,
	deleteSetting,
	getAllSettings,
	getApiKey,
	setApiKey
} from './db/settings.server';

// Export a getter for the db instance (for default export compatibility)
import { getDb } from './db/database.server';
export default {
	get instance() {
		return getDb();
	}
};
