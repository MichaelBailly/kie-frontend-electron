import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import UploadInstrumentalModal from './UploadInstrumentalModal.svelte';

describe('UploadInstrumentalModal', () => {
	it('renders the style collection picker next to tags when open', () => {
		const { body } = render(UploadInstrumentalModal, {
			props: {
				isOpen: true,
				onClose: () => {}
			}
		});

		expect(body).toContain('for="upload-tags"');
		expect(body).toContain('My Styles');
		expect(body).toContain('title="Pick from style collection"');
	});

	it('renders the 200 character limit for negative tags', () => {
		const { body } = render(UploadInstrumentalModal, {
			props: {
				isOpen: true,
				onClose: () => {}
			}
		});

		expect(body).toContain('maxlength="200"');
		expect(body).toContain('/200 characters');
	});
});
