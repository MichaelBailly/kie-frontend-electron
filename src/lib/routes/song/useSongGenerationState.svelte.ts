import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
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

type ActiveProjectContext = {
	current: {
		id: number;
		generations: Generation[];
	};
};

type AnnotationsContext = {
	get: (generationId: number, audioId: string) => VariationAnnotation | undefined;
};

type ExtendData = {
	title: string;
	style: string;
	lyrics: string;
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

export function useSongGenerationState(options: {
	getData: () => SongPageStateData;
	activeProjectContext: ActiveProjectContext | undefined;
	annotationsContext: AnnotationsContext | undefined;
}) {
	const { getData, activeProjectContext, annotationsContext } = options;

	let showExtendForm = $state(false);
	let extendingStemType = $state<string | null>(null);
	let extendingStemUrl = $state<string | null>(null);
	let showAddInstrumentalForm = $state(false);
	let addInstrumentalStemType = $state<string | null>(null);
	let addInstrumentalStemUrl = $state<string | null>(null);
	let showAddVocalsForm = $state(false);
	let addVocalsStemType = $state<string | null>(null);
	let addVocalsStemUrl = $state<string | null>(null);
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

	function toggleExtendForm() {
		showAddInstrumentalForm = false;
		addInstrumentalStemType = null;
		addInstrumentalStemUrl = null;
		showAddVocalsForm = false;
		addVocalsStemType = null;
		addVocalsStemUrl = null;
		extendingStemType = null;
		extendingStemUrl = null;
		showExtendForm = !showExtendForm;
	}

	function closeExtendForm() {
		showExtendForm = false;
		extendingStemType = null;
		extendingStemUrl = null;
	}

	function openStemExtendForm(stemType: string, stemUrl: string) {
		showAddInstrumentalForm = false;
		addInstrumentalStemType = null;
		addInstrumentalStemUrl = null;
		showAddVocalsForm = false;
		addVocalsStemType = null;
		addVocalsStemUrl = null;
		extendingStemType = stemType;
		extendingStemUrl = stemUrl;
		showExtendForm = true;
	}

	function closeAddInstrumentalForm() {
		showAddInstrumentalForm = false;
		addInstrumentalStemType = null;
		addInstrumentalStemUrl = null;
	}

	function openAddInstrumentalForm(stemType: string, stemUrl: string) {
		showExtendForm = false;
		extendingStemType = null;
		extendingStemUrl = null;
		showAddVocalsForm = false;
		addVocalsStemType = null;
		addVocalsStemUrl = null;
		addInstrumentalStemType = stemType;
		addInstrumentalStemUrl = stemUrl;
		showAddInstrumentalForm = true;
	}

	function closeAddVocalsForm() {
		showAddVocalsForm = false;
		addVocalsStemType = null;
		addVocalsStemUrl = null;
	}

	function openAddVocalsForm(stemType: string, stemUrl: string) {
		showExtendForm = false;
		extendingStemType = null;
		extendingStemUrl = null;
		showAddInstrumentalForm = false;
		addInstrumentalStemType = null;
		addInstrumentalStemUrl = null;
		addVocalsStemType = stemType;
		addVocalsStemUrl = stemUrl;
		showAddVocalsForm = true;
	}

	async function handleExtend(extendData: ExtendData) {
		const response = await fetch('/api/generations/extend', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				projectId: generation.project_id,
				title: extendData.title,
				style: extendData.style,
				lyrics: extendData.lyrics,
				extendsGenerationId: generation.id,
				extendsAudioId: song.id,
				continueAt: extendData.continueAt,
				instrumental: extendData.instrumental,
				stemType: extendingStemType,
				stemUrl: extendingStemUrl
			})
		});

		if (!response.ok) {
			console.error('Failed to create extend generation');
			return;
		}

		const newGeneration = await response.json();
		showExtendForm = false;
		extendingStemType = null;
		extendingStemUrl = null;

		goto(
			resolve('/projects/[projectId]/generations/[generationId]', {
				projectId: String(generation.project_id),
				generationId: String(newGeneration.id)
			})
		);
	}

	async function handleAddInstrumental(data: AddInstrumentalData) {
		if (!addInstrumentalStemType || !addInstrumentalStemUrl) {
			console.error('No stem selected for add instrumental');
			return;
		}

		const response = await fetch('/api/generations/add-instrumental', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				projectId: generation.project_id,
				sourceGenerationId: generation.id,
				sourceAudioId: song.id,
				stemType: addInstrumentalStemType,
				stemUrl: addInstrumentalStemUrl,
				title: data.title,
				tags: data.tags,
				negativeTags: data.negativeTags
			})
		});

		if (!response.ok) {
			console.error('Failed to create add instrumental generation');
			return;
		}

		const newGeneration = await response.json();
		showAddInstrumentalForm = false;
		addInstrumentalStemType = null;
		addInstrumentalStemUrl = null;

		goto(
			resolve('/projects/[projectId]/generations/[generationId]', {
				projectId: String(generation.project_id),
				generationId: String(newGeneration.id)
			})
		);
	}

	async function handleAddVocals(data: AddVocalsData) {
		if (!addVocalsStemType || !addVocalsStemUrl) {
			console.error('No stem selected for add vocals');
			return;
		}

		const response = await fetch('/api/generations/add-vocals', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				projectId: generation.project_id,
				sourceGenerationId: generation.id,
				sourceAudioId: song.id,
				stemType: addVocalsStemType,
				stemUrl: addVocalsStemUrl,
				title: data.title,
				prompt: data.prompt,
				style: data.style,
				negativeTags: data.negativeTags
			})
		});

		if (!response.ok) {
			console.error('Failed to create add vocals generation');
			return;
		}

		const newGeneration = await response.json();
		showAddVocalsForm = false;
		addVocalsStemType = null;
		addVocalsStemUrl = null;

		goto(
			resolve('/projects/[projectId]/generations/[generationId]', {
				projectId: String(generation.project_id),
				generationId: String(newGeneration.id)
			})
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
