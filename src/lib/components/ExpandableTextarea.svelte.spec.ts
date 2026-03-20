import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import ExpandableTextarea from './ExpandableTextarea.svelte';

describe('ExpandableTextarea', () => {
	it('renders the textarea with provided value and placeholder', () => {
		const { body } = render(ExpandableTextarea, {
			props: { value: 'My lyrics', label: 'Lyrics', placeholder: 'Write lyrics...' }
		});

		expect(body).toContain('My lyrics');
		expect(body).toContain('Write lyrics...');
	});

	it('renders the expand button with an accessible label', () => {
		const { body } = render(ExpandableTextarea, {
			props: { value: '', label: 'Style Prompt' }
		});

		expect(body).toContain('Expand Style Prompt editor');
	});

	it('does not render focus mode overlay when not expanded (SSR initial state)', () => {
		const { body } = render(ExpandableTextarea, {
			props: { value: '', label: 'Lyrics' }
		});

		// Focus mode header should not be present in unexpanded initial render
		expect(body).not.toContain('Focus mode');
	});

	it('renders with maxlength attribute when provided', () => {
		const { body } = render(ExpandableTextarea, {
			props: { value: '', label: 'Lyrics', maxlength: 5000 }
		});

		expect(body).toContain('maxlength="5000"');
	});

	it('renders with the provided id on the inline textarea', () => {
		const { body } = render(ExpandableTextarea, {
			props: { value: '', label: 'Style', id: 'style-input' }
		});

		expect(body).toContain('id="style-input"');
	});

	it('applies extra textareaClass to the inline textarea', () => {
		const { body } = render(ExpandableTextarea, {
			props: { value: '', label: 'Lyrics', textareaClass: 'font-mono text-sm' }
		});

		expect(body).toContain('font-mono');
		expect(body).toContain('text-sm');
	});
});
