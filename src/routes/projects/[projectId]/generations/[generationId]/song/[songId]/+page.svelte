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
	import { useSongGenerationState } from '$lib/routes/song/useSongGenerationState.svelte';
	import { useSongPlaybackState } from '$lib/routes/song/useSongPlaybackState.svelte';
	import { useStemSeparationState } from '$lib/routes/song/useStemSeparationState.svelte';
	import { getContext } from 'svelte';
	import type { Generation, StemSeparation, VariationAnnotation } from '$lib/types';

	let { data }: { data: PageData } = $props();

	// Get stem separation updates from parent layout context (SSE-updated)
	const stemSeparationsContext = getContext<{
		updates: Map<number, Partial<StemSeparation>>;
		set: (id: number, data: Partial<StemSeparation>) => void;
	}>('stemSeparations');

	// Get live activeProject from parent layout context (SSE-updated)
	const activeProjectContext = getContext<{ current: { id: number; generations: Generation[] } }>(
		'activeProject'
	);

	// Listen for SSE annotation updates
	const annotationsContext = getContext<
		| {
				get: (generationId: number, audioId: string) => VariationAnnotation | undefined;
		  }
		| undefined
	>('annotations');

	const generationState = useSongGenerationState({
		getData: () => data,
		activeProjectContext,
		annotationsContext
	});

	const playbackState = useSongPlaybackState({
		getGeneration: () => generationState.generation,
		getSong: () => generationState.song
	});

	const stemState = useStemSeparationState({
		generationId: () => generationState.generation.id,
		audioId: () => generationState.song.id,
		getInitialStemSeparations: () => data.stemSeparations || [],
		stemSeparationsContext
	});
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
		title={generationState.song.title}
		labels={generationState.liveLabels}
		audioId={generationState.song.id}
	/>

	<!-- Audio player and Waveform - PRIMARY FOCUS -->
	<SongPlaybackPanel
		song={generationState.song}
		currentTime={playbackState.currentTime}
		duration={playbackState.duration}
		isPlaying={playbackState.isPlaying}
		onPlayPause={playbackState.handlePlayPause}
		onSeek={playbackState.handleSeek}
		onWaveformSeek={playbackState.handleWaveformSeek}
		starred={generationState.starred}
		starAnimClass={generationState.starAnimClass}
		onToggleStar={generationState.handleToggleStar}
		onToggleExtend={generationState.toggleExtendForm}
		showStemOptions={stemState.showStemOptions}
		onToggleStemOptions={stemState.toggleStemOptions}
		separatingType={stemState.separatingType}
		hasVocalSeparation={!!stemState.vocalSeparation}
		hasStemSeparation={!!stemState.stemSeparation}
		pendingVocalSeparation={!!stemState.pendingVocalSeparation}
		pendingStemSeparation={!!stemState.pendingStemSeparation}
		onRequestStemSeparation={stemState.requestStemSeparation}
	/>

	<SongExtendSection
		show={generationState.showExtendForm}
		generation={generationState.generation}
		song={generationState.song}
		onExtend={generationState.handleExtend}
		onCancel={generationState.closeExtendForm}
	/>

	<StemSeparationResults
		vocalSeparation={stemState.vocalSeparation}
		stemSeparation={stemState.stemSeparation}
		pendingVocalSeparation={stemState.pendingVocalSeparation}
		pendingStemSeparation={stemState.pendingStemSeparation}
	/>

	<ExtendedGenerationsList extendedGenerations={data.extendedGenerations ?? []} />

	<div class="space-y-3">
		<SongDetailsPanels
			style={generationState.generation.style}
			lyrics={generationState.generation.lyrics ?? null}
		/>
		<SongNotesPanel
			generationId={generationState.generation.id}
			audioId={generationState.song.id}
			annotation={generationState.currentAnnotation}
		/>

		{#if generationState.song.imageUrl}
			<CoverArtPanel imageUrl={generationState.song.imageUrl} title={generationState.song.title} />
		{/if}
	</div>
</div>
