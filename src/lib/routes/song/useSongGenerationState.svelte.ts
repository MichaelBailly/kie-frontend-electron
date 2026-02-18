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
};

export function useSongGenerationState(options: {
	getData: () => SongPageStateData;
	activeProjectContext: ActiveProjectContext | undefined;
	annotationsContext: AnnotationsContext | undefined;
}) {
	const { getData, activeProjectContext, annotationsContext } = options;

	let showExtendForm = $state(false);
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
				audioUrl: generation.track1_audio_url,
				imageUrl: generation.track1_image_url,
				duration: generation.track1_duration,
				title: `${generation.title} - Track 1`
			};
		}

		if (songId === generation.track2_audio_id) {
			return {
				id: generation.track2_audio_id || '',
				streamUrl: generation.track2_stream_url,
				audioUrl: generation.track2_audio_url,
				imageUrl: generation.track2_image_url,
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
		showExtendForm = !showExtendForm;
	}

	function closeExtendForm() {
		showExtendForm = false;
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
				continueAt: extendData.continueAt
			})
		});

		if (!response.ok) {
			console.error('Failed to create extend generation');
			return;
		}

		const newGeneration = await response.json();
		showExtendForm = false;

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
		get starred() {
			return starred;
		},
		get starAnimClass() {
			return starAnimClass;
		},
		toggleExtendForm,
		closeExtendForm,
		handleToggleStar,
		handleExtend
	};
}
