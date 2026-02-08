import { describe, expect, it } from 'vitest';
import Page from './+page.svelte';

describe('/+page.svelte', () => {
	it('should render h1', async () => {
		expect(Page).toBeTruthy();
	});
});
