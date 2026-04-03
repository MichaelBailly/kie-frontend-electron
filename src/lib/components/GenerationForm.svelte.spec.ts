import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import GenerationForm from './GenerationForm.svelte';

describe('GenerationForm', () => {
	it('renders the 200 character limit for negative tags', () => {
		const { body } = render(GenerationForm, {
			props: {
				title: '',
				style: '',
				lyrics: '',
				negativeTags: '',
				instrumental: false,
				sunoModel: 'V5',
				onNewGeneration: () => {}
			}
		});

		expect(body).toContain('id="negative-tags"');
		expect(body).toContain('maxlength="200"');
		expect(body).toContain('/200 characters');
	});
});
