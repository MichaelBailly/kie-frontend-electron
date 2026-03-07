import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			out: 'build',
			precompress: true, // Enable gzip/brotli compression for better performance
			envPrefix: ''
		}),
		// Electron renders from the same localhost server, but the Origin header can
		// be null or mismatched in the renderer process, triggering SvelteKit's CSRF
		// guard. The server only ever binds to 127.0.0.1, so trusting all origins is
		// safe — real cross-origin requests from outside the app are not possible.
		csrf: {
			trustedOrigins: ['*']
		}
	}
};

export default config;
