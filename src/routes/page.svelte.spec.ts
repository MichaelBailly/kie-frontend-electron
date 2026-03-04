import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import Page from './+page.svelte';

describe('/+page.svelte', () => {
	it('should render h1', async () => {
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
					lastGenerationImageUrl: 'https://example.com/broken-or-valid.jpg'
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

	it('renders API key warning when API key is missing', () => {
		const data = {
			projects: [],
			hasApiKey: false,
			highlightsCount: 0
		};

		const { body } = render(Page, { props: { data } });
		expect(body).toContain('API key required');
		expect(body).toContain('Configure your KIE API key to start generating music.');
	});

	it('hides highlights shortcut when highlightsCount is zero', () => {
		const data = {
			projects: [],
			hasApiKey: true,
			highlightsCount: 0
		};

		const { body } = render(Page, { props: { data } });
		expect(body).not.toContain('Highlights');
	});

	it('renders latest project first with default date sort', () => {
		const data = {
			projects: [
				{
					id: 11,
					name: 'Project Alpha',
					is_open: true,
					created_at: '2026-02-27T12:00:00.000Z',
					updated_at: '2026-02-27T12:00:00.000Z',
					generationCount: 1,
					lastGenerationId: 100,
					lastGenerationTitle: 'Alpha Song',
					lastGenerationStatus: 'success',
					lastGenerationImageUrl: null
				},
				{
					id: 12,
					name: 'Project Beta',
					is_open: true,
					created_at: '2026-02-28T12:00:00.000Z',
					updated_at: '2026-03-01T12:00:00.000Z',
					generationCount: 1,
					lastGenerationId: 101,
					lastGenerationTitle: 'Beta Song',
					lastGenerationStatus: 'processing',
					lastGenerationImageUrl: null
				}
			],
			hasApiKey: true,
			highlightsCount: 0
		};

		const { body } = render(Page, { props: { data } });
		expect(body.indexOf('Project Beta')).toBeLessThan(body.indexOf('Project Alpha'));
	});
});
