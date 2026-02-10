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

#### Task 2.1: Split db.server.ts into entity repositories
#### Task 2.2: Optimize prepared statements with caching

### Phase 3: Pattern Consolidation (Medium Risk) — Days 7-9

**Goal:** Eliminate duplicated patterns across API routes

#### Task 3.1: Extract shared async operation handler
#### Task 3.2: Unify polling logic

---

### Phase 4: Testing Foundation (Medium Risk) — Days 10-14

**Goal:** Establish test infrastructure and expand coverage

#### Task 4.1: Create test utilities and fixtures
#### Task 4.2: Add database operation tests
#### Task 4.3: Add API route integration tests
#### Task 4.4: Add polling logic tests

---

