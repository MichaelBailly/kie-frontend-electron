# Plan: Technical Debt Reduction & Refactoring

The codebase is in good shape overall but has several recurring problems: duplicated logic across generation route handlers, suppressed lint rules masking real issues, missing test coverage for complex composables, and a few fragile patterns (raw `setTimeout`, unsafe casts, un-awaited `goto`). This plan organizes the work into five thematic passes, ordered by risk and impact.

---

## Pass 1 — Delete Dead Code & Fix Quick Wins

1. Delete `src/demo.spec.ts` — scaffold test `1 + 2 === 3` with no value.
2. Remove the unused `requireFields` export from `src/lib/api-helpers.server.ts` (no callers in production code).
3. Fix the `negativeTags` inconsistency in `src/routes/api/generations/+server.ts` — change `''` to `'none'` to align with all other generation endpoints.
4. Remove `console.log('Database path:', dbPath)` from `src/lib/db/database.server.ts` (leaks filesystem paths in production).
5. Guard the `console.log` calls in `electron/main.js` behind an `isDev` check.

---

## Pass 2 — Consolidate Duplication

6. Extract `maskApiKey` into `src/lib/utils/` (currently copy-pasted in `src/routes/api/settings/+server.ts`, `src/routes/settings/+page.server.ts`, and `src/lib/settings.spec.ts`).
7. Introduce a `normalizeNegativeTags(value: string | null | undefined): string` helper in `src/lib/api-helpers.server.ts` and replace the six identical `negativeTags || 'none'` patterns across `add-instrumental`, `add-vocals`, `upload-instrumental`, `upload-vocals`, `retry-upload-instrumental`, and `retry-upload-vocals`.
8. Move `asOptionalString` from `src/routes/api/generations/upload-instrumental/+server.ts` into `src/lib/api-helpers.server.ts` (where `asNullableString` already lives).
9. Replace the private `isGenerationInProgress` in `src/lib/routes/project/useProjectState.svelte.ts` with the already-exported `isGenerating` from `src/lib/types.ts`.
10. Extract a shared `generation_type` type guard / display-label utility into `src/lib/types.ts` to eliminate the inline `generation.generation_type === 'add_instrumental' || ...` checks duplicated across `GenerationCard.svelte`, `GenerationView.svelte`, and the generation detail page.

---

## Pass 3 — Architecture & Type Safety

11. Move `isHttpErrorShape`, `normalizeError`, and related helpers out of `src/routes/api/import/+server.ts` into a new `src/lib/server/import/errors.ts` (follows the rule that complex orchestration belongs in `src/lib/server/`).
12. Fix the duplicate KIE base URL: remove the hardcoded `KIE_API_BASE` from `src/routes/api/settings/validate/+server.ts` and import the canonical value from `src/lib/kie-api.server.ts`.
13. Fix the dead `KIE_CALLBACK_URL` placeholder in `src/lib/constants.server.ts` — either add an `env` fallback (`KIE_CALLBACK_URL ?? 'https://...'`), or add a code comment clearly documenting that polling is used and the callback URL is unused.
14. Replace unchecked `request.json()` + unsafe casts in:
    - `src/routes/api/generations/[id]/annotations/+server.ts` — use `parseJsonBody` and validate fields
    - `src/routes/api/projects/+server.ts`
    - `src/routes/api/settings/validate/+server.ts`
15. Make `kieRequest` in `src/lib/kie-api.server.ts` preserve the HTTP status code (throw a typed `KieApiError` with a `status` field) so that callers in `service.server.ts` don't need to parse status codes from error message strings.

---

## Pass 4 — Svelte 5 Pattern Alignment

16. Replace `onMount`/`onDestroy` with `$effect` (with cleanup return) in:
    - `src/routes/projects/[projectId]/+layout.svelte` — also remove the file-wide `eslint-disable` suppression and fix the underlying navigation call with `resolve()`
    - `src/lib/components/GlobalAudioPlayer.svelte`
    - `src/lib/components/StylePicker.svelte`
    - `src/lib/components/Waveform.svelte`
17. Replace `goto()` (called without `await`) with `await goto()` in `src/routes/projects/[projectId]/generations/[generationId]/+page.svelte` and `src/lib/routes/song/useSongGenerationState.svelte.ts`.
18. Replace `setTimeout(() => element?.focus(), ...)` with `await tick()` in `StylePicker.svelte`, `ImportSongModal.svelte`, and `Sidebar.svelte`.
19. Replace `setTimeout(() => audioStore.seek(time), 100)` in `src/lib/routes/song/useSongPlaybackState.svelte.ts` — investigate whether `await tick()` or an audio `canplay` event listener is the right fix.

---

## Pass 5 — Test Coverage

20. Delete `src/demo.spec.ts` (already in Pass 1).
21. Add unit tests for the most critical composables, prioritized by complexity/risk:
    - `src/lib/routes/song/useSongGenerationState.svelte.ts` — extend, add-instrumental, add-vocals flows; star toggle optimistic update
    - `src/lib/routes/project/useProjectState.svelte.ts` — SSE patch handling, generation status updates
    - `src/lib/routes/project/useSSEConnection.svelte.ts` — reconnect logic
22. Expand `src/routes/page.spec.ts` and `src/routes/page.svelte.spec.ts` beyond SSR smoke tests — cover filtering, sorting, and navigation calls.
23. Add tests for the API route handlers that currently have none: `generations/+server.ts`, `import/+server.ts`, `settings/validate/+server.ts`.

---

## Verification

After each pass: `npm run check`, `npm run lint`, `npm run test`.

## Decisions

- Pass 1–2 are safe and low-risk; they can be done by a single implementer in one session.
- Pass 3 (type safety + architecture) is medium-risk — test coverage from Pass 5 should ideally follow immediately after to lock in the new contracts.
- Pass 4 (`$effect` migration) is low-risk individually but touches many components — do it as a single atomic PR so the Svelte 5 pattern is fully consistent.
- Pass 5 is independent and can be done in parallel with Passes 3–4.
