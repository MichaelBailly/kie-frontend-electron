# Development Guide

This guide covers setup, development workflow, and contribution guidelines.

## Prerequisites

- **Node.js 20+** (LTS recommended)
- **npm 10+**
- **KIE API key** from [kie.ai](https://kie.ai)

## Setup

```bash
# Clone the repository
git clone <repository-url>
cd kie-frontend-electron

# Install dependencies
npm install

# Configure API key (optional - can also set in app Settings)
echo "KIE_API_KEY=your_api_key_here" > .env
```

## Development Workflow

### Web Development Mode

For rapid UI development with hot reload:

```bash
npm run dev
```

Opens at `http://localhost:5173`. Changes to Svelte components reload instantly.

### Electron Development

To test the full desktop experience:

```bash
npm run dev:electron
```

This builds SvelteKit and launches Electron. Restart required for changes.

### Available Scripts

| Script                   | Description                            |
| ------------------------ | -------------------------------------- |
| `npm run dev`            | Start Vite dev server with HMR         |
| `npm run build`          | Build SvelteKit for production         |
| `npm run electron`       | Launch Electron (requires build first) |
| `npm run dev:electron`   | Build + launch Electron                |
| `npm run build:electron` | Package for distribution               |
| `npm run test`           | Run tests once                         |
| `npm run test:unit`      | Run tests in watch mode                |
| `npm run check`          | TypeScript and Svelte checks           |
| `npm run lint`           | Lint with ESLint and Prettier          |
| `npm run format`         | Auto-format code                       |

## Testing

Tests use Vitest and are located alongside source files with `.spec.ts` extension.

```bash
# Run all tests
npm run test

# Watch mode
npm run test:unit

# Run specific test file
npm run test:unit -- src/lib/settings.spec.ts
```

### Writing Tests

```typescript
import { describe, it, expect } from 'vitest';

describe('MyFeature', () => {
	it('should work correctly', () => {
		expect(myFunction()).toBe(expected);
	});
});
```

## Code Style

### Svelte 5 Patterns

This project uses Svelte 5 runes:

```svelte
<script lang="ts">
	// Props
	let { data } = $props();

	// Reactive state
	let count = $state(0);

	// Derived values
	let doubled = $derived(count * 2);

	// Effects
	$effect(() => {
		console.log('count changed:', count);
	});
</script>
```

### TypeScript

- Use strict types; avoid `any`
- Server-only code in `*.server.ts` files
- Shared types in `src/lib/types.ts`

### Styling

TailwindCSS 4 utility classes. Follow existing patterns:

- Dark theme with purple accent
- Consistent spacing and typography
- Responsive design

## Project Structure

See [Architecture](architecture.md) for detailed structure.

Key conventions:

- API routes in `src/routes/api/`
- Server-side logic in `*.server.ts`
- Tests alongside source as `*.spec.ts`
- Shared utilities in `src/lib/`

## Database

SQLite database file: `kie-music.db` (auto-created on first run)

To inspect:

```bash
sqlite3 kie-music.db ".tables"
sqlite3 kie-music.db ".schema generations"
```

Database is excluded from git. Schema migrations run automatically on startup.

## Building for Distribution

```bash
npm run build:electron
```

Outputs to `dist-electron/`:

| Platform | Formats                  |
| -------- | ------------------------ |
| Linux    | AppImage, deb            |
| macOS    | dmg, zip                 |
| Windows  | NSIS installer, portable |

Configuration in `package.json` under the `build` key.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make changes with tests
4. Run `npm run check && npm run test && npm run lint`
5. Commit with clear message
6. Open a pull request

### Commit Messages

Follow conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance

## Troubleshooting

### Native module errors

```bash
npm run postinstall
# or
npx electron-rebuild
```

### Database locked

Ensure only one instance of the app is running.

### TypeScript errors after schema change

```bash
npm run prepare
```

## See Also

- [Architecture](architecture.md) - System design
- [API Reference](api.md) - Endpoint documentation
