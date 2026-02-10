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