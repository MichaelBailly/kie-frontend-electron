# KIE Music

A desktop application for AI-powered music generation, built with Electron and SvelteKit.

KIE Music provides a streamlined interface to the [KIE.ai](https://kie.ai) API, enabling musicians, producers, and creators to generate, organize, and refine AI-composed tracks from their desktop.

## Features

- **Music Generation** - Create original tracks using text prompts, styles, and multiple AI models (V4, V4.5, V5)
- **Project Organization** - Manage generations in projects with metadata, favorites, and search
- **Song Extension** - Extend existing tracks to create longer compositions
- **Stem Separation** - Extract vocals, drums, bass, and other instruments from any track
- **Offline Database** - All projects and metadata stored locally in SQLite
- **Cross-Platform** - Runs on Linux, macOS, and Windows

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run as Electron app
npm run build && npm run electron
```

Configure your KIE API key in **Settings** (gear icon) or via the `KIE_API_KEY` environment variable.

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/architecture.md) | System design, tech stack, and project structure |
| [Development](docs/development.md) | Setup, scripts, testing, and contribution guidelines |
| [API Reference](docs/api.md) | KIE API integration and internal endpoints |

## Tech Stack

- **Electron 36** - Desktop runtime
- **SvelteKit** - Application framework with SSR
- **Svelte 5** - Reactive UI with runes
- **SQLite** (better-sqlite3) - Local database
- **TailwindCSS 4** - Styling
- **TypeScript** - Type safety
- **Vitest** - Testing

## Building for Distribution

```bash
npm run build:electron
```

Outputs to `dist-electron/`:
- Linux: AppImage, deb
- macOS: dmg, zip
- Windows: NSIS installer, portable

## Contributing

Contributions are welcome. Please read [Development](docs/development.md) for setup instructions and coding standards.

## License

MIT
