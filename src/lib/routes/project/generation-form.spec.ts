import { describe, expect, it } from 'vitest';
import { createGeneration } from '$lib/test-utils/fixtures/entities';
import { createGenerationFormState } from './generation-form';

describe('createGenerationFormState', () => {
	it('includes negative tags when pre-filling from an existing generation', () => {
		const state = createGenerationFormState(
			createGeneration({
				title: 'Retry me',
				style: 'synth pop',
				lyrics: 'bright hooks',
				negative_tags: 'harsh cymbals',
				instrumental: 1
			})
		);

		expect(state).toEqual({
			title: 'Retry me',
			style: 'synth pop',
			lyrics: 'bright hooks',
			negativeTags: 'harsh cymbals',
			instrumental: true
		});
	});

	it('normalizes nullable generation fields to form-safe defaults', () => {
		const state = createGenerationFormState(
			createGeneration({
				style: '',
				lyrics: '',
				negative_tags: null,
				instrumental: 0
			})
		);

		expect(state.style).toBe('');
		expect(state.lyrics).toBe('');
		expect(state.negativeTags).toBe('');
		expect(state.instrumental).toBe(false);
	});
});
