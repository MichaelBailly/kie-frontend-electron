import type { Generation } from '$lib/types';

export interface GenerationFormState {
	title: string;
	style: string;
	lyrics: string;
	negativeTags: string;
	instrumental: boolean;
}

export function createGenerationFormState(
	generation: Pick<Generation, 'title' | 'style' | 'lyrics' | 'negative_tags' | 'instrumental'>
): GenerationFormState {
	return {
		title: generation.title ?? '',
		style: generation.style ?? '',
		lyrics: generation.lyrics ?? '',
		negativeTags: generation.negative_tags ?? '',
		instrumental: !!generation.instrumental
	};
}
