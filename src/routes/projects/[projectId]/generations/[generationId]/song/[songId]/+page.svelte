<script lang="ts">
	import type { PageData } from './$types';
	import CoverArtPanel from '$lib/components/CoverArtPanel.svelte';
	import ExtendedGenerationsList from '$lib/components/ExtendedGenerationsList.svelte';
	import ParentSongBanner from '$lib/components/ParentSongBanner.svelte';
	import SongDetailsPanels from '$lib/components/SongDetailsPanels.svelte';
	import SongExtendSection from '$lib/components/SongExtendSection.svelte';
	import SongHeader from '$lib/components/SongHeader.svelte';
	import SongNotesPanel from '$lib/components/SongNotesPanel.svelte';
	import SongPlaybackPanel from '$lib/components/SongPlaybackPanel.svelte';
	import StemSeparationResults from '$lib/components/StemSeparationResults.svelte';
	import { getContext } from 'svelte';
	import type {
		Generation,
		StemSeparation,
		StemSeparationType,
		VariationAnnotation
	} from '$lib/types';
	import { audioStore } from '$lib/stores/audio.svelte';
	import { buildAudioTrack } from '$lib/utils/audio';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	let { data }: { data: PageData } = $props();

	// Stem separation state
	let newStemSeparations = $state<StemSeparation[]>([]);
	let separatingType = $state<StemSeparationType | null>(null);
	let showStemOptions = $state(false);

	// Get stem separation updates from parent layout context (SSE-updated)
	const stemSeparationsContext = getContext<{
		updates: Map<number, Partial<StemSeparation>>;
		set: (id: number, data: Partial<StemSeparation>) => void;
	}>('stemSeparations');

	// Merge server data with updates from SSE
	let stemSeparations = $derived.by(() => {
		// Start with server-loaded data, apply updates from SSE
		const serverData = (data.stemSeparations || []).map((sep) => {
			const updates = stemSeparationsContext?.updates.get(sep.id);
			return updates ? { ...sep, ...updates } : sep;
		});
		// Add any new separations created during this session
		return [
			...serverData,
			...newStemSeparations.filter((ns) => !serverData.find((s) => s.id === ns.id))
		];
	});

	// Get live activeProject from parent layout context (SSE-updated)
	const activeProjectContext = getContext<{ current: { id: number; generations: Generation[] } }>(
		'activeProject'
	);

	// Use live generation from context which receives SSE updates
	let generation = $derived.by(() => {
		const generationId = data.generation.id;
		const liveProject = activeProjectContext?.current;
		if (liveProject) {
			const liveGeneration = liveProject.generations.find((g) => g.id === generationId);
			if (liveGeneration) {
				return liveGeneration;
			}
		}
		// Fallback to server-loaded data
		return data.generation;
	});

	// Update song data based on live generation
	let song = $derived.by(() => {
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
		} else if (songId === generation.track2_audio_id) {
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

	// Use global audio store for playback state
	let isCurrentTrack = $derived(audioStore.isCurrentTrack(song.id));
	let isPlaying = $derived(audioStore.isTrackPlaying(song.id));
	let currentTime = $derived(isCurrentTrack ? audioStore.currentTime : 0);
	let duration = $derived(isCurrentTrack ? audioStore.duration : song.duration || 0);

	let showExtendForm = $state(false);

	// Listen for SSE annotation updates
	const annotationsContext = getContext<
		| {
				get: (generationId: number, audioId: string) => VariationAnnotation | undefined;
		  }
		| undefined
	>('annotations');

	let currentAnnotation = $derived(
		annotationsContext?.get(generation.id, song.id) ?? data.annotation ?? null
	);

	let liveLabels = $derived(
		annotationsContext?.get(generation.id, song.id)?.labels ?? data.annotation?.labels ?? []
	);

	// Annotation (star/comment) state
	let starredOverride = $state<boolean | null>(null);
	let starred = $derived.by(() => starredOverride ?? currentAnnotation?.starred === 1);
	let starAnimClass = $state('');

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

	function handleWaveformSeek(time: number) {
		if (isCurrentTrack) {
			audioStore.seek(time);
		} else {
			// Start playing from this position
			audioStore.play(buildAudioTrack(generation, song));
			// Small delay to ensure audio is loaded, then seek
			setTimeout(() => audioStore.seek(time), 100);
		}
	}

	function handlePlayPause() {
		if (isCurrentTrack) {
			audioStore.toggle();
		} else {
			audioStore.play(buildAudioTrack(generation, song));
		}
	}

	function handleSeek(e: Event) {
		const target = e.target as HTMLInputElement;
		const time = parseFloat(target.value);
		if (isCurrentTrack) {
			audioStore.seek(time);
		}
	}

	async function handleExtend(extendData: {
		title: string;
		style: string;
		lyrics: string;
		continueAt: number;
	}) {
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

		if (response.ok) {
			const newGeneration = await response.json();
			showExtendForm = false;
			// Navigate to the new generation page
			goto(
				resolve('/projects/[projectId]/generations/[generationId]', {
					projectId: String(generation.project_id),
					generationId: String(newGeneration.id)
				})
			);
		} else {
			console.error('Failed to create extend generation');
		}
	}

	// Stem separation helpers
	let vocalSeparation = $derived(
		stemSeparations.find((s) => s.type === 'separate_vocal' && s.status === 'success')
	);
	let stemSeparation = $derived(
		stemSeparations.find((s) => s.type === 'split_stem' && s.status === 'success')
	);
	let pendingVocalSeparation = $derived(
		stemSeparations.find(
			(s) => s.type === 'separate_vocal' && (s.status === 'pending' || s.status === 'processing')
		)
	);
	let pendingStemSeparation = $derived(
		stemSeparations.find(
			(s) => s.type === 'split_stem' && (s.status === 'pending' || s.status === 'processing')
		)
	);

	async function requestStemSeparation(type: StemSeparationType) {
		separatingType = type;
		showStemOptions = false;

		try {
			const response = await fetch('/api/stem-separation', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					generationId: generation.id,
					audioId: song.id,
					type
				})
			});

			if (response.ok) {
				const newSeparation = (await response.json()) as StemSeparation;
				// Add to newStemSeparations if not already present
				if (!newStemSeparations.find((s) => s.id === newSeparation.id)) {
					newStemSeparations = [...newStemSeparations, newSeparation];
				}
			} else {
				const error = await response.json();
				console.error('Failed to start stem separation:', error);
				separatingType = null;
			}
		} catch (err) {
			console.error('Failed to start stem separation:', err);
			separatingType = null;
		}
	}
</script>

<div class="mx-auto max-w-5xl p-6">
	<!-- Parent song link (if this is an extended song) -->
	{#if data.parentGeneration && data.parentSong}
		<ParentSongBanner
			parentGenerationId={data.parentGeneration.id}
			parentGenerationProjectId={data.parentGeneration.project_id}
			parentSongId={data.parentSong.id}
			parentSongTitle={data.parentSong.title}
			continueAt={data.continueAt ?? null}
		/>
	{/if}

	<SongHeader
		projectId={data.generation.project_id}
		generationId={data.generation.id}
		title={song.title}
		labels={liveLabels}
		audioId={song.id}
	/>

	<!-- Audio player and Waveform - PRIMARY FOCUS -->
	<SongPlaybackPanel
		{song}
		{currentTime}
		{duration}
		{isPlaying}
		onPlayPause={handlePlayPause}
		onSeek={handleSeek}
		onWaveformSeek={handleWaveformSeek}
		{starred}
		{starAnimClass}
		onToggleStar={handleToggleStar}
		onToggleExtend={() => (showExtendForm = !showExtendForm)}
		{showStemOptions}
		onToggleStemOptions={() => (showStemOptions = !showStemOptions)}
		{separatingType}
		hasVocalSeparation={!!vocalSeparation}
		hasStemSeparation={!!stemSeparation}
		pendingVocalSeparation={!!pendingVocalSeparation}
		pendingStemSeparation={!!pendingStemSeparation}
		onRequestStemSeparation={requestStemSeparation}
	/>

	<SongExtendSection
		show={showExtendForm}
		{generation}
		{song}
		onExtend={handleExtend}
		onCancel={() => (showExtendForm = false)}
	/>

	<StemSeparationResults
		{vocalSeparation}
		{stemSeparation}
		{pendingVocalSeparation}
		{pendingStemSeparation}
	/>

	<ExtendedGenerationsList extendedGenerations={data.extendedGenerations ?? []} />

	<div class="space-y-3">
		<SongDetailsPanels style={generation.style} lyrics={generation.lyrics ?? null} />
		<SongNotesPanel generationId={generation.id} audioId={song.id} annotation={currentAnnotation} />

		{#if song.imageUrl}
			<CoverArtPanel imageUrl={song.imageUrl} title={song.title} />
		{/if}
	</div>
</div>
