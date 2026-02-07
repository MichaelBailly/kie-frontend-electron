import type { Handle } from '@sveltejs/kit';
import { getPendingGenerations, getPendingStemSeparations } from '$lib/db.server';
import {
	recoverIncompleteGenerations,
	recoverIncompleteStemSeparations
} from '$lib/polling.server';

// Run recovery on server startup
const incompleteGenerations = getPendingGenerations();
recoverIncompleteGenerations(incompleteGenerations);

const incompleteStemSeparations = getPendingStemSeparations();
recoverIncompleteStemSeparations(incompleteStemSeparations);

export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	// Add security headers
	// Content Security Policy for Electron desktop app
	const csp = [
		"default-src 'self'",
		// Allow inline styles for Svelte/Tailwind and unsafe-eval for dev
		"style-src 'self' 'unsafe-inline'",
		// Allow scripts from self, inline for Svelte hydration
		"script-src 'self' 'unsafe-inline'",
		// Allow images from any HTTPS source (API returns various CDN domains)
		"img-src 'self' data: blob: https:",
		// Allow audio/video from any HTTPS source
		"media-src 'self' blob: https:",
		// Keep connect-src more restrictive - only known API domains
		"connect-src 'self' https://api.kie.ai https://cdn.kie.ai https://*.kie.ai https://*.aiquickdraw.com",
		// Allow fonts from self
		"font-src 'self'",
		// Prevent framing
		"frame-ancestors 'none'",
		// Form submissions only to self
		"form-action 'self'",
		// Base URI restriction
		"base-uri 'self'"
	].join('; ');

	response.headers.set('Content-Security-Policy', csp);
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

	return response;
};
