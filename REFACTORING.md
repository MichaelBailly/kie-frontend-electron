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

#### Task 4.1: Create test utilities and fixtures
#### Task 4.2: Add database operation tests
#### Task 4.3: Add API route integration tests
#### Task 4.4: Add polling logic tests

---

