# Project Guidelines

## Code Style
- Svelte 5 runes only: use `$props`, `$state`, `$derived`, `$effect`; avoid Svelte 4 patterns. Example patterns in [src/routes/+page.svelte](src/routes/+page.svelte) and [src/routes/+layout.svelte](src/routes/+layout.svelte).
- Svelte 5 store pattern: implement stores in `.svelte.ts` with `$state` and expose state via getters + methods, not writable stores. Example in [src/lib/stores/audio.svelte.ts](src/lib/stores/audio.svelte.ts).
- `$apply` is a last resort; in 99% of cases it is not needed.
- Navigation must use `resolve()` with `goto()` and `href={resolve(...)}`. See [src/routes/+page.svelte](src/routes/+page.svelte).
- Keep server-only logic in `.server.ts` modules; do not import them in client code. Examples in [src/lib/db.server.ts](src/lib/db.server.ts) and [src/lib/kie-api.server.ts](src/lib/kie-api.server.ts).

## Architecture
- Electron main process boots a local SvelteKit server, then loads the renderer from localhost. See [electron/main.js](electron/main.js) and [docs/architecture.md](docs/architecture.md).
- DB access, KIE API, polling, and SSE are server-side helpers in `$lib`. See [src/lib/polling.server.ts](src/lib/polling.server.ts) and [src/lib/sse.server.ts](src/lib/sse.server.ts).

## Build and Test
- Install: `npm install`
- Dev: `npm run dev` (browser), `npm run dev:electron` (Electron)
- Build: `npm run build`, `npm run build:electron`
- Quality: `npm run check`, `npm run lint`, `npm run format`
- Tests: `npm run test`, `npm run test:unit`

## Project Conventions
- DB repository pattern: SQL and data access live under [src/lib/db/](src/lib/db/) and are re-exported via [src/lib/db.server.ts](src/lib/db.server.ts).
- API routes live under [src/routes/api/](src/routes/api/) and should validate inputs before calling server helpers. Examples in [src/routes/api/generations/+server.ts](src/routes/api/generations/+server.ts).
- Layout composition uses `children` from `$props()` with `{@render children()}`. See [src/routes/+layout.svelte](src/routes/+layout.svelte).

## Integration Points
- KIE API is server-side only; API key comes from DB settings with env fallback. See [src/lib/kie-api.server.ts](src/lib/kie-api.server.ts) and [docs/api.md](docs/api.md).
- Async tasks are polled server-side and updates are pushed via SSE. See [src/lib/polling.server.ts](src/lib/polling.server.ts) and [src/lib/sse.server.ts](src/lib/sse.server.ts).
- SQLite database location is configured via Electron on startup. See [electron/main.js](electron/main.js) and [docs/development.md](docs/development.md).

## Security
- Renderer is locked down (no Node integration, context isolation enabled); server binds to localhost with CSP/headers. See [electron/main.js](electron/main.js) and [docs/architecture.md](docs/architecture.md).
- Never expose the raw API key to the renderer; settings API masks it. See [src/routes/api/settings/+server.ts](src/routes/api/settings/+server.ts).
