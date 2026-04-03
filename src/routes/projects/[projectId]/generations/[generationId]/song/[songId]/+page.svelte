<script lang="ts">
	import type { PageData } from './$types';
	import { tick } from 'svelte';
	import AddInstrumentalSection from '$lib/components/AddInstrumentalSection.svelte';
	import AddVocalsSection from '$lib/components/AddVocalsSection.svelte';
	import LabelPicker from '$lib/components/LabelPicker.svelte';
	import ParentSongBanner from '$lib/components/ParentSongBanner.svelte';
	import SaveStyleModal from '$lib/components/SaveStyleModal.svelte';
	import SongExtendSection from '$lib/components/SongExtendSection.svelte';
	import {
		getActiveProjectContext,
		getAnnotationsContext,
		getStemSeparationsContext,
		getWavConversionsContext
	} from '$lib/routes/project/context';
	import { useSongGenerationState } from '$lib/routes/song/useSongGenerationState.svelte';
	import { useSongPlaybackState } from '$lib/routes/song/useSongPlaybackState.svelte';
	import { useStemSeparationState } from '$lib/routes/song/useStemSeparationState.svelte';
	import { useWavConversionState } from '$lib/routes/song/useWavConversionState.svelte';
	import { getStemDisplay } from '$lib/utils/stems';
	import SongCollectionsPanels from './SongCollectionsPanels.svelte';
	import SongMediaDetailsGrid from './SongMediaDetailsGrid.svelte';
	import SongNotesCard from './SongNotesCard.svelte';
	import SongTopBar from './SongTopBar.svelte';

	let { data }: { data: PageData } = $props();

	const stemSeparationsContext = getStemSeparationsContext();
	const wavConversionsContext = getWavConversionsContext();
	const activeProjectContext = getActiveProjectContext();
	const annotationsContext = getAnnotationsContext();

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

	const wavState = useWavConversionState({
		generationId: () => generationState.generation.id,
		audioId: () => generationState.song.id,
		getInitialWavConversions: () => data.wavConversions || [],
		wavConversionsContext
	});

	function fmt(seconds: number): string {
		const m = Math.floor(seconds / 60);
		const s = Math.floor(seconds % 60);
		return `${m}:${String(s).padStart(2, '0')}`;
	}

	const progressPct = $derived(
		playbackState.duration > 0 ? (playbackState.currentTime / playbackState.duration) * 100 : 0
	);
	const addVocalsMp3SourceUrl = $derived(
		generationState.song.audioUrl || generationState.song.streamUrl || null
	);
	const isAddVocalsFromMp3Active = $derived(
		generationState.showAddVocalsForm &&
			generationState.addVocalsStemType === 'mp3' &&
			generationState.addVocalsStemUrl === addVocalsMp3SourceUrl
	);

	let extendSectionEl: HTMLDivElement | null = $state(null);
	let stemsMenuEl: HTMLDivElement | null = $state(null);
	let showSaveStyleModal = $state(false);
	let saveStyleSuccess = $state(false);

	$effect(() => {
		if (!stemState.showStemOptions) return;

		function handleClickOutside(event: MouseEvent) {
			if (stemsMenuEl && !stemsMenuEl.contains(event.target as Node)) {
				stemState.closeStemOptions();
			}
		}

		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	});

	function setStemsMenuEl(element: HTMLDivElement | null) {
		stemsMenuEl = element;
	}

	function handleStyleSaved() {
		saveStyleSuccess = true;
		setTimeout(() => (saveStyleSuccess = false), 3000);
	}

	const parentStemLabel = $derived.by(() => {
		const stemType = generationState.generation.extends_stem_type;
		if (!stemType) return undefined;

		const stemDisplay = getStemDisplay(stemType);
		const isFullMix = stemType.trim().toLowerCase() === 'mp3';

		if (generationState.generation.generation_type === 'add_instrumental') {
			return `Instrumental added from ${stemDisplay.icon} ${stemDisplay.label} stem of:`;
		}

		if (generationState.generation.generation_type === 'add_vocals') {
			if (isFullMix) {
				return `Vocals added from ${stemDisplay.icon} ${stemDisplay.label} of:`;
			}

			return `Vocals added from ${stemDisplay.icon} ${stemDisplay.label} stem of:`;
		}

		return `Extended from ${stemDisplay.icon} ${stemDisplay.label} stem of:`;
	});

	async function scrollToExtendSection() {
		await tick();
		extendSectionEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	async function handleToggleExtend() {
		const willShow = !generationState.showExtendForm;
		generationState.toggleExtendForm();

		if (willShow) {
			await scrollToExtendSection();
		}
	}

	async function handleExtendStem(stemType: string, stemUrl: string) {
		generationState.openStemExtendForm(stemType, stemUrl);
		await scrollToExtendSection();
	}

	async function handleAddInstrumental(stemType: string, stemUrl: string) {
		generationState.openAddInstrumentalForm(stemType, stemUrl);
		await scrollToExtendSection();
	}

	async function handleAddVocals(stemType: string, stemUrl: string) {
		generationState.openAddVocalsForm(stemType, stemUrl);
		await scrollToExtendSection();
	}

	async function handleAddVocalsFromMp3() {
		const sourceUrl = addVocalsMp3SourceUrl;
		if (!sourceUrl) return;

		const alreadyOpen =
			generationState.showAddVocalsForm &&
			generationState.addVocalsStemType === 'mp3' &&
			generationState.addVocalsStemUrl === sourceUrl;

		if (alreadyOpen) {
			generationState.closeAddVocalsForm();
			return;
		}

		generationState.openAddVocalsForm('mp3', sourceUrl);
		await scrollToExtendSection();
	}
</script>

<div class="flex h-full flex-col bg-gray-50 dark:bg-gray-950">
	<SongTopBar
		projectId={data.generation.project_id}
		generationId={data.generation.id}
		song={{
			title: generationState.song.title,
			imageUrl: generationState.song.imageUrl,
			audioUrl: generationState.song.audioUrl
		}}
		{progressPct}
		currentTimeLabel={fmt(playbackState.currentTime)}
		durationLabel={fmt(playbackState.duration)}
		isPlaying={playbackState.isPlaying}
		starred={generationState.starred}
		starAnimClass={generationState.starAnimClass}
		showExtendForm={generationState.showExtendForm}
		{addVocalsMp3SourceUrl}
		{isAddVocalsFromMp3Active}
		showStemOptions={stemState.showStemOptions}
		separatingType={stemState.separatingType}
		hasVocalSeparation={!!stemState.vocalSeparation}
		hasStemSeparation={!!stemState.stemSeparation}
		pendingVocalSeparation={!!stemState.pendingVocalSeparation}
		pendingStemSeparation={!!stemState.pendingStemSeparation}
		isConverting={wavState.isConverting}
		hasWavConversion={!!wavState.wavConversion}
		pendingWavConversion={!!wavState.pendingWavConversion}
		onPlayPause={playbackState.handlePlayPause}
		onToggleStar={generationState.handleToggleStar}
		onToggleExtend={handleToggleExtend}
		onAddVocalsFromMp3={handleAddVocalsFromMp3}
		onToggleStemOptions={stemState.toggleStemOptions}
		onRequestStemSeparation={stemState.requestStemSeparation}
		onRequestWavConversion={wavState.requestWavConversion}
		{setStemsMenuEl}
	/>

	<div class="flex-1 overflow-y-auto">
		<div class="mx-auto max-w-6xl p-5">
			{#if data.parentGeneration && data.parentSong}
				<div class="mb-4">
					<ParentSongBanner
						parentGenerationId={data.parentGeneration.id}
						parentGenerationProjectId={data.parentGeneration.project_id}
						parentSongId={data.parentSong.id}
						parentSongTitle={data.parentSong.title}
						continueAt={data.continueAt ?? null}
						label={parentStemLabel}
						variant="compact"
						generationType={generationState.generation.generation_type}
					/>
				</div>
			{/if}

			<div bind:this={extendSectionEl}>
				<SongExtendSection
					show={generationState.showExtendForm}
					generation={generationState.generation}
					song={generationState.song}
					stemType={generationState.extendingStemType}
					stemUrl={generationState.extendingStemUrl}
					sunoModel={data.sunoModel}
					onExtend={generationState.handleExtend}
					onCancel={generationState.closeExtendForm}
				/>
				<AddInstrumentalSection
					show={generationState.showAddInstrumentalForm}
					generation={generationState.generation}
					song={generationState.song}
					stemType={generationState.addInstrumentalStemType}
					stemUrl={generationState.addInstrumentalStemUrl}
					sunoModel={data.sunoModel}
					onSubmit={generationState.handleAddInstrumental}
					onCancel={generationState.closeAddInstrumentalForm}
				/>
				<AddVocalsSection
					show={generationState.showAddVocalsForm}
					generation={generationState.generation}
					song={generationState.song}
					stemType={generationState.addVocalsStemType}
					stemUrl={generationState.addVocalsStemUrl}
					sunoModel={data.sunoModel}
					onSubmit={generationState.handleAddVocals}
					onCancel={generationState.closeAddVocalsForm}
				/>
			</div>

			<div class="mb-5">
				<LabelPicker
					labels={generationState.liveLabels}
					generationId={generationState.generation.id}
					audioId={generationState.song.id}
					placeholder="Add label"
				/>
			</div>

			<div class="grid min-h-96 gap-4 lg:grid-cols-[7fr_13fr]">
				<SongNotesCard
					generationId={generationState.generation.id}
					audioId={generationState.song.id}
					annotation={generationState.currentAnnotation}
				/>

				<SongMediaDetailsGrid
					generation={generationState.generation}
					audioUrl={generationState.song.audioUrl || generationState.song.streamUrl || null}
					currentTime={playbackState.currentTime}
					duration={playbackState.duration}
					onSeek={playbackState.handleSeek}
					onWaveformSeek={playbackState.handleWaveformSeek}
					{saveStyleSuccess}
					onOpenSaveStyle={() => (showSaveStyleModal = true)}
				/>
			</div>

			<SongCollectionsPanels
				vocalSeparation={stemState.vocalSeparation}
				stemSeparation={stemState.stemSeparation}
				pendingVocalSeparation={stemState.pendingVocalSeparation}
				pendingStemSeparation={stemState.pendingStemSeparation}
				wavConversion={wavState.wavConversion}
				pendingWavConversion={wavState.pendingWavConversion}
				projectId={generationState.generation.project_id}
				songTitle={generationState.song.title}
				imageUrl={generationState.song.imageUrl}
				addVocalsGenerations={data.addVocalsGenerations ?? []}
				addInstrumentalGenerations={data.addInstrumentalGenerations ?? []}
				extendedGenerations={data.extendedGenerations ?? []}
				onExtendStem={handleExtendStem}
				onAddInstrumental={handleAddInstrumental}
				onAddVocals={handleAddVocals}
			/>
		</div>
	</div>
</div>

{#if showSaveStyleModal}
	<SaveStyleModal
		style={generationState.generation.style}
		onClose={() => (showSaveStyleModal = false)}
		onSaved={handleStyleSaved}
	/>
{/if}
