import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), devtoolsJson()],

	server: {
		watch: {
			// Ignore SQLite database files to prevent dev server restarts during generation
			ignored: ['**/kie-music.db*']
		}
	},

	// Ensure native modules are properly handled
	build: {
		rollupOptions: {
			external: ['better-sqlite3']
		}
	},

	// Optimize deps for Electron
	optimizeDeps: {
		exclude: ['better-sqlite3']
	},

	test: {
		expect: { requireAssertions: true },

		projects: [
			{
				extends: './vite.config.ts',

				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
