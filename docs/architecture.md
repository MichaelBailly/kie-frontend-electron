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

| Layer | Technology | Purpose |
|-------|------------|---------|
| Runtime | Electron 36 | Desktop shell, native APIs |
| Framework | SvelteKit | Routing, SSR, API endpoints |
| UI | Svelte 5 | Reactive components with runes |
| Styling | TailwindCSS 4 | Utility-first CSS |
| Database | better-sqlite3 | Local SQLite storage |
| Build | Vite | Development server, bundling |
| Package | electron-builder | Cross-platform distribution |

## Project Structure

```
kie-frontend-electron/
├── electron/
│   ├── main.js           # Electron main process, starts SvelteKit server
│   └── preload.js        # Context bridge for renderer
├── src/
│   ├── lib/
│   │   ├── db.server.ts      # Database operations
│   │   ├── kie-api.server.ts # KIE API client
│   │   └── constants.server.ts
│   └── routes/
│       ├── +page.svelte      # Home / project list
│       ├── settings/         # API key configuration
│       ├── projects/[id]/    # Project detail view
│       │   └── generations/  # Generation detail
│       └── api/              # Internal API endpoints
│           ├── generations/  # CRUD for generations
│           ├── projects/     # CRUD for projects
│           ├── settings/     # Settings management
│           ├── sse/          # Server-sent events for polling
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
4. SSE endpoint polls KIE API for status updates
5. On completion, audio URLs saved to database
6. UI updates reactively via SSE

### Database Schema

Key tables:

- **projects** - Organize generations into named projects
- **generations** - Music generation tasks with prompts, status, metadata
- **audios** - Generated audio tracks (multiple per generation)
- **stem_separations** - Vocal/stem extraction tasks
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

- API keys stored in local SQLite (not exposed to renderer)
- Preload script limits exposed APIs via contextBridge
- No external network access except KIE API

## See Also

- [Development](development.md) - Development workflow
- [API Reference](api.md) - Endpoint documentation
