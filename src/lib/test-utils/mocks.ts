/**
 * Mock helpers barrel file.
 *
 * Domain-specific mock implementations now live under:
 * - `./mocks/db-mock`
 * - `./mocks/kie-api-mock`
 * - `./mocks/infra-mocks`
 *
 * This file preserves the existing import path:
 * `import { ... } from '$lib/test-utils/mocks'`
 */

export type { DbMock } from './mocks/db-mock';
export { createDbMock } from './mocks/db-mock';

export type { KieApiMock } from './mocks/kie-api-mock';
export { createKieApiMock } from './mocks/kie-api-mock';

export type { SseMock, PollingMock } from './mocks/infra-mocks';
export { createSseMock, createPollingMock } from './mocks/infra-mocks';
