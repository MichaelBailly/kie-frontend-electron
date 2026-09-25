import { describe, it, expect } from 'vitest';
import { DEFAULT_SUNO_MODEL, SUNO_MODELS, getModelLabel } from './types';

describe('SUNO model definitions', () => {
	it('defaults to V6', () => {
		expect(DEFAULT_SUNO_MODEL).toBe('V6');
	});

	it('only offers the current V6 family for new generations', () => {
		expect(SUNO_MODELS.map((model) => model.value)).toEqual(['V6', 'V6_MINI', 'V6_WILD']);
		for (const model of SUNO_MODELS) {
			expect(model.description.length).toBeGreaterThan(0);
		}
	});

	it('includes the default model in the selectable list', () => {
		expect(SUNO_MODELS.some((model) => model.value === DEFAULT_SUNO_MODEL)).toBe(true);
	});

	it('returns human-readable labels for current and discontinued models', () => {
		expect(getModelLabel('V6')).toBe('V6');
		expect(getModelLabel('V6_MINI')).toBe('V6 Mini');
		expect(getModelLabel('V6_WILD')).toBe('V6 Wild');
		expect(getModelLabel('V5')).toBe('V5');
		expect(getModelLabel('V5_5')).toBe('V5.5');
	});
});
