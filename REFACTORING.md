# KIE Music - Refactoring Plan & Progress

**Date Started:** February 9, 2026  
**Focus Area:** Maintainability  
**Time Budget:** 1-2 weeks  
**Risk Tolerance:** High (willing to do major restructuring)

## Overview

After implementing several features, the codebase has accumulated technical debt. This refactoring effort focuses on:
- Reducing code duplication
- Improving code organization
- Splitting large monolithic files
- Enhancing type safety
- Optimizing database operations
- Providing good unit test coverage
- Providing good e2e test coverage

## Refactoring Opportunities Identified

Initial analysis identified 10 major refactoring opportunities across different areas:

### High Priority
1. **Split db.server.ts into repositories** - 848-line monolithic file
2. **Unify polling logic** - Two nearly identical polling functions
3. **Expand test coverage** - Currently ~5% estimated coverage

### Medium Priority
4. **Consolidate async operation patterns** - 3 identical patterns across API routes
5. **Extract API validation helpers** - Repeated validation in 6 API routes
6. **Eliminate type duplication** - Types defined in both types.ts and db.server.ts
7. **Optimize prepared statements** - No caching, creating fresh statements each time

### Low Priority
8. **Fix `any` type usage** - 3 instances found
9. **Split kie-api.server.ts** - Could be split by domain
10. **Improve updateGenerationTracks** - Complex parameter handling

---

## Implementation Plan

### Phase 1: Foundation (Low Risk) — Days 1-2

**Goal:** Quick wins that improve type safety and eliminate obvious duplication

#### Task 1.1: Fix `any` type usage ✅

**Status:** Completed (commit `fa3d423`)  
**Changes:** Replaced all `any` types with proper types across the codebase:
- `GenerationView.svelte`: Typed `parentGeneration` and `parentSong` props with `Generation | null`
- `settings.spec.ts`: Created `DbMockModule` interface to replace `(db as any).__resetMock()`
- `+page.svelte` (home): Used proper `data` type instead of `(data as any).hasApiKey`
- `+layout.svelte` (root): Typed `children` as `Snippet` instead of `any`
- `+layout.svelte` (project): Typed `window.electronAPI` with proper interface instead of `(window as any)`

#### Task 1.2: Eliminate type duplication ✅

**Status:** Completed  
**Changes:** Moved all type/interface definitions from `db.server.ts` to `types.ts` (the canonical location) and added re-exports in `db.server.ts` for backward compatibility:
- `Project`, `Generation` — entity interfaces
- `StemSeparationType`, `StemSeparation` — stem separation types
- `VariationAnnotation`, `Label` — annotation types
- `Setting` — settings interface
- Updated `polling.server.ts` to import types from `$lib/types` instead of `$lib/db.server`
- All client-side files already imported from `$lib/types`

#### Task 1.3: Create API validation helpers ✅

**Status:** Completed  
**Changes:** Created `src/lib/api-helpers.server.ts` with four reusable validation helpers and refactored 6 API route files to use them:

- `requireFields(body, fields)` — validates required fields, throws 400 with missing field names
- `requireProject(id)` — fetches project or throws 404
- `requireGeneration(id, label?)` — fetches generation or throws 404 (with custom label support)
- `parseIntParam(value, name?)` — safely parses route param as integer, throws 400 on NaN
- `getErrorMessage(err)` — extracts message from unknown caught value

Refactored files:
- `api/generations/+server.ts` — `requireFields`, `requireProject`, `getErrorMessage`
- `api/generations/extend/+server.ts` — `requireFields`, `requireProject`, `requireGeneration`, `getErrorMessage`
- `api/generations/[id]/+server.ts` — `parseIntParam`, `requireGeneration`
- `api/generations/[id]/annotations/+server.ts` — `parseIntParam`, `requireGeneration`
- `api/projects/[id]/+server.ts` — `parseIntParam`, `requireProject`
- `api/stem-separation/+server.ts` — `requireFields`, `requireGeneration`, `getErrorMessage`

---

### Phase 2: Database Restructuring (Medium Risk) — Days 3-6

**Goal:** Break up monolithic database file into focused, maintainable modules

#### Task 2.1: Split db.server.ts into entity repositories ✅

**Status:** Completed  
**Changes:** Split the monolithic 924-line `db.server.ts` into focused repository modules under `src/lib/db/`:

- `src/lib/db/database.server.ts` — DB initialization, schema creation, migrations (165 lines)
- `src/lib/db/projects.server.ts` — Project CRUD operations (48 lines)
- `src/lib/db/generations.server.ts` — Generation CRUD + tracking + imports (248 lines)
- `src/lib/db/stem-separations.server.ts` — Stem separation operations (131 lines)
- `src/lib/db/annotations.server.ts` — Variation annotations + label management (195 lines)
- `src/lib/db/settings.server.ts` — Settings CRUD + API key helpers (42 lines)

`src/lib/db.server.ts` was converted to a barrel file (~100 lines) that re-exports everything from the repository modules. All external imports (`from '$lib/db.server'`) continue to work without any changes.

#### Task 2.2: Optimize prepared statements with caching ✅

**Status:** Completed  
**Changes:** Added a `prepareStmt(sql)` caching utility to `database.server.ts` and applied it across all repository modules:

- `src/lib/db/database.server.ts` — Added `prepareStmt()` function with a `Map<string, Statement>` cache that stores compiled prepared statements keyed by SQL string. Statements are prepared once on first use and reused on subsequent calls, avoiding repeated SQL parsing.
- `src/lib/db/projects.server.ts` — Replaced all 7 `getDb().prepare()` calls with `prepareStmt()`
- `src/lib/db/generations.server.ts` — Replaced all 17 `getDb().prepare()` calls with `prepareStmt()` (including 3 inline `db.prepare().run()` calls for project timestamp updates)
- `src/lib/db/stem-separations.server.ts` — Replaced all 9 `getDb().prepare()` calls with `prepareStmt()`
- `src/lib/db/annotations.server.ts` — Replaced 15 static `getDb().prepare()` calls with `prepareStmt()`. Kept `getDb()` for `db.transaction()` in `setAnnotationLabels` and dynamic SQL in `getLabelsForAnnotationIds` (variable placeholder count)
- `src/lib/db/settings.server.ts` — Replaced all 4 `getDb().prepare()` calls with `prepareStmt()`
- `src/lib/db.server.ts` — Added `prepareStmt` to barrel re-exports

### Phase 3: Pattern Consolidation (Medium Risk) — Days 7-9

**Goal:** Eliminate duplicated patterns across API routes

#### Task 3.1: Extract shared async operation handler ✅

**Status:** Completed  
**Changes:** Extracted the duplicated async KIE API task lifecycle (try/catch → API call → error/success handling → DB updates → SSE notifications → polling) into shared helpers in `api-helpers.server.ts`:

- `runKieApiTask(options)` — private generic helper that handles the core pattern: call API → check `response.code !== 200` → route to `onError` or `onSuccess` callbacks → catch exceptions
- `startGenerationTask(generationId, apiCall)` — generation-specific wrapper used by both generate and extend routes. Handles: `updateGenerationStatus` / `updateGenerationTaskId` / `notifyClients` / `pollForResults`
- `startStemSeparationTask(separationId, generationId, audioId, apiCall)` — stem separation-specific wrapper. Handles: `updateStemSeparationStatus` / `updateStemSeparationTaskId` / `notifyStemSeparationClients` / `pollForStemSeparationResults`

Refactored files:
- `api/generations/+server.ts` — removed 30-line `startGeneration()` function, replaced with `startGenerationTask()` call (62→33 lines)
- `api/generations/extend/+server.ts` — removed 40-line `startExtendGeneration()` function, replaced with `startGenerationTask()` call (99→53 lines)
- `api/stem-separation/+server.ts` — removed 40-line `startStemSeparation()` function, replaced with `startStemSeparationTask()` call (88→53 lines)
- Removed direct imports of `updateGenerationStatus`, `updateGenerationTaskId`, `updateStemSeparationStatus`, `updateStemSeparationTaskId`, `notifyClients`, `notifyStemSeparationClients`, `pollForResults`, `pollForStemSeparationResults`, `getErrorMessage` from route files — all encapsulated in the helpers
#### Task 3.2: Unify polling logic ✅

**Status:** Completed  
**Changes:** Extracted a generic `runPollLoop<TDetails>()` polling engine from the two nearly-identical polling functions in `polling.server.ts`, reducing the file from 410 to 340 lines:

- `PollConfig<TDetails>` — generic interface parameterized by API response type, with callbacks for `fetchDetails`, `getStatus`, `getStatusErrorMessage`, `isError`, `isComplete`, `onError`, `onComplete`, `onProgress`
- `runPollLoop<TDetails>(config)` — private generic engine that handles the retry loop (max attempts, 5s intervals), API code checks, error/complete/progress status routing, timeout, and exception handling with retries
- `pollForResults(generationId, taskId, options)` — thin wrapper passing `MusicDetailsResponse`-specific config (status mapping, intermediate stream URL handling, track completion logic)
- `pollForStemSeparationResults(stemSeparationId, taskId, generationId, audioId, options)` — thin wrapper passing `StemSeparationDetailsResponse`-specific config (stem URL extraction, simple progress updates)

Key design decisions:
- `onComplete` returns `boolean` — `true` stops polling, `false` continues (handles cases where status is SUCCESS but data is incomplete)
- `TDetails extends { code: number; msg: string }` — constrains the generic to API responses with `code`/`msg` fields, avoiding redundant `getResponseCode`/`getResponseMsg` callbacks
- Recovery functions (`recoverIncompleteGenerations`, `recoverIncompleteStemSeparations`) remain unchanged — they're thin callers of the polling functions
- Error handling unified: all error paths (API error, status error, timeout, fatal exception) route through a single `onError` callback

---

### Phase 4: Testing Foundation (Medium Risk) — Days 10-14

**Goal:** Establish test infrastructure and expand coverage

#### Task 4.1: Create test utilities and fixtures ✅

**Status:** Completed  
**Changes:** Created reusable test infrastructure under `src/lib/test-utils/` with 4 modules:

- `src/lib/test-utils/fixtures.ts` — Factory functions for all entity types and KIE API request/responses:
  - Entity factories: `createProject`, `createGeneration`, `createCompletedGeneration`, `createErrorGeneration`, `createExtendGeneration`, `createStemSeparation`, `createCompletedStemSeparation`, `createAnnotation`, `createStarredAnnotation`, `createLabel`, `createSetting`
  - API factories: `createGenerateMusicRequest`, `createExtendMusicRequest`, `createGenerateMusicResponse`, `createSunoTrack`, `createMusicDetailsResponse`, `createPendingMusicDetailsResponse`, `createErrorMusicDetailsResponse`, `createStemSeparationRequest`, `createStemSeparationResponse`, `createStemSeparationDetailsResponse`
  - All factories use auto-incrementing IDs and accept `Partial<T>` overrides
  - `resetFixtureIds()` resets all counters for deterministic tests

- `src/lib/test-utils/mocks.ts` — Pre-configured mock factories for server-side dependencies:
  - `createDbMock()` — In-memory DB mock with functional settings, projects, generations, stem separations, and annotations stores. Includes `__reset()` and `__set*()` helpers.
  - `createKieApiMock()` — KIE API mock with default success responses and real status-check logic.
  - `createSseMock()` — No-op SSE stubs with call tracking.
  - `createPollingMock()` — No-op polling stubs with call tracking.
  - Typed interfaces (`DbMock`, `KieApiMock`, `SseMock`, `PollingMock`) for autocomplete.

- `src/lib/test-utils/helpers.ts` — Common test utilities:
  - Timer helpers: `useFakeTimers()`, `advanceTimersAndFlush(ms)`
  - Custom assertions: `expectCalledOnceWith()`, `expectNotCalled()`, `expectCalledWithPartial()`
  - SvelteKit request helpers: `createJsonRequest()`, `createRequestEvent()`
  - Async helpers: `flushPromises()`, `createDeferredPromise<T>()`

- `src/lib/test-utils/index.ts` — Barrel file re-exporting everything from `$lib/test-utils`

- `src/lib/test-utils/test-utils.spec.ts` — 52 self-tests validating all factories, mocks, and helpers

#### Task 4.2: Add database operation tests ✅

**Status:** Completed  
**Changes:** Created integration tests for all 5 database repository modules using in-memory SQLite databases via better-sqlite3. Tests exercise real SQL queries against a real database engine.

- `src/lib/test-utils/db-setup.ts` — Shared test helper providing in-memory SQLite database setup:
  - `SCHEMA_DDL` — full schema matching `database.server.ts`
  - `resetTestDb()` — creates fresh in-memory database with schema (call in `beforeEach`)
  - `closeTestDb()` — cleanup (call in `afterAll`)
  - `getTestDb()` / `testPrepareStmt()` — mock-compatible replacements for `database.server.ts` exports
  - Pattern: `vi.mock('./database.server', async () => { ... })` with `await import('$lib/test-utils/db-setup')`

- `src/lib/db/settings.spec.ts` — 14 tests: getSetting, setSetting (upsert), deleteSetting, getAllSettings (ordering), getApiKey/setApiKey
- `src/lib/db/projects.spec.ts` — 19 tests: createProject (defaults, custom, closed), getProject, getAllProjects, getOpenProjects, setProjectOpen, updateProjectName, deleteProject
- `src/lib/db/generations.spec.ts` — 29 tests: createGeneration, createExtendGeneration, getGeneration, getGenerationByTaskId, getGenerationsByProject, getLatestGenerationByProject, getExtendedGenerations, updateGenerationTaskId, updateGenerationStatus, updateGenerationTracks (COALESCE), completeGeneration, deleteGeneration, getPendingGenerations, createImportedGeneration
- `src/lib/db/stem-separations.spec.ts` — 20 tests: createStemSeparation, getStemSeparation, getStemSeparationByTaskId, getStemSeparationsForSong, getStemSeparationByType, updateStemSeparationTaskId, updateStemSeparationStatus, completeStemSeparation (vocal + stem URLs), getPendingStemSeparations
- `src/lib/db/annotations.spec.ts` — 34 tests: getAnnotation (with labels), toggleStar (create + toggle), updateComment (create + update + null for empty), getAnnotationsForGeneration, getAnnotationsByProject (cross-generation), getStarredAnnotationsByProject, setAnnotationLabels (normalize, deduplicate, filter empty, replace, clear, reuse labels, preserve starred/comment), getLabelSuggestions (prefix, case-insensitive, limit)

Total: 116 new tests across 5 test files.

#### Task 4.3: Add API route integration tests ✅

**Status:** Completed  
**Changes:** Created integration tests for 7 API route groups using mock factories from `test-utils`. Tests exercise both happy paths and error cases (validation, 404s, parameter parsing) by calling the route handler functions directly with mock request events.

- `src/routes/api/projects/projects.spec.ts` — 13 tests: GET list, POST create (with/without name), GET/PATCH projects/[id] (success, 404, 400 for invalid id, name/is_open updates)
- `src/routes/api/generations/generations.spec.ts` — 19 tests: POST create (success, missing fields, missing project, KIE API error, polling start), POST extend (success, missing fields, invalid continueAt, missing project/parent, extendMusic call), GET/DELETE generations/[id] (success, 404, 400)
- `src/routes/api/generations/annotations.spec.ts` — 15 tests: GET annotation (existing, default, missing audioId, missing generation, invalid id), PATCH toggle_star (SSE broadcast), PATCH set_labels (success, non-array, non-string, too long), PATCH comment, validation (missing audioId, invalid audioId, no action, missing generation)
- `src/routes/api/settings/settings.spec.ts` — 7 tests: GET (no key, masked key, short key masking), PUT (set, clear empty, clear null, no-op when not provided)
- `src/routes/api/stem-separation/stem-separation.spec.ts` — 11 tests: POST create (success, API call args, polling start, existing non-error returns existing, existing error creates new, missing fields, invalid type, missing generation, no task_id, API error, split_stem type)
- `src/routes/api/labels/labels.spec.ts` — 7 tests: GET suggestions (default limit, custom limit, empty query, limit too low/high/NaN, query too long)
- `src/routes/api/sse/sse.spec.ts` — 4 tests: GET SSE stream (headers, ReadableStream body, addClient call, controller)

Total: 76 new tests across 7 test files.

Also fixed 40 pre-existing svelte-check errors from Task 4.1:
- `helpers.ts`: Replaced non-existent `vi.runAllTicksAsync()` with `vi.advanceTimersByTimeAsync()`
- `mocks.ts`: Replaced `ReturnType<typeof vi.fn>` (non-callable union type) with `MockFn = Mock<(...args: any[]) => any>` type alias in all mock interfaces

#### Task 4.4: Add polling logic tests

---

