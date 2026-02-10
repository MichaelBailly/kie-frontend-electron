# KIE Music - Refactoring Memory

## Completed Tasks

### Task 1.1: Fix `any` type usage (2026-02-09)

**Instances found and fixed (in commit `fa3d423`):**

1. `src/lib/components/GenerationView.svelte` — `parentGeneration?: any; parentSong?: any` → typed as `Generation | null`
2. `src/lib/settings.spec.ts` — `(db as any).__resetMock()` → created `DbMockModule` interface with `__resetMock` method
3. `src/routes/+page.svelte` — `(data as any).hasApiKey` → used proper `PageData` type with `hasApiKey` field
4. `src/routes/projects/[projectId]/+layout.svelte` — `children: any` → `children: Snippet`; `(window as any).electronAPI` → typed with inline interface
5. `src/lib/settings.spec.ts` (second instance) — same `DbMockModule` fix

**Learnings:**

- The Svelte 5 `Snippet` type from `'svelte'` is used for `children` props instead of `any`
- For Electron's `window.electronAPI`, use intersection type: `(window as Window & { electronAPI?: {...} })`
- For test mocks with custom methods like `__resetMock`, create a proper interface extending the mock module type

### Task 1.2: Eliminate type duplication (2026-02-09)

**What was done:**

- Moved `Project`, `Generation`, `StemSeparationType`, `StemSeparation`, `VariationAnnotation`, `Label`, `Setting` from `db.server.ts` to `types.ts`
- Added re-exports in `db.server.ts` (`export type { ... }`) so existing server-side importers don't break
- Updated `polling.server.ts` to import types from `$lib/types` directly
- All client-side components already imported from `$lib/types` (no changes needed)

**Learnings:**

- Re-exporting types from the original module (`export type { X }`) is a clean migration strategy — no downstream breakage
- `types.ts` is a non-`.server.ts` file, so its types are accessible from both server and client code
- Server-side files can gradually migrate their type imports to `$lib/types` while re-exports maintain compatibility

## Project Notes

- `npm run check` = `svelte-kit sync && svelte-check --tsconfig ./tsconfig.json`
- `npx eslint .` for lint checking
- Types are defined in `$lib/types.ts` (canonical location)
- `db.server.ts` re-exports types from `types.ts` for backward compatibility
- Uncommitted changes exist for Task 1.2 (type deduplication from `db.server.ts` to `types.ts`)

### Task 1.3: Create API validation helpers (2026-02-09)

**What was done:**

- Created `src/lib/api-helpers.server.ts` with five shared helpers:
  - `requireFields(body, fields)` — validates required fields are truthy, throws 400 listing missing ones
  - `requireProject(id)` — returns Project or throws 404
  - `requireGeneration(id, label?)` — returns Generation or throws 404 (custom label for "Parent generation")
  - `parseIntParam(value, name?)` — safe parseInt with 400 on NaN
  - `getErrorMessage(err)` — `err instanceof Error ? err.message : 'Unknown error'`
- Refactored 6 API route files (generations, extend, [id], annotations, projects/[id], stem-separation)
- Removed direct `getProject`/`getGeneration` imports from routes that only used them for existence checks
- Removed unused `import { error }` from routes that no longer throw directly

**Patterns identified but NOT extracted (too specific):**

- `api/labels/+server.ts` — limit/query validation is unique to that route
- `api/settings/+server.ts` — no validation needed (simple GET/PUT)
- `api/settings/validate/+server.ts` — unique API key validation logic
- `api/import/+server.ts` — already has its own local type guards (complex import flow)
- `api/sse/+server.ts` — no validation needed (SSE stream)

**Learnings:**

- `requireFields` uses truthiness check (`!body[f]`), same as original code — `0` and `""` are considered missing, which is correct for string/id fields
- The `requireGeneration(id, 'Parent generation')` label parameter keeps error messages contextual without needing separate helper functions
- Files that use `error()` from `@sveltejs/kit` only for the helpers no longer need to import it directly — the helpers throw internally
- The `body` must be destructured AFTER `requireFields` for type safety, but we also need to destructure before for the field names — current pattern destructures before and validates after (same as original code)

### Task 2.1: Split db.server.ts into entity repositories (2026-02-09)

**What was done:**

- Created `src/lib/db/` directory with 6 focused repository modules:
  - `database.server.ts` — `getDb()`, schema DDL, WAL mode, `is_open` migration
  - `projects.server.ts` — `createProject`, `getProject`, `getAllProjects`, `getOpenProjects`, `setProjectOpen`, `updateProjectName`, `deleteProject`
  - `generations.server.ts` — All generation CRUD, extend, import, pending tracking (14 exported functions)
  - `stem-separations.server.ts` — All stem separation CRUD and status updates (9 exported functions)
  - `annotations.server.ts` — Variation annotations, labels, starring, comments (8 exported functions + 5 private helpers)
  - `settings.server.ts` — Settings CRUD + `getApiKey`/`setApiKey` helpers (6 exported functions)
- Converted `src/lib/db.server.ts` into a barrel file that re-exports everything from the repository modules
- All external imports (`from '$lib/db.server'`) remain unchanged — zero downstream breakage
- Internal repository files import `getDb` from `./database.server` and types from `$lib/types`

**Learnings:**

- Barrel re-export strategy works well for incremental refactoring — no need to update any consuming files
- Each repository module imports `getDb` from the sibling `database.server.ts` module using relative paths (`./database.server`)
- Private helper functions (like `normalizeLabel`, `getAnnotationRow`, `ensureAnnotationRow`, `getLabelsForAnnotationIds`, `attachLabelsToAnnotations`) stay in their respective repository module — no need to export them
- The default export (`export default { get instance() { return getDb(); } }`) was preserved in the barrel file even though no consumer uses it, to avoid accidental breakage
- Heredoc (`<< 'EOF'`) in bash strips tabs with `<<-` but not spaces — using prettier to fix formatting after file generation is more reliable

### Task 2.2: Optimize prepared statements with caching (2026-02-09)

**What was done:**

- Added `prepareStmt(sql)` helper to `database.server.ts` — uses a `Map<string, BetterSqlite3.Statement>` to cache compiled prepared statements by SQL string
- Replaced ~52 `getDb().prepare(sql)` calls across all 5 repository modules with `prepareStmt(sql)`
- Modules that only used `getDb()` for `.prepare()` now import only `prepareStmt` (projects, generations, stem-separations, settings)
- `annotations.server.ts` imports both `getDb` and `prepareStmt` — needs `getDb()` for `db.transaction()` and for dynamic SQL in `getLabelsForAnnotationIds` (variable placeholder count based on array length)
- Exported `prepareStmt` from barrel file `db.server.ts` for external consumers

**Design decisions:**

- Cache key is the raw SQL string — simple and sufficient since we use string literals
- Dynamic SQL with variable placeholder counts (e.g., `IN (?, ?, ?)`) cannot be cached and still uses `getDb().prepare()` directly
- `db.transaction()` still requires `getDb()` — `prepareStmt` is only for individual statements
- Cache lives for the lifetime of the process (same as database connection) — no invalidation needed since `_db` is a singleton

### Task 3.1: Extract shared async operation handler (2026-02-09)

**What was done:**

- Added `runKieApiTask()`, `startGenerationTask()`, `startStemSeparationTask()` to `api-helpers.server.ts`
- Refactored 3 API route files to use the shared helpers, removing ~110 lines of duplicated orchestration code
- The refactoring also cleaned up imports: routes no longer need `updateGenerationStatus`, `notifyClients`, `pollForResults`, etc. — all encapsulated in the helpers

### Task 3.2: Unify polling logic (2026-02-09)

**What was done:**

- Extracted `PollConfig<TDetails>` interface + `runPollLoop<TDetails>()` generic engine from two near-identical polling functions
- Both `pollForResults` and `pollForStemSeparationResults` became thin wrappers providing domain-specific callbacks
- File reduced from 410 to 340 lines; all duplicated retry/timeout/error logic consolidated into the generic engine

**Design decisions:**

- `onComplete` returns `boolean` (true = stop polling, false = continue) — handles edge case where API status is SUCCESS but response data is incomplete (missing tracks or null `response`)
- `TDetails extends { code: number; msg: string }` constraint avoids redundant `getResponseCode`/`getResponseMsg` callbacks since both API response types share this shape
- `getStatus` returns `string | undefined` to handle defensive `?.` access on `details.data` which might be undefined in non-200 responses
- Single `onError(msg)` callback handles all error paths (API error, status error, timeout, unrecoverable catch) since all paths do the same thing: update DB status to 'error' + notify clients
- `timeoutMessage` is configurable ("Generation timed out" vs "Stem separation timed out") rather than derived from `label`

**Learnings:**

- When extracting a generic engine from two domain-specific functions, the key insight is identifying which behaviors are truly common (retry loop, logging, error routing) vs domain-specific (status mapping, data extraction, DB/SSE calls)
- The `onComplete` → `boolean` pattern is useful when "complete status" doesn't always mean "fully complete" — the domain callback decides
- Preserving the same exported function signatures means zero downstream changes (callers, recovery functions, api-helpers all unchanged)

**Learnings:**

- better-sqlite3 `prepare()` parses and compiles SQL each time — caching avoids this overhead on hot paths
- The `Map` cache approach is simpler than module-level `const stmt = ...` declarations because statements can only be prepared after the DB is initialized (lazy loading)
- Keeping `getDb()` accessible is still necessary for transactions and dynamic SQL — don't try to hide it completely

### Task 3.1: Extract shared async operation handler (2026-02-09)

**What was done:**

- Identified that 3 API routes (`generations`, `generations/extend`, `stem-separation`) each had a private async function (`startGeneration`, `startExtendGeneration`, `startStemSeparation`) following the exact same lifecycle pattern: try/catch → call KIE API → check `response.code !== 200` → update DB status → notify SSE clients → start polling
- Created `runKieApiTask<T>()` — a private generic helper in `api-helpers.server.ts` that encapsulates the core try/catch + API response code check pattern with `onError`/`onSuccess` callbacks
- Created `startGenerationTask(generationId, apiCall)` — wraps `runKieApiTask` with generation-specific DB updates, SSE notifications, and polling
- Created `startStemSeparationTask(separationId, generationId, audioId, apiCall)` — wraps `runKieApiTask` with stem-separation-specific DB updates, SSE notifications, and polling
- Refactored all 3 routes to use these helpers, passing the KIE API call as a closure. Each route dropped ~30-40 lines of boilerplate
- Updated `api-helpers.server.ts` module docstring to reflect both validation and async task runner responsibilities

**Routes NOT changed (correctly scoped out):**

- `api/import/+server.ts` — completely different pattern (synchronous fetch + validation + DB insert, no polling/SSE)
- Other CRUD routes (labels, settings, projects, annotations) — no async task lifecycle

**Learnings:**

- The closure pattern `startGenerationTask(id, () => generateMusic({...}))` keeps route-specific API parameters in the route file while moving lifecycle orchestration to the helper
- Both `GenerateMusicResponse` and `StemSeparationResponse` share the same `{ code, msg, data: { taskId } }` shape, enabling a shared `KieTaskResponse` interface constraint
- `runKieApiTask` is private (not exported) — it's an implementation detail; consumers use the domain-specific `startGenerationTask` / `startStemSeparationTask` wrappers
- The refactoring also cleaned up imports: routes no longer need `updateGenerationStatus`, `notifyClients`, `pollForResults`, etc. — all encapsulated in the helpers

### Task 4.1: Create test utilities and fixtures (2026-02-09)

**What was done:**

- Created `src/lib/test-utils/` directory with 4 modules: `fixtures.ts`, `mocks.ts`, `helpers.ts`, `index.ts`
- Created `test-utils.spec.ts` with 52 self-tests covering all exports
- Fixture factories for all entity types (Project, Generation, StemSeparation, VariationAnnotation, Label, Setting) with auto-incrementing IDs and `Partial<T>` overrides
- Convenience variants: `createCompletedGeneration`, `createErrorGeneration`, `createExtendGeneration`, `createCompletedStemSeparation`, `createStarredAnnotation`
- KIE API request/response factories for all request/response types
- Pre-configured mocks for `$lib/db.server` (functional in-memory stores), `$lib/kie-api.server` (real status-check logic), `$lib/sse.server` (no-op stubs), `$lib/polling.server` (no-op stubs)
- Typed mock interfaces (`DbMock`, `KieApiMock`, `SseMock`, `PollingMock`) for autocomplete
- Common test helpers: `useFakeTimers`, `advanceTimersAndFlush`, `expectCalledOnceWith`, `expectNotCalled`, `expectCalledWithPartial`, `createJsonRequest`, `createRequestEvent`, `flushPromises`, `createDeferredPromise`

**Design decisions:**

- Test utils are in `src/lib/test-utils/` (non-`.server.ts`) so they can be imported from any test file
- DB mock uses functional in-memory stores for settings/projects + find-by-id lookups for other entities
- KIE API mock status checkers use real logic so routing works correctly in integration tests
- All mocks include `__reset()` that clears data stores and `vi.fn()` call counts
- Deep merge for nested `data` fields in API response factories
- `resetFixtureIds()` is separate from mock resets — independent concerns

**Learnings:**

- Vitest `requireAssertions: true` is configured — every test must have at least one `expect()`
- `$lib/test-utils` path alias works because `$lib` maps to `src/lib`
- `Object.entries(mock)` loop for resetting spies must use `[, value]` destructuring to avoid `@typescript-eslint/no-unused-vars`

### Task 4.2: Add database operation tests (2026-02-09)

**What was done:**

- Created `src/lib/test-utils/db-setup.ts` — shared helper for in-memory SQLite test databases
- Created 5 test files (`src/lib/db/*.spec.ts`) with 116 integration tests covering all repository modules
- Tests run against real better-sqlite3 in-memory databases, exercising actual SQL queries
- Used `vi.mock('./database.server', async () => { ... })` pattern to intercept the database module at the lowest level

**Testing strategy: Option B — in-memory SQLite integration tests**

- Chose real SQLite over mocks because the repositories are thin SQL wrappers — mocking SQL would test nothing useful
- `vi.mock('./database.server')` replaces `getDb()` and `prepareStmt()` with in-memory equivalents
- Each test gets a fresh `:memory:` database via `resetTestDb()` in `beforeEach`
- The `async` mock factory uses `await import('$lib/test-utils/db-setup')` to load the helper module inside Vitest's mock hoisting
- Since the mock resolves `./database.server` relative to the test file (same directory as the modules under test), both the test file and the imported repository module share the same mock

**Key pattern for database test files:**

```typescript
vi.mock('./database.server', async () => {
	const dbSetup = await import('$lib/test-utils/db-setup');
	return {
		getDb: () => dbSetup.getTestDb(),
		prepareStmt: (sql: string) => dbSetup.testPrepareStmt(sql)
	};
});
import { resetTestDb, closeTestDb } from '$lib/test-utils/db-setup';
beforeEach(() => resetTestDb());
afterAll(() => closeTestDb());
```

**Learnings:**

- better-sqlite3 can be loaded in Vitest tests using `createRequire(import.meta.url)` — same pattern as production code
- `SCHEMA_DDL` is duplicated in `db-setup.ts` (not imported from `database.server.ts`) because `database.server.ts` imports `$app/environment` which isn't available in tests. If the schema changes, tests will fail naturally.
- SQLite `CURRENT_TIMESTAMP` has second-level resolution — rows inserted in the same test have identical timestamps, making `ORDER BY created_at` non-deterministic for tie-breaking. Tests should not assert specific ordering when timestamps are identical.
- SQLite stores booleans as INTEGER (0/1). The TypeScript interface declares `is_open: boolean` but the raw value is a number. Use truthiness checks (`p.is_open`) not strict equality (`p.is_open === 1`) in test assertions.
- `annotations.server.ts` uses both `getDb()` (for transactions and dynamic SQL) and `prepareStmt()` (for static queries). The mock must provide both.
- `db.transaction()` works correctly with the in-memory mock since `getDb()` returns the real SQLite instance.
- `vi.mock` with async factory + `await import()` is fully supported in Vitest — the factory awaits properly during module resolution.
- The `db-setup.ts` helper is NOT added to the `test-utils/index.ts` barrel to avoid forcing all test imports to load better-sqlite3 (a native module).
- Pre-existing svelte-check errors (39 in `test-utils.spec.ts`, 1 in `helpers.ts`) exist from Task 4.1 — not introduced by this task.

### Task 4.3: Add API route integration tests (2026-02-09)

**What was done:**

- Created 7 test files under `src/routes/api/` with 76 integration tests covering all API routes
- Tests use mock factories from `$lib/test-utils` (createDbMock, createKieApiMock, createSseMock, createPollingMock)
- Tests call route handler functions (GET, POST, PATCH, DELETE) directly with mock `RequestEvent` objects via `createRequestEvent()`
- Both happy paths and error cases are covered: validation errors (400), not found (404), invalid IDs, missing fields, KIE API errors, async task lifecycle

**Testing strategy:**

- Route handlers are imported via `await import('./+server')` (dynamic import within `vi.mock` scope)
- DB mock provides functional in-memory stores for projects/settings + `vi.fn()` spies for assertions
- KIE API mock returns default `{ code: 200 }` responses; tests override with `mockResolvedValue()` for error cases
- SSE and polling mocks are no-op spies used to verify correct event dispatching
- Async task lifecycle (startGenerationTask/startStemSeparationTask) fires via `.catch(console.error)` in routes, so `flushPromises()` is needed before asserting on mock calls

**Key pattern for API route tests:**

```typescript
vi.mock('$lib/db.server', () => createDbMock());
vi.mock('$lib/kie-api.server', () => createKieApiMock());
vi.mock('$lib/sse.server', () => createSseMock());
vi.mock('$lib/polling.server', () => createPollingMock());

let db: DbMock;
beforeEach(async () => {
  db = (await import('$lib/db.server')) as unknown as DbMock;
  db.__reset();
});

it('test', async () => {
  db.__setProjects([createProject({ id: 1 })]);
  const { POST } = await import('./+server');
  const event = createRequestEvent({ body: {...}, params: {...} });
  const response = await POST(event as never);
  const data = await response.json();
  expect(data.id).toBe(1);
});
```

**Learnings:**

- SvelteKit's `error()` throws an object with `{ status: number, body: { message: string } }` shape — use `rejects.toMatchObject({ status: 400, body: { message: '...' } })` for assertions
- `event as never` cast is needed because `createRequestEvent()` returns a minimal mock object, not a full `RequestEvent` type — the route handlers work fine with the subset of properties
- `mockClear()` (used in `__reset()`) resets call counts but NOT mock implementations. When a test overrides `mockResolvedValue()`, subsequent tests in the same `describe` block inherit that override. Fix by explicitly setting the mock return value in tests that depend on the default
- `flushPromises()` resolves one microtask tick — sufficient for `.catch(console.error)` chains but may need `await flushPromises()` multiple times for longer chains
- API route tests don't need `createRequire` or better-sqlite3 — they test the HTTP layer with mocked dependencies, not actual SQL
- SSE route test can verify headers and stream creation, but reading the stream content requires a `ReadableStreamDefaultReader` which adds complexity — testing `addClient` call is sufficient
- All pre-existing svelte-check errors (39+1) remain in `test-utils.spec.ts` and `helpers.ts` from Task 4.1 — not in the new API route test files
- Fixed pre-existing svelte-check errors (40 total) in test-utils from Task 4.1:
  - `helpers.ts`: `vi.runAllTicksAsync()` doesn't exist in Vitest 4.x — replaced with `vi.advanceTimersByTimeAsync(0)` which advances timers AND flushes microtasks
  - `mocks.ts`: `ReturnType<typeof vi.fn>` resolves to `Mock<Procedure | Constructable>` — a union type that TypeScript considers non-callable. Fixed by introducing `MockFn = Mock<(...args: any[]) => any>` type alias (constrains to plain function signature) and replacing all interface/cast usages

### Task 4.4: Add polling logic tests (2026-02-09)

**What was done:**

- Created `src/lib/polling.spec.ts` with 14 tests covering `pollForResults`, `pollForStemSeparationResults`, `recoverIncompleteGenerations`, and `recoverIncompleteStemSeparations`
- Uses `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync()` to control the 5-second polling interval
- Mocks `$lib/kie-api.server` with real status-check logic (isErrorStatus, isCompleteStatus uses actual logic), `$lib/db.server` and `$lib/sse.server` with `vi.fn()` stubs
- Tests cover: successful completion (both generation and stem separation), error status handling, non-200 API responses, intermediate PENDING → processing flow, fetch exception retry, SUCCESS with incomplete data (missing track2), and recovery functions (with/without task_id, empty arrays)

**Testing strategy:**

- Direct module mocking with `vi.mock()` — simpler than the mock factory pattern since polling tests only need specific functions, not full DB stores
- KIE API status checkers use real logic so the polling engine routes to correct callbacks
- `vi.advanceTimersByTimeAsync(0)` flushes the initial async `poll()` call; `vi.advanceTimersByTimeAsync(5000)` triggers the next `setTimeout(poll, 5000)` interval
- `vi.mocked()` wrapper for type-safe mock setup (e.g., `vi.mocked(getMusicDetails).mockResolvedValue(...)`)

**Learnings:**

- The polling engine calls `poll()` immediately (not after a delay), so `vi.advanceTimersByTimeAsync(0)` is needed after `pollForResults()` to flush that initial async call
- `runPollLoop` is private (not exported), so tests exercise it indirectly through `pollForResults` and `pollForStemSeparationResults`
- `onComplete` returning `false` (e.g., when only 1 of 2 tracks is present) causes the engine to continue polling — this is testable by providing incomplete SUCCESS data first, then complete data on the next poll
- `MusicDetailsResponse` type must be explicitly imported (via `import type`) for the `as MusicDetailsResponse` cast in non-200 API test — fixture types don't re-export the raw response interfaces
- Recovery functions are synchronous wrappers that either immediately call `updateGenerationStatus('error')` or fire-and-forget `pollForResults(...)` — testing both paths is straightforward
