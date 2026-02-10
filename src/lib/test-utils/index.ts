/**
 * Test utilities barrel file.
 *
 * Re-exports all test infrastructure so consumers can import from
 * `$lib/test-utils` with a single import statement:
 *
 * ```ts
 * import { createProject, createDbMock, expectCalledOnceWith } from '$lib/test-utils';
 * ```
 */

// Fixture factories
export {
	resetFixtureIds,
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
	createSetting,
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
} from './fixtures';

// Mock helpers
export type { DbMock, KieApiMock, SseMock, PollingMock } from './mocks';
export { createDbMock, createKieApiMock, createSseMock, createPollingMock } from './mocks';

// Test helpers
export {
	useFakeTimers,
	advanceTimersAndFlush,
	expectCalledOnceWith,
	expectNotCalled,
	expectCalledWithPartial,
	createJsonRequest,
	createRequestEvent,
	flushPromises,
	createDeferredPromise
} from './helpers';
