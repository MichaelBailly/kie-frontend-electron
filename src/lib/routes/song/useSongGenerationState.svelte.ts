import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import type { ActiveProjectContext, AnnotationsContext } from '$lib/routes/project/context';
import type { Generation, VariationAnnotation } from '$lib/types';

type SongData = {
	id: string;
	streamUrl: string | null;
	audioUrl: string | null;
	imageUrl: string | null;
	duration: number | null;
	title: string;
};

type SongPageStateData = {
	generation: Generation;
	song: SongData;
	annotation: VariationAnnotation | null;
};

type ExtendData = {
	title: string;
	style: string;
	lyrics: string;
	negativeTags: string;
	continueAt: number;
	instrumental: boolean;
};

type AddInstrumentalData = {
	title: string;
	tags: string;
	negativeTags: string;
};

type AddVocalsData = {
	title: string;
	prompt: string;
	style: string;
	negativeTags: string;
};

type GenerationFormMode =
	| {
			kind: 'idle';
	  }
	| {
			kind: 'extend';
			stemType: string | null;
			stemUrl: string | null;
	  }
	| {
			kind: 'addInstrumental';
			stemType: string;
			stemUrl: string;
	  }
	| {
			kind: 'addVocals';
			stemType: string;
			stemUrl: string;
	  };

export function useSongGenerationState(options: {
	getData: () => SongPageStateData;
	activeProjectContext: ActiveProjectContext | undefined;
	annotationsContext: AnnotationsContext | undefined;
}) {
	const { getData, activeProjectContext, annotationsContext } = options;

	let formMode = $state<GenerationFormMode>({ kind: 'idle' });
	let starredOverride = $state<boolean | null>(null);
	let starAnimClass = $state('');

	const generation = $derived.by(() => {
		const data = getData();
		const generationId = data.generation.id;
		const liveProject = activeProjectContext?.current;

		if (liveProject) {
			const liveGeneration = liveProject.generations.find((item) => item.id === generationId);
			if (liveGeneration) {
				return liveGeneration;
			}
		}

		return data.generation;
	});

	const song = $derived.by(() => {
		const data = getData();
		const songId = data.song.id;

		if (songId === generation.track1_audio_id) {
			return {
				id: generation.track1_audio_id || '',
				streamUrl: generation.track1_stream_url,
				audioUrl: generation.track1_audio_local_url || generation.track1_audio_url,
				imageUrl: generation.track1_image_local_url || generation.track1_image_url,
				duration: generation.track1_duration,
				title: `${generation.title} - Track 1`
			};
		}

		if (songId === generation.track2_audio_id) {
			return {
				id: generation.track2_audio_id || '',
				streamUrl: generation.track2_stream_url,
				audioUrl: generation.track2_audio_local_url || generation.track2_audio_url,
				imageUrl: generation.track2_image_local_url || generation.track2_image_url,
				duration: generation.track2_duration,
				title: `${generation.title} - Track 2`
			};
		}

		return data.song;
	});

	const baseAnnotation = $derived.by(() => getData().annotation ?? null);
	const liveAnnotation = $derived.by(() => annotationsContext?.get(generation.id, song.id));
	const currentAnnotation = $derived.by(() => liveAnnotation ?? baseAnnotation);
	const liveLabels = $derived.by(() => currentAnnotation?.labels ?? []);
	const starred = $derived.by(() => starredOverride ?? currentAnnotation?.starred === 1);

	$effect(() => {
		if (starredOverride === null) return;

		const liveStarred = currentAnnotation?.starred === 1;
		if (liveStarred === starredOverride) {
			starredOverride = null;
		}
	});

	async function handleToggleStar() {
		const wasStarred = starred;
		starredOverride = !starred;
		starAnimClass = !wasStarred ? 'star-burst' : 'star-unstar';
		setTimeout(() => (starAnimClass = ''), 600);

		try {
			await fetch(`/api/generations/${generation.id}/annotations`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ audioId: song.id, action: 'toggle_star' })
			});
		} catch {
			starredOverride = wasStarred;
		}
	}

	const showExtendForm = $derived(formMode.kind === 'extend');
	const showAddInstrumentalForm = $derived(formMode.kind === 'addInstrumental');
	const showAddVocalsForm = $derived(formMode.kind === 'addVocals');
	const extendingStemType = $derived(formMode.kind === 'extend' ? formMode.stemType : null);
	const extendingStemUrl = $derived(formMode.kind === 'extend' ? formMode.stemUrl : null);
	const addInstrumentalStemType = $derived(
		formMode.kind === 'addInstrumental' ? formMode.stemType : null
	);
	const addInstrumentalStemUrl = $derived(
		formMode.kind === 'addInstrumental' ? formMode.stemUrl : null
	);
	const addVocalsStemType = $derived(formMode.kind === 'addVocals' ? formMode.stemType : null);
	const addVocalsStemUrl = $derived(formMode.kind === 'addVocals' ? formMode.stemUrl : null);

	function resetFormMode() {
		formMode = { kind: 'idle' };
	}

	function openFormMode(nextMode: Exclude<GenerationFormMode, { kind: 'idle' }>) {
		formMode = nextMode;
	}

	async function createGenerationAndNavigate(
		url: string,
		body: Record<string, unknown>,
		errorMessage: string
	): Promise<void> {
		const response = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});

		if (!response.ok) {
			console.error(errorMessage);
			return;
		}

		const newGeneration = await response.json();
		resetFormMode();

		await goto(
			resolve('/projects/[projectId]/generations/[generationId]', {
				projectId: String(generation.project_id),
				generationId: String(newGeneration.id)
			})
		);
	}

	function toggleExtendForm() {
		formMode =
			formMode.kind === 'extend'
				? { kind: 'idle' }
				: { kind: 'extend', stemType: null, stemUrl: null };
	}

	function closeExtendForm() {
		resetFormMode();
	}

	function openStemExtendForm(stemType: string, stemUrl: string) {
		openFormMode({ kind: 'extend', stemType, stemUrl });
	}

	function closeAddInstrumentalForm() {
		resetFormMode();
	}

	function openAddInstrumentalForm(stemType: string, stemUrl: string) {
		openFormMode({ kind: 'addInstrumental', stemType, stemUrl });
	}

	function closeAddVocalsForm() {
		resetFormMode();
	}

	function openAddVocalsForm(stemType: string, stemUrl: string) {
		openFormMode({ kind: 'addVocals', stemType, stemUrl });
	}

	async function handleExtend(extendData: ExtendData) {
		await createGenerationAndNavigate(
			'/api/generations/extend',
			{
				projectId: generation.project_id,
				title: extendData.title,
				style: extendData.style,
				lyrics: extendData.lyrics,
				negativeTags: extendData.negativeTags,
				extendsGenerationId: generation.id,
				extendsAudioId: song.id,
				continueAt: extendData.continueAt,
				instrumental: extendData.instrumental,
				stemType: extendingStemType,
				stemUrl: extendingStemUrl
			},
			'Failed to create extend generation'
		);
	}

	async function handleAddInstrumental(data: AddInstrumentalData) {
		if (!addInstrumentalStemType || !addInstrumentalStemUrl) {
			console.error('No stem selected for add instrumental');
			return;
		}

		await createGenerationAndNavigate(
			'/api/generations/add-instrumental',
			{
				projectId: generation.project_id,
				sourceGenerationId: generation.id,
				sourceAudioId: song.id,
				stemType: addInstrumentalStemType,
				stemUrl: addInstrumentalStemUrl,
				title: data.title,
				tags: data.tags,
				negativeTags: data.negativeTags
			},
			'Failed to create add instrumental generation'
		);
	}

	async function handleAddVocals(data: AddVocalsData) {
		if (!addVocalsStemType || !addVocalsStemUrl) {
			console.error('No stem selected for add vocals');
			return;
		}

		await createGenerationAndNavigate(
			'/api/generations/add-vocals',
			{
				projectId: generation.project_id,
				sourceGenerationId: generation.id,
				sourceAudioId: song.id,
				stemType: addVocalsStemType,
				stemUrl: addVocalsStemUrl,
				title: data.title,
				prompt: data.prompt,
				style: data.style,
				negativeTags: data.negativeTags
			},
			'Failed to create add vocals generation'
		);
	}

	return {
		get generation() {
			return generation;
		},
		get song() {
			return song;
		},
		get currentAnnotation() {
			return currentAnnotation;
		},
		get liveLabels() {
			return liveLabels;
		},
		get showExtendForm() {
			return showExtendForm;
		},
		get showAddInstrumentalForm() {
			return showAddInstrumentalForm;
		},
		get showAddVocalsForm() {
			return showAddVocalsForm;
		},
		get extendingStemType() {
			return extendingStemType;
		},
		get extendingStemUrl() {
			return extendingStemUrl;
		},
		get addInstrumentalStemType() {
			return addInstrumentalStemType;
		},
		get addInstrumentalStemUrl() {
			return addInstrumentalStemUrl;
		},
		get addVocalsStemType() {
			return addVocalsStemType;
		},
		get addVocalsStemUrl() {
			return addVocalsStemUrl;
		},
		get starred() {
			return starred;
		},
		get starAnimClass() {
			return starAnimClass;
		},
		toggleExtendForm,
		closeExtendForm,
		openStemExtendForm,
		openAddInstrumentalForm,
		closeAddInstrumentalForm,
		openAddVocalsForm,
		closeAddVocalsForm,
		handleToggleStar,
		handleExtend,
		handleAddInstrumental,
		handleAddVocals
	};
}
