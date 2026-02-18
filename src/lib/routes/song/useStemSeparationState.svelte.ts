import type { StemSeparation, StemSeparationType } from '$lib/types';

type StemSeparationsContext = {
	updates: Map<number, Partial<StemSeparation>>;
	set: (id: number, data: Partial<StemSeparation>) => void;
};

export function useStemSeparationState(options: {
	generationId: () => number;
	audioId: () => string;
	getInitialStemSeparations: () => StemSeparation[];
	stemSeparationsContext: StemSeparationsContext | undefined;
}) {
	const { generationId, audioId, getInitialStemSeparations, stemSeparationsContext } = options;

	let newStemSeparations = $state<StemSeparation[]>([]);
	let separatingType = $state<StemSeparationType | null>(null);
	let showStemOptions = $state(false);

	const stemSeparations = $derived.by(() => {
		const initialStemSeparations = getInitialStemSeparations();
		const serverData = initialStemSeparations.map((separation) => {
			const updates = stemSeparationsContext?.updates.get(separation.id);
			return updates ? { ...separation, ...updates } : separation;
		});

		return [
			...serverData,
			...newStemSeparations.filter(
				(item) => !serverData.find((serverItem) => serverItem.id === item.id)
			)
		];
	});

	const vocalSeparation = $derived(
		stemSeparations.find((item) => item.type === 'separate_vocal' && item.status === 'success')
	);
	const stemSeparation = $derived(
		stemSeparations.find((item) => item.type === 'split_stem' && item.status === 'success')
	);
	const pendingVocalSeparation = $derived(
		stemSeparations.find(
			(item) =>
				item.type === 'separate_vocal' &&
				(item.status === 'pending' || item.status === 'processing')
		)
	);
	const pendingStemSeparation = $derived(
		stemSeparations.find(
			(item) =>
				item.type === 'split_stem' && (item.status === 'pending' || item.status === 'processing')
		)
	);

	function toggleStemOptions() {
		showStemOptions = !showStemOptions;
	}

	async function requestStemSeparation(type: StemSeparationType) {
		separatingType = type;
		showStemOptions = false;

		try {
			const response = await fetch('/api/stem-separation', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					generationId: generationId(),
					audioId: audioId(),
					type
				})
			});

			if (!response.ok) {
				const error = await response.json();
				console.error('Failed to start stem separation:', error);
				separatingType = null;
				return;
			}

			const newSeparation = (await response.json()) as StemSeparation;
			if (!newStemSeparations.find((item) => item.id === newSeparation.id)) {
				newStemSeparations = [...newStemSeparations, newSeparation];
			}
		} catch (error) {
			console.error('Failed to start stem separation:', error);
			separatingType = null;
		}
	}

	return {
		get stemSeparations() {
			return stemSeparations;
		},
		get separatingType() {
			return separatingType;
		},
		get showStemOptions() {
			return showStemOptions;
		},
		get vocalSeparation() {
			return vocalSeparation;
		},
		get stemSeparation() {
			return stemSeparation;
		},
		get pendingVocalSeparation() {
			return pendingVocalSeparation;
		},
		get pendingStemSeparation() {
			return pendingStemSeparation;
		},
		toggleStemOptions,
		requestStemSeparation
	};
}
