import { describe, expect, it, vi } from 'vitest';
import { createStemSeparation } from '$lib/test-utils/fixtures/entities';
import type { StemSeparation } from '$lib/types';
import { SvelteMap } from 'svelte/reactivity';

import { useStemSeparationState } from './useStemSeparationState.svelte';

function makeContext() {
	const updates = new SvelteMap<number, Partial<StemSeparation>>();
	return {
		updates,
		set(id: number, data: Partial<StemSeparation>) {
			updates.set(id, data);
		}
	};
}

function makeState(initialStemSeparations: StemSeparation[], context = makeContext()) {
	return {
		state: useStemSeparationState({
			generationId: () => 1,
			audioId: () => 'audio-1',
			getInitialStemSeparations: () => initialStemSeparations,
			stemSeparationsContext: context
		}),
		context
	};
}

describe('useStemSeparationState', () => {
	describe('SSE updates for initial (server-loaded) separations', () => {
		it('applies SSE update to an initial separation', async () => {
			const initial = createStemSeparation({ id: 10, status: 'pending' });
			const { state, context } = makeState([initial]);

			expect(state.stemSeparations[0].status).toBe('pending');

			context.set(10, { status: 'success', vocal_url: 'https://cdn.example.com/vocal.mp3' });
			await Promise.resolve();

			expect(state.stemSeparations[0].status).toBe('success');
			expect(state.stemSeparations[0].vocal_url).toBe('https://cdn.example.com/vocal.mp3');
		});
	});

	describe('SSE updates for newly-created separations', () => {
		it('applies SSE update to a newly-created separation', async () => {
			const newSeparation = createStemSeparation({ id: 99, status: 'pending' });
			const fetchMock = vi
				.fn()
				.mockResolvedValue({ ok: true, json: async () => newSeparation } as Response);
			vi.stubGlobal('fetch', fetchMock);

			const { state, context } = makeState([]);

			// Simulate a POST to /api/stem-separation that returns the new separation
			await state.requestStemSeparation('separate_vocal');
			await Promise.resolve();

			expect(state.stemSeparations).toHaveLength(1);
			expect(state.stemSeparations[0].status).toBe('pending');

			// SSE update arrives: stem separation completed
			context.set(99, { status: 'success', vocal_url: 'https://cdn.example.com/vocal.mp3' });
			await Promise.resolve();

			expect(state.stemSeparations[0].status).toBe('success');
			expect(state.stemSeparations[0].vocal_url).toBe('https://cdn.example.com/vocal.mp3');
		});

		it('reflects processing status for a newly-created separation', async () => {
			const newSeparation = createStemSeparation({ id: 100, status: 'pending' });
			const fetchMock = vi
				.fn()
				.mockResolvedValue({ ok: true, json: async () => newSeparation } as Response);
			vi.stubGlobal('fetch', fetchMock);

			const { state, context } = makeState([]);

			await state.requestStemSeparation('split_stem');
			await Promise.resolve();

			expect(state.stemSeparations[0].status).toBe('pending');

			context.set(100, { status: 'processing' });
			await Promise.resolve();
			expect(state.stemSeparations[0].status).toBe('processing');

			context.set(100, { status: 'success', vocal_url: 'https://cdn.example.com/vocal.mp3' });
			await Promise.resolve();
			expect(state.stemSeparations[0].status).toBe('success');
		});

		it('vocalSeparation is populated when new separation SSE completes', async () => {
			const newSeparation = createStemSeparation({
				id: 101,
				status: 'pending',
				type: 'separate_vocal'
			});
			const fetchMock = vi
				.fn()
				.mockResolvedValue({ ok: true, json: async () => newSeparation } as Response);
			vi.stubGlobal('fetch', fetchMock);

			const { state, context } = makeState([]);

			await state.requestStemSeparation('separate_vocal');
			await Promise.resolve();

			expect(state.vocalSeparation).toBeUndefined();

			context.set(101, { status: 'success', vocal_url: 'https://cdn.example.com/vocal.mp3' });
			await Promise.resolve();

			expect(state.vocalSeparation).toBeDefined();
			expect(state.vocalSeparation?.vocal_url).toBe('https://cdn.example.com/vocal.mp3');
		});
	});
});
