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

## Project Notes

- `npm run check` = `svelte-kit sync && svelte-check --tsconfig ./tsconfig.json`
- `npx eslint .` for lint checking
- Types are defined in `$lib/types.ts` (canonical location)
- `db.server.ts` re-exports types from `types.ts` for backward compatibility
- Uncommitted changes exist for Task 1.2 (type deduplication from `db.server.ts` to `types.ts`)