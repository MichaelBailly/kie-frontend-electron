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
	SunoModel,
	StemSeparationType,
	StemSeparation,
	WavConversion,
	VariationAnnotation,
	Label,
	Setting,
	StyleCollection
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
	createAddInstrumentalGeneration,
	createAddVocalsGeneration,
	createUploadInstrumentalGeneration,
	createUploadVocalsGeneration,
	getExtendedGenerations,
	getAddInstrumentalGenerations,
	getAddVocalsGenerations,
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
	setGenerationLocalAssetUrls,
	setGenerationSourceAudioLocalUrl,
	clearGenerationLocalAssetUrls,
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

// WAV conversion operations
export {
	createWavConversion,
	getWavConversion,
	getWavConversionByTaskId,
	getWavConversionsForSong,
	getWavConversionByGenerationAndAudio,
	setTaskStarted as setWavConversionTaskStarted,
	setStatus as setWavConversionStatus,
	setErrored as setWavConversionErrored,
	setCompleted as setWavConversionCompleted,
	updateWavConversionTaskId,
	updateWavConversionStatus,
	completeWavConversion,
	getPendingWavConversions
} from './db/wav-conversions.server';

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
	setApiKey,
	getSunoModel,
	setSunoModel
} from './db/settings.server';

// Style collection operations
export {
	getAllStyles,
	getStyle,
	createStyle,
	updateStyle,
	deleteStyle,
	searchStyles
} from './db/style-collection.server';

// Export a getter for the db instance (for default export compatibility)
import { getDb } from './db/database.server';
export default {
	get instance() {
		return getDb();
	}
};
