import { describe, expect, it, vi } from 'vitest';
import { createWavConversion } from '$lib/test-utils/fixtures/entities';
import type { WavConversion } from '$lib/types';

import { useWavConversionState } from './useWavConversionState.svelte';

function makeContext() {
	const updates = new Map<number, Partial<WavConversion>>();
	return {
		updates,
		set(id: number, data: Partial<WavConversion>) {
			updates.set(id, data);
		}
	};
}

function makeState(initialWavConversions: WavConversion[], context = makeContext()) {
	return {
		state: useWavConversionState({
			generationId: () => 1,
			audioId: () => 'audio-1',
			getInitialWavConversions: () => initialWavConversions,
			wavConversionsContext: context
		}),
		context
	};
}

describe('useWavConversionState', () => {
	it('applies SSE updates to an initial conversion', () => {
		const initial = createWavConversion({ id: 10, status: 'pending' });
		const { state, context } = makeState([initial]);

		expect(state.wavConversions[0].status).toBe('pending');

		context.set(10, { status: 'success', wav_url: 'https://cdn.example.com/render.wav' });

		expect(state.wavConversions[0].status).toBe('success');
		expect(state.wavConversions[0].wav_url).toBe('https://cdn.example.com/render.wav');
	});

	it('tracks a newly-created conversion and completion updates', async () => {
		const newConversion = createWavConversion({ id: 99, status: 'pending' });
		const fetchMock = vi
			.fn()
			.mockResolvedValue({ ok: true, json: async () => newConversion } as Response);
		vi.stubGlobal('fetch', fetchMock);

		const { state, context } = makeState([]);

		await state.requestWavConversion();

		expect(state.wavConversions).toHaveLength(1);
		expect(state.pendingWavConversion?.id).toBe(99);

		context.set(99, { status: 'success', wav_url: 'https://cdn.example.com/render.wav' });

		expect(state.wavConversion?.wav_url).toBe('https://cdn.example.com/render.wav');
	});

	it('clears isConverting once the request resolves', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => createWavConversion({ id: 77 })
		} as Response);
		vi.stubGlobal('fetch', fetchMock);

		const { state } = makeState([]);
		await state.requestWavConversion();

		expect(state.isConverting).toBe(false);
	});
});
