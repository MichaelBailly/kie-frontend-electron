/**
 * Fixture barrel file.
 *
 * Domain-specific fixture factories now live under:
 * - `./fixtures/state`
 * - `./fixtures/entities`
 * - `./fixtures/kie-api`
 *
 * This file preserves the existing import path:
 * `import { ... } from '$lib/test-utils/fixtures'`
 */

export { resetFixtureIds } from './fixtures/state';

export {
	createProject,
	createGeneration,
	createCompletedGeneration,
	createErrorGeneration,
	createExtendGeneration,
	createStemSeparation,
	createCompletedStemSeparation,
	createAnnotation,
	createStarredAnnotation,
	createLabel,
	createSetting
} from './fixtures/entities';

export {
	createGenerateMusicRequest,
	createExtendMusicRequest,
	createGenerateMusicResponse,
	createSunoTrack,
	createMusicDetailsResponse,
	createPendingMusicDetailsResponse,
	createErrorMusicDetailsResponse,
	createStemSeparationRequest,
	createStemSeparationResponse,
	createStemSeparationDetailsResponse
} from './fixtures/kie-api';
