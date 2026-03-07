import type { WavConversion } from '$lib/types';

type WavConversionsContext = {
	updates: Map<number, Partial<WavConversion>>;
	set: (id: number, data: Partial<WavConversion>) => void;
};

export function useWavConversionState(options: {
	generationId: () => number;
	audioId: () => string;
	getInitialWavConversions: () => WavConversion[];
	wavConversionsContext: WavConversionsContext | undefined;
}) {
	const { generationId, audioId, getInitialWavConversions, wavConversionsContext } = options;

	let newWavConversions = $state<WavConversion[]>([]);
	let isConverting = $state(false);

	const wavConversions = $derived.by(() => {
		const initialWavConversions = getInitialWavConversions();
		const serverData = initialWavConversions.map((conversion) => {
			const updates = wavConversionsContext?.updates.get(conversion.id);
			return updates ? { ...conversion, ...updates } : conversion;
		});

		return [
			...serverData,
			...newWavConversions
				.filter((item) => !serverData.find((serverItem) => serverItem.id === item.id))
				.map((item) => {
					const updates = wavConversionsContext?.updates.get(item.id);
					return updates ? { ...item, ...updates } : item;
				})
		];
	});

	const wavConversion = $derived(
		wavConversions.find((item) => item.status === 'success' && !!item.wav_url)
	);
	const pendingWavConversion = $derived(
		wavConversions.find((item) => item.status === 'pending' || item.status === 'processing')
	);

	async function requestWavConversion() {
		isConverting = true;

		try {
			const response = await fetch('/api/wav-conversion', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					generationId: generationId(),
					audioId: audioId()
				})
			});

			if (!response.ok) {
				const error = await response.json();
				console.error('Failed to start WAV conversion:', error);
				isConverting = false;
				return;
			}

			const newConversion = (await response.json()) as WavConversion;
			if (!newWavConversions.find((item) => item.id === newConversion.id)) {
				newWavConversions = [...newWavConversions, newConversion];
			}
		} catch (error) {
			console.error('Failed to start WAV conversion:', error);
		} finally {
			isConverting = false;
		}
	}

	return {
		get wavConversions() {
			return wavConversions;
		},
		get wavConversion() {
			return wavConversion;
		},
		get pendingWavConversion() {
			return pendingWavConversion;
		},
		get isConverting() {
			return isConverting;
		},
		requestWavConversion
	};
}
