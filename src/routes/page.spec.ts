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

	it('renders API key warning when hasApiKey is false', () => {
		const data = {
			projects: [],
			hasApiKey: false,
			highlightsCount: 0
		};

		const { body } = render(Page, { props: { data } });
		expect(body).toContain('API key required');
	});

	it('renders highlights shortcut when highlights are available', () => {
		const data = {
			projects: [],
			hasApiKey: true,
			highlightsCount: 3
		};

		const { body } = render(Page, { props: { data } });
		expect(body).toContain('Highlights');
	});

	it('renders projects sorted by latest updated_at first by default', () => {
		const data = {
			projects: [
				{
					id: 1,
					name: 'Older Project',
					is_open: true,
					created_at: '2026-02-27T12:00:00.000Z',
					updated_at: '2026-02-27T12:00:00.000Z',
					generationCount: 1,
					lastGenerationId: 10,
					lastGenerationTitle: 'Song A',
					lastGenerationStatus: 'success',
					lastGenerationImageUrl: null
				},
				{
					id: 2,
					name: 'Newer Project',
					is_open: true,
					created_at: '2026-02-28T12:00:00.000Z',
					updated_at: '2026-03-01T12:00:00.000Z',
					generationCount: 2,
					lastGenerationId: 11,
					lastGenerationTitle: 'Song B',
					lastGenerationStatus: 'processing',
					lastGenerationImageUrl: null
				}
			],
			hasApiKey: true,
			highlightsCount: 0
		};

		const { body } = render(Page, { props: { data } });
		expect(body.indexOf('Newer Project')).toBeLessThan(body.indexOf('Older Project'));
	});
});
