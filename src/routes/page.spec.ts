import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import Page from './+page.svelte';

describe('/+page.svelte', () => {
	it('should render as a valid Svelte component', () => {
		expect(Page).toBeTruthy();
	});

	it('renders in SSR with project card image data', () => {
		const data = {
			projects: [
				{
					id: 1,
					name: 'Project 1',
					is_open: true,
					created_at: '2026-02-27T12:00:00.000Z',
					updated_at: '2026-02-27T12:00:00.000Z',
					generationCount: 1,
					lastGenerationId: 10,
					lastGenerationTitle: 'Song A',
					lastGenerationStatus: 'success',
					lastGenerationImageUrl: 'https://example.com/cover.jpg'
				}
			],
			hasApiKey: true,
			highlightsCount: 0
		};

		expect(() => render(Page, { props: { data } })).not.toThrow();
	});

	it('renders in SSR with project card missing image', () => {
		const data = {
			projects: [
				{
					id: 1,
					name: 'Project 1',
					is_open: true,
					created_at: '2026-02-27T12:00:00.000Z',
					updated_at: '2026-02-27T12:00:00.000Z',
					generationCount: 1,
					lastGenerationId: 10,
					lastGenerationTitle: 'Song A',
					lastGenerationStatus: 'success',
					lastGenerationImageUrl: null
				}
			],
			hasApiKey: true,
			highlightsCount: 0
		};

		expect(() => render(Page, { props: { data } })).not.toThrow();
	});
});
