import { describe, expect, it } from 'vitest';
import Page from './+page.svelte';

describe('song +page.svelte', () => {
	it('should be a valid Svelte component', () => {
		expect(Page).toBeTruthy();
	});
});
