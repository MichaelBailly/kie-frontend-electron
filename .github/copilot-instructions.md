# KIE Music - Copilot Instructions

## Project Overview

KIE Music is an **Electron desktop application** for AI-powered music generation. It provides a streamlined interface to the KIE.ai API, enabling users to generate, organize, and refine AI-composed music tracks from their desktop.

### Tech Stack

| Layer         | Technology     | Version           |
| ------------- | -------------- | ----------------- |
| **Runtime**   | Electron       | 40.x              |
| **Framework** | SvelteKit      | 2.x               |
| **UI**        | Svelte         | 5.x (with runes)  |
| **Styling**   | TailwindCSS    | 4.x               |
| **Database**  | better-sqlite3 | 12.x              |
| **Build**     | Vite           | 7.x               |
| **Testing**   | Vitest         | 4.x               |
| **Language**  | TypeScript     | 5.x (strict mode) |

### Architecture

The app runs SvelteKit as an embedded HTTP server within Electron's main process. The renderer process loads the app from `localhost`. This enables full SvelteKit functionality including SSR, API routes, and server-sent events.

```
Electron Main Process
├── HTTP Server (SvelteKit handler)
├── SQLite Database (better-sqlite3)
└── BrowserWindow (Renderer)
    └── SvelteKit App (Svelte 5 UI)
```

---

## Project Structure

```
kie-frontend-electron/
├── electron/                    # Electron main process
│   ├── main.js                  # App entry, starts SvelteKit server
│   └── preload.js               # Context bridge for renderer
│
├── src/
│   ├── lib/                     # Shared library code
│   │   ├── components/          # Svelte 5 components (PascalCase)
│   │   ├── stores/              # Svelte 5 stores (.svelte.ts files)
│   │   ├── db.server.ts         # SQLite database operations
│   │   ├── kie-api.server.ts    # KIE.ai API client
│   │   ├── polling.server.ts    # Background polling for tasks
│   │   ├── sse.server.ts        # Server-sent events
│   │   ├── constants.server.ts  # Environment variables
│   │   └── types.ts             # Shared TypeScript types
│   │
│   ├── routes/                  # SvelteKit routes
│   │   ├── +page.svelte         # Home page
│   │   ├── +layout.svelte       # Root layout
│   │   ├── settings/            # Settings page
│   │   ├── projects/[projectId]/ # Project views
│   │   └── api/                 # REST API endpoints
│   │
│   ├── app.html                 # HTML template
│   └── hooks.server.ts          # Server hooks (security, recovery)
│
├── static/                      # Static assets
├── build-resources/             # App icons for packaging
└── docs/                        # Documentation
```

---

## Svelte 5 Patterns (CRITICAL)

This project uses **Svelte 5 with runes**. DO NOT use Svelte 4 patterns.

### Component Props

```svelte
<script lang="ts">
	let {
		title = $bindable(''),
		style = $bindable(''),
		onSubmit
	}: {
		title: string;
		style: string;
		onSubmit: (title: string, style: string) => void;
	} = $props();
</script>
```

### Reactive State

```svelte
<script lang="ts">
	// Local state
	let isLoading = $state(false);
	let items = $state<Item[]>([]);

	// Simple derived
	let isEmpty = $derived(items.length === 0);

	// Complex derived
	let filtered = $derived.by(() => {
		return items.filter((item) => item.active);
	});

	// Effects (side effects)
	$effect(() => {
		console.log('Items changed:', items.length);
	});
</script>
```

### Store Pattern (Svelte 5)

```typescript
// stores/example.svelte.ts
function createStore() {
	const state = $state<StoreState>({
		value: null,
		loading: false
	});

	return {
		get value() {
			return state.value;
		},
		get loading() {
			return state.loading;
		},

		setValue(newValue: string) {
			state.value = newValue;
		}
	};
}

export const store = createStore();
```

### Event Handlers

Use lowercase DOM event names:

```svelte
<button onclick={handleClick}>Click</button>
<input oninput={handleInput} />
<form onsubmit={handleSubmit}>
```

### Children/Slots

```svelte
<script lang="ts">
	let { children } = $props();
</script>

{@render children()}
```

---

## File Naming Conventions

| Pattern             | Usage                            | Example              |
| ------------------- | -------------------------------- | -------------------- |
| `PascalCase.svelte` | Components                       | `AudioPlayer.svelte` |
| `kebab-case.ts`     | Regular modules                  | `kie-api.server.ts`  |
| `*.server.ts`       | Server-only code                 | `db.server.ts`       |
| `*.svelte.ts`       | Svelte 5 runes in non-components | `audio.svelte.ts`    |
| `*.spec.ts`         | Test files                       | `settings.spec.ts`   |
| `+page.svelte`      | SvelteKit page                   | Route files          |
| `+server.ts`        | SvelteKit API endpoint           | API routes           |

---

## TypeScript Conventions

### Interfaces

- Use `interface` for object shapes (not `type`)
- Use `PascalCase` naming
- Use `snake_case` for database-mapped fields

```typescript
export interface Generation {
	id: number;
	project_id: number;
	task_id: string | null;
	title: string;
	status: string;
	created_at: string;
}

export type GenerationStatus = 'pending' | 'processing' | 'success' | 'error';
```

### Null Handling

- Use explicit `| null` or `| undefined`
- Use nullish coalescing (`??`) and optional chaining (`?.`)
- Return `undefined` for "not found" in getters

```typescript
export function getProject(id: number): Project | undefined {
	const result = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
	return result as Project | undefined;
}

const value = result?.value ?? null;
```

### Type Imports

```typescript
import type { RequestHandler } from './$types';
import type { Generation, Project } from '$lib/types';
```

---

## Import Conventions

### Order

1. External packages
2. SvelteKit modules (`$app/*`)
3. Library modules (`$lib/*`)
4. Relative imports
5. Type-only imports

```typescript
import { json, error } from '@sveltejs/kit';
import { browser } from '$app/environment';
import { goto, invalidateAll } from '$app/navigation';
import { createGeneration, getProject } from '$lib/db.server';
import type { RequestHandler } from './$types';
```

### Path Aliases

- `$lib/` - Library code
- `$app/` - SvelteKit modules
- `./$types` - Auto-generated route types

---

## API Route Patterns

### Standard CRUD

```typescript
// src/routes/api/projects/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllProjects, createProject } from '$lib/db.server';

export const GET: RequestHandler = async () => {
	const projects = getAllProjects();
	return json(projects);
};

export const POST: RequestHandler = async ({ request }) => {
	const { name } = await request.json();

	if (!name?.trim()) {
		throw error(400, 'Name is required');
	}

	const project = createProject(name);
	return json(project);
};
```

### Error Handling

```typescript
export const POST: RequestHandler = async ({ request }) => {
	const data = await request.json();

	// Validation
	if (!data.projectId || !data.title) {
		throw error(400, 'Missing required fields');
	}

	// Resource check
	const project = getProject(data.projectId);
	if (!project) {
		throw error(404, 'Project not found');
	}

	// Async error handling
	try {
		const result = await externalApi.call(data);
		return json(result);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		throw error(500, message);
	}
};
```

---

## Database Patterns

### Repository Functions

All database operations go in `$lib/db.server.ts`:

```typescript
// Create
export function createProject(name: string): Project {
	const stmt = db.prepare('INSERT INTO projects (name) VALUES (?) RETURNING *');
	return stmt.get(name) as Project;
}

// Read
export function getProject(id: number): Project | undefined {
	const stmt = db.prepare('SELECT * FROM projects WHERE id = ?');
	return stmt.get(id) as Project | undefined;
}

// Update
export function updateProjectName(id: number, name: string): void {
	const stmt = db.prepare(
		'UPDATE projects SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
	);
	stmt.run(name, id);
}

// Delete
export function deleteProject(id: number): void {
	const stmt = db.prepare('DELETE FROM projects WHERE id = ?');
	stmt.run(id);
}
```

### Schema Conventions

- `snake_case` for column names
- `id INTEGER PRIMARY KEY AUTOINCREMENT` for primary keys
- `created_at`, `updated_at` timestamps
- Foreign keys with `ON DELETE CASCADE`
- TEXT for status columns (no enums in SQLite)

---

## Component Patterns

### Structure

```svelte
<script lang="ts">
	// 1. Imports
	import { audioStore } from '$lib/stores/audio.svelte';
	import type { Generation } from '$lib/types';

	// 2. Props
	let {
		generation,
		onDelete
	}: {
		generation: Generation;
		onDelete: (id: number) => void;
	} = $props();

	// 3. Local state
	let isExpanded = $state(false);

	// 4. Derived values
	let isPlaying = $derived(audioStore.isTrackPlaying(generation.track1_audio_id));

	// 5. Effects
	$effect(() => {
		// Side effect logic
	});

	// 6. Functions
	function handleClick() {
		isExpanded = !isExpanded;
	}
</script>

<!-- Template -->
<div class="...">
	<!-- Content -->
</div>
```

### Styling

Use TailwindCSS utilities inline. Support dark mode with `dark:` prefix:

```svelte
<div class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
	<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Title</h2>
</div>
```

---

## Testing Patterns

### Unit Tests

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Feature', () => {
	beforeEach(() => {
		// Reset state
	});

	it('should do something', () => {
		const result = someFunction();
		expect(result).toBe(expected);
	});
});
```

### Module Mocking

```typescript
vi.mock('$lib/db.server', () => {
	let mockData: Record<string, string> = {};

	return {
		getSetting: vi.fn((key: string) => mockData[key] ?? null),
		setSetting: vi.fn((key: string, value: string) => {
			mockData[key] = value;
		}),
		__resetMock: () => {
			mockData = {};
		}
	};
});
```

---

## External API Integration

### KIE.ai API Client

Located in `$lib/kie-api.server.ts`:

```typescript
const KIE_API_BASE = 'https://api.kie.ai/api/v1';

export async function generateMusic(request: GenerateMusicRequest): Promise<GenerateMusicResponse> {
	const response = await fetch(`${KIE_API_BASE}/generate`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${getEffectiveApiKey()}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(request)
	});

	if (!response.ok) {
		throw new Error(`KIE API error: ${response.status}`);
	}

	return response.json();
}
```

### Polling Pattern

For long-running tasks:

```typescript
export async function pollForResults(generationId: number, taskId: string): Promise<void> {
	const maxAttempts = 120;
	let attempts = 0;

	const poll = async () => {
		attempts++;
		try {
			const details = await getMusicDetails(taskId);

			if (isCompleteStatus(details.data.status)) {
				// Handle completion
				return;
			}

			if (attempts < maxAttempts) {
				setTimeout(poll, 5000);
			}
		} catch (err) {
			if (attempts < maxAttempts) setTimeout(poll, 5000);
		}
	};

	poll();
}
```

---

## Common Commands

```bash
# Development
npm run dev           # Start Vite dev server (http://localhost:5173)
npm run dev:electron  # Build + launch Electron

# Build
npm run build         # Build SvelteKit
npm run build:electron # Package for distribution

# Quality
npm run check         # TypeScript + Svelte type checking
npm run lint          # ESLint + Prettier check
npm run format        # Auto-format with Prettier

# Testing
npm run test          # Run tests once
npm run test:unit     # Run tests in watch mode
```

---

## Key Patterns to Follow

1. **Always use Svelte 5 runes** (`$state`, `$derived`, `$effect`, `$props`)
2. **Server code uses `.server.ts` suffix** - enforced by SvelteKit
3. **Svelte 5 stores use `.svelte.ts` suffix** - required for runes
4. **Use `throw error()` from `@sveltejs/kit`** for HTTP errors in API routes
5. **Repository pattern** - all database operations in `db.server.ts`
6. **Type guards for external data** - validate API responses
7. **Session storage for form persistence** - per-project form state
8. **SSE for real-time updates** - generation status changes
9. **Recovery on startup** - resume incomplete operations via `hooks.server.ts`

---

## Anti-Patterns to Avoid

1. **DO NOT use Svelte 4 syntax** (`export let`, `$:`, `on:click`)
2. **DO NOT import `.server.ts` files in client code** - will fail at build
3. **DO NOT use `any` type** - use proper typing or `unknown`
4. **DO NOT hardcode API keys** - use database settings or env vars
5. **DO NOT use React patterns** - this is Svelte, not React
6. **DO NOT create separate CSS files** - use TailwindCSS inline
7. **DO NOT use `type` for object shapes** - use `interface`
