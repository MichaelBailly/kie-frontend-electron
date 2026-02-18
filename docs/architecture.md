# Architecture

This document describes the system architecture of KIE Music.

## Overview

KIE Music is an Electron application that embeds a SvelteKit server. The architecture enables a rich web-based UI while providing native desktop capabilities.

```
┌─────────────────────────────────────────────────┐
│                  Electron                        │
│  ┌───────────────┐    ┌──────────────────────┐  │
│  │  Main Process │    │   Renderer Process   │  │
│  │               │    │                      │  │
│  │  - SvelteKit  │───▶│  - Svelte 5 UI       │  │
│  │  - SQLite     │    │  - TailwindCSS       │  │
│  │  - KIE API    │    │  - Audio playback    │  │
│  └───────────────┘    └──────────────────────┘  │
└─────────────────────────────────────────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │   KIE.ai     │
                   │   REST API   │
                   └──────────────┘
```

## Tech Stack

| Layer     | Technology       | Purpose                        |
| --------- | ---------------- | ------------------------------ |
| Runtime   | Electron 36      | Desktop shell, native APIs     |
| Framework | SvelteKit        | Routing, SSR, API endpoints    |
| UI        | Svelte 5         | Reactive components with runes |
| Styling   | TailwindCSS 4    | Utility-first CSS              |
| Database  | better-sqlite3   | Local SQLite storage           |
| Build     | Vite             | Development server, bundling   |
| Package   | electron-builder | Cross-platform distribution    |

## Project Structure

```
kie-frontend-electron/
├── electron/
│   ├── main.js           # Electron main process, starts SvelteKit server
│   └── preload.js        # Context bridge for renderer
├── src/
│   ├── lib/
│   │   ├── db/               # DB repository modules (one file per domain)
│   │   ├── server/           # Complex server-side logic (e.g. import)
│   │   ├── polling/          # Task poller helpers
│   │   ├── stores/           # Svelte 5 reactive stores (.svelte.ts)
│   │   ├── components/       # Shared Svelte components
│   │   ├── db.server.ts      # Re-exports from db/ modules
│   │   ├── kie-api.server.ts # KIE API client
│   │   ├── polling.server.ts # Background task polling
│   │   ├── sse.server.ts     # Server-sent events broadcaster
│   │   └── types.ts          # Shared TypeScript types
│   └── routes/
│       ├── +page.svelte      # Home / project list
│       ├── settings/         # API key configuration
│       ├── projects/[projectId]/
│       │   ├── +page.svelte         # Project detail / generations list
│       │   ├── starred/             # Starred variations view
│       │   └── generations/[generationId]/
│       │       └── song/[songId]/   # Song detail view
│       └── api/              # Internal API endpoints
│           ├── generations/  # CRUD for generations + extend + annotations
│           ├── import/       # Import song from external KIE task ID
│           ├── labels/       # Label autocomplete suggestions
│           ├── projects/     # CRUD for projects
│           ├── settings/     # Settings management
│           ├── sse/          # Global server-sent events stream
│           └── stem-separation/
├── static/                   # Favicons, static assets
├── build-resources/          # App icons for packaging
└── build/                    # Compiled SvelteKit output
```

## Data Flow

### Music Generation

1. User submits prompt via UI
2. SvelteKit API route calls KIE API `/generate`
3. Task ID stored in SQLite with "pending" status
4. Background poller checks KIE API for status updates
5. On completion, audio track URLs saved inline to the `generations` row
6. All connected clients notified via the global SSE stream

### Database Schema

Key tables:

- **projects** - Organize generations into named projects
- **generations** - Music generation tasks with prompts, status, and inline audio track URLs (up to two tracks per generation)
- **stem_separations** - Vocal/stem extraction tasks with per-stem result URLs
- **variation_annotations** - Per-track user metadata: starred flag, freeform comment, and label links
- **labels** - Reusable tag strings with recency tracking for autocomplete
- **variation_label_links** - Many-to-many join between annotations and labels
- **settings** - Key-value store (API key, preferences)

## Electron Integration

The main process (`electron/main.js`):

1. Starts the SvelteKit server on a random available port
2. Creates a BrowserWindow pointing to the local server
3. Handles native events (close, minimize, etc.)

This approach provides full SvelteKit functionality including:

- Server-side rendering
- API routes with database access
- Server-sent events for real-time updates

## Security

The application follows Electron security best practices:

### Electron Security Settings

| Setting            | Value            | Purpose                                |
| ------------------ | ---------------- | -------------------------------------- |
| `nodeIntegration`  | `false`          | Prevents XSS from accessing Node.js    |
| `contextIsolation` | `true`           | Isolates preload from renderer context |
| `sandbox`          | `true` (default) | Limits renderer process capabilities   |

### Content Security Policy

HTTP responses include a strict CSP header:

```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https://cdn.kie.ai;
media-src 'self' blob: https://cdn.kie.ai;
connect-src 'self' https://api.kie.ai https://cdn.kie.ai;
frame-ancestors 'none';
```

### Additional Security Headers

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`

### IPC Security

- Preload script exposes only specific, validated channels
- Raw `ipcRenderer` is never exposed to the renderer
- Channel allowlists prevent arbitrary IPC calls

### Network Security

- Server binds only to `127.0.0.1` (localhost)
- Dynamic port allocation avoids conflicts
- API keys stored server-side in SQLite, never exposed to renderer

## See Also

- [Development](development.md) - Development workflow
- [API Reference](api.md) - Endpoint documentation
