import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import ArtworkImage from './ArtworkImage.svelte';

describe('ArtworkImage', () => {
	it('should be a valid Svelte component', () => {
		expect(ArtworkImage).toBeTruthy();
	});

	it('renders fallback music note when src is missing', () => {
		const { body } = render(ArtworkImage, {
			props: {
				src: null,
				alt: 'Song cover'
			}
		});

		expect(body).toContain('<svg');
		expect(body).not.toContain('<img');
	});

	it('renders image tag when src is provided', () => {
		const { body } = render(ArtworkImage, {
			props: {
				src: 'https://example.com/cover.jpg',
				alt: 'Song cover'
			}
		});

		expect(body).toContain('<img');
		expect(body).toContain('https://example.com/cover.jpg');
	});
});
