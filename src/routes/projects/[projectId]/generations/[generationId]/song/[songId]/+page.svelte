<script lang="ts">
	import type { PageData } from './$types';
	import ParentSongBanner from '$lib/components/ParentSongBanner.svelte';
	import SaveStyleModal from '$lib/components/SaveStyleModal.svelte';
	import SongExtendSection from '$lib/components/SongExtendSection.svelte';
	import AddInstrumentalSection from '$lib/components/AddInstrumentalSection.svelte';
	import StemSeparationResults from '$lib/components/StemSeparationResults.svelte';
	import LabelPicker from '$lib/components/LabelPicker.svelte';
	import Waveform from '$lib/components/Waveform.svelte';
	import ExtendedGenerationsList from '$lib/components/ExtendedGenerationsList.svelte';
	import AddInstrumentalGenerationsList from '$lib/components/AddInstrumentalGenerationsList.svelte';
	import ArtworkImage from '$lib/components/ArtworkImage.svelte';
	import { useSongGenerationState } from '$lib/routes/song/useSongGenerationState.svelte';
	import { useSongPlaybackState } from '$lib/routes/song/useSongPlaybackState.svelte';
	import { useStemSeparationState } from '$lib/routes/song/useStemSeparationState.svelte';
	import { createCopyWithFeedback } from '$lib/utils/clipboard';
	import { getStemDisplay } from '$lib/utils/stems';
	import { getContext } from 'svelte';
	import { resolve } from '$app/paths';
	import type { Generation, StemSeparation, VariationAnnotation } from '$lib/types';

	let { data }: { data: PageData } = $props();

	const stemSeparationsContext = getContext<{
		updates: Map<number, Partial<StemSeparation>>;
		set: (id: number, data: Partial<StemSeparation>) => void;
	}>('stemSeparations');

	const activeProjectContext = getContext<{ current: { id: number; generations: Generation[] } }>(
		'activeProject'
	);

	const annotationsContext = getContext<
		{ get: (generationId: number, audioId: string) => VariationAnnotation | undefined } | undefined
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

	function fmt(seconds: number): string {
		const m = Math.floor(seconds / 60);
		const s = Math.floor(seconds % 60);
		return `${m}:${String(s).padStart(2, '0')}`;
	}

	const hasStemContent = $derived(
		!!stemState.vocalSeparation ||
			!!stemState.stemSeparation ||
			!!stemState.pendingVocalSeparation ||
			!!stemState.pendingStemSeparation
	);
	const hasExtensions = $derived((data.extendedGenerations ?? []).length > 0);
	const hasAddInstrumentalGenerations = $derived(
		(data.addInstrumentalGenerations ?? []).length > 0
	);
	const isAddInstrumental = $derived(
		generationState.generation.generation_type === 'add_instrumental' ||
			generationState.generation.generation_type === 'upload_instrumental'
	);
	const hasLyrics = $derived(!!generationState.generation.lyrics && !isAddInstrumental);
	const hasNegativeTags = $derived(
		isAddInstrumental && !!generationState.generation.negative_tags?.trim()
	);

	// Collapsed states for cards
	let stemsCollapsed = $state(false);
	let extensionsCollapsed = $state(false);
	let addInstrumentalCollapsed = $state(false);

	let styleCopied = $state(false);
	let lyricsCopied = $state(false);
	let negativeTagsCopied = $state(false);
	let extendSectionEl: HTMLDivElement | null = $state(null);
	let showSaveStyleModal = $state(false);
	let saveStyleSuccess = $state(false);

	function handleStyleSaved() {
		saveStyleSuccess = true;
		setTimeout(() => (saveStyleSuccess = false), 3000);
	}
	const copyStyle = createCopyWithFeedback((copied) => {
		styleCopied = copied;
	});
	const copyLyrics = createCopyWithFeedback((copied) => {
		lyricsCopied = copied;
	});
	const copyNegativeTags = createCopyWithFeedback((copied) => {
		negativeTagsCopied = copied;
	});

	// Notes state
	let notesComment = $state('');
	let notesDraft = $state('');
	let notesSaving = $state(false);
	let notesSaved = $state(false);
	let notesCharCount = $derived(notesDraft.length);

	$effect(() => {
		const nextComment = generationState.currentAnnotation?.comment ?? '';
		notesComment = nextComment;
		if (notesDraft === '' || notesDraft === notesComment) {
			notesDraft = nextComment;
		}
	});

	let notesDebounceTimer: ReturnType<typeof setTimeout> | null = null;

	function handleNotesInput() {
		if (notesDebounceTimer) clearTimeout(notesDebounceTimer);
		notesDebounceTimer = setTimeout(() => saveNotes(), 800);
	}

	async function saveNotes() {
		if (notesDraft === notesComment) return;
		notesSaving = true;

		try {
			await fetch(`/api/generations/${generationState.generation.id}/annotations`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ audioId: generationState.song.id, comment: notesDraft })
			});
			notesComment = notesDraft;
			notesSaved = true;
			setTimeout(() => (notesSaved = false), 2000);
		} catch {
			console.error('Failed to save notes');
		} finally {
			notesSaving = false;
		}
	}

	// Progress bar
	const progressPct = $derived(
		playbackState.duration > 0 ? (playbackState.currentTime / playbackState.duration) * 100 : 0
	);

	const parentStemLabel = $derived.by(() => {
		const stemType = generationState.generation.extends_stem_type;
		if (!stemType) return undefined;
		const stemDisplay = getStemDisplay(stemType);
		if (generationState.generation.generation_type === 'add_instrumental') {
			return `Instrumental added from ${stemDisplay.icon} ${stemDisplay.label} stem of:`;
		}
		return `Extended from ${stemDisplay.icon} ${stemDisplay.label} stem of:`;
	});

	function handleExtendStem(stemType: string, stemUrl: string) {
		generationState.openStemExtendForm(stemType, stemUrl);
		setTimeout(() => {
			extendSectionEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}, 0);
	}

	function handleAddInstrumental(stemType: string, stemUrl: string) {
		generationState.openAddInstrumentalForm(stemType, stemUrl);
		setTimeout(() => {
			extendSectionEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}, 0);
	}
</script>

<!--
  VARIANT 3 — "Bento Grid"
  Minimal sticky player bar at the top. Content below organized as a
  responsive bento/card grid. Each section is a self-contained card.
  Clean, modern, information-dense layout.
-->

<div class="flex h-full flex-col bg-gray-50 dark:bg-gray-950">
	<!-- STICKY TOP PLAYER BAR -->
	<div
		class="relative z-10 border-b border-gray-200/80 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
	>
		<!-- Progress bar (thin line at very top) -->
		<div class="h-0.5 bg-gray-100 dark:bg-gray-800">
			<div
				class="h-full bg-linear-to-r from-indigo-500 to-purple-500 transition-all duration-150"
				style="width: {progressPct}%"
			></div>
		</div>

		<div class="flex items-center gap-4 px-5 py-3">
			<!-- Back button -->
			<a
				href={resolve('/projects/[projectId]/generations/[generationId]', {
					projectId: String(data.generation.project_id),
					generationId: String(data.generation.id)
				})}
				class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
				title="Back to generation"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15 19l-7-7 7-7"
					/>
				</svg>
			</a>

			<!-- Cover art mini with star overlay -->
			<div class="group/art relative shrink-0">
				<ArtworkImage
					src={generationState.song.imageUrl}
					alt=""
					imageClass="h-11 w-11 rounded-lg object-cover shadow-sm ring-1 ring-black/5"
					fallbackClass="flex h-11 w-11 items-center justify-center rounded-lg bg-linear-to-br from-indigo-400 to-purple-500"
					iconClass="h-5 w-5 text-white/60"
				/>
				<!-- Star overlay on bottom-right of cover art -->
				<button
					onclick={generationState.handleToggleStar}
					class="absolute -right-1.5 -bottom-1.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full shadow-md transition-all duration-200
						{generationState.starred
						? 'scale-110 bg-amber-400 text-white shadow-amber-400/50'
						: 'bg-white/90 text-gray-300 opacity-0 group-hover/art:opacity-100 hover:bg-white! hover:text-amber-400! dark:bg-gray-800/90 dark:text-gray-500'}"
					title={generationState.starred ? 'Unstar' : 'Star'}
				>
					<svg
						class="h-3.5 w-3.5 {generationState.starAnimClass}"
						fill={generationState.starred ? 'currentColor' : 'none'}
						stroke="currentColor"
						stroke-width="2"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
						/>
					</svg>
				</button>
			</div>

			<!-- Title & time -->
			<div class="min-w-0 flex-1">
				<h1 class="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
					{generationState.song.title}
				</h1>
				<p class="text-xs text-gray-400 dark:text-gray-500">
					{fmt(playbackState.currentTime)} / {fmt(playbackState.duration)}
				</p>
			</div>

			<!-- Play/Pause -->
			<button
				onclick={playbackState.handlePlayPause}
				class="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-indigo-600 text-white shadow-md shadow-indigo-500/20 transition-all hover:scale-105 hover:bg-indigo-700 active:scale-95"
			>
				{#if !playbackState.isPlaying}
					<svg class="h-5 w-5 pl-0.5" fill="currentColor" viewBox="0 0 24 24">
						<path d="M8 5v14l11-7z" />
					</svg>
				{:else}
					<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
						<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
					</svg>
				{/if}
			</button>

			<!-- Download -->
			{#if generationState.song.audioUrl}
				<a
					href={generationState.song.audioUrl}
					rel="external"
					download={`${generationState.song.title}.mp3`}
					class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-300 transition-colors hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400"
					title="Download"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
						/>
					</svg>
				</a>
			{/if}

			<!-- Extend -->
			<button
				onclick={generationState.toggleExtendForm}
				class="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-purple-50 px-3 text-xs font-medium text-purple-600 transition-colors hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50"
			>
				<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M13 5l7 7-7 7M5 5l7 7-7 7"
					/>
				</svg>
				Extend
			</button>

			<!-- Stems -->
			<div class="relative">
				<button
					onclick={stemState.toggleStemOptions}
					disabled={stemState.separatingType !== null}
					class="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-cyan-50 px-3 text-xs font-medium text-cyan-600 transition-colors hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-cyan-900/30 dark:text-cyan-400 dark:hover:bg-cyan-900/50"
				>
					{#if stemState.separatingType !== null || stemState.pendingVocalSeparation || stemState.pendingStemSeparation}
						<svg class="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
					{:else}
						<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
							/>
						</svg>
					{/if}
					Stems
				</button>

				{#if stemState.showStemOptions}
					<div
						class="absolute top-11 right-0 z-20 w-64 rounded-xl border border-gray-200 bg-white p-3 shadow-xl dark:border-gray-700 dark:bg-gray-800"
					>
						<div class="mb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
							Separate Stems
						</div>
						<div class="space-y-1">
							<button
								onclick={() => stemState.requestStemSeparation('separate_vocal')}
								disabled={!!stemState.vocalSeparation || !!stemState.pendingVocalSeparation}
								class="flex w-full cursor-pointer items-center gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-700"
							>
								<span class="text-lg">🎤</span>
								<div>
									<div class="text-sm font-medium text-gray-900 dark:text-gray-100">
										Vocals + Instrumental
									</div>
									<div class="text-xs text-gray-500">
										{#if stemState.vocalSeparation}✓ Done{:else if stemState.pendingVocalSeparation}Processing...{:else}Separate
											vocals{/if}
									</div>
								</div>
							</button>
							<button
								onclick={() => stemState.requestStemSeparation('split_stem')}
								disabled={!!stemState.stemSeparation || !!stemState.pendingStemSeparation}
								class="flex w-full cursor-pointer items-center gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-700"
							>
								<span class="text-lg">🎛️</span>
								<div>
									<div class="text-sm font-medium text-gray-900 dark:text-gray-100">
										Full Stem Split
									</div>
									<div class="text-xs text-gray-500">
										{#if stemState.stemSeparation}✓ Done{:else if stemState.pendingStemSeparation}Processing...{:else}Drums,
											bass, guitar…{/if}
									</div>
								</div>
							</button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- SCROLLABLE BENTO GRID -->
	<div class="flex-1 overflow-y-auto">
		<div class="mx-auto max-w-6xl p-5">
			<!-- Parent banner -->
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

			<!-- Extend form -->
			<div bind:this={extendSectionEl}>
				<SongExtendSection
					show={generationState.showExtendForm}
					generation={generationState.generation}
					song={generationState.song}
					stemType={generationState.extendingStemType}
					stemUrl={generationState.extendingStemUrl}
					onExtend={generationState.handleExtend}
					onCancel={generationState.closeExtendForm}
				/>
				<AddInstrumentalSection
					show={generationState.showAddInstrumentalForm}
					generation={generationState.generation}
					song={generationState.song}
					stemType={generationState.addInstrumentalStemType}
					stemUrl={generationState.addInstrumentalStemUrl}
					onSubmit={generationState.handleAddInstrumental}
					onCancel={generationState.closeAddInstrumentalForm}
				/>
			</div>

			<!-- Labels row -->
			<div class="mb-5">
				<LabelPicker
					labels={generationState.liveLabels}
					generationId={generationState.generation.id}
					audioId={generationState.song.id}
					placeholder="Add label"
				/>
			</div>

			<!-- BENTO GRID — 2-column layout: notes left (35%), waveform + style/lyrics stacked right (65%), aligned bottoms -->
			<div class="grid min-h-96 gap-4 lg:grid-cols-[7fr_13fr]">
				<!-- Left: Notes (full height, scrollable if needed) -->
				<div
					class="flex flex-col overflow-hidden rounded-2xl border border-amber-200/80 bg-linear-to-b from-amber-50 to-amber-100 shadow-sm dark:border-amber-800/30 dark:from-amber-950/40 dark:to-amber-900/20"
				>
					<!-- Sophisticated Notes Header -->
					<div
						class="flex shrink-0 items-center justify-between border-b border-amber-200/50 bg-white/50 px-6 py-4 backdrop-blur-sm dark:border-amber-800/30 dark:bg-gray-800/30"
					>
						<div class="flex items-center gap-3">
							<div
								class="flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-br from-amber-400 to-amber-600"
							>
								<svg
									class="h-5 w-5 text-white"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
									/>
								</svg>
							</div>
							<div>
								<h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Notes</h3>
								<p class="text-xs text-gray-500 dark:text-gray-400">Annotate this variation</p>
							</div>
						</div>
						<div class="flex items-center gap-2">
							{#if notesSaving}
								<span class="text-xs font-medium text-amber-600 dark:text-amber-400">Saving…</span>
							{:else if notesSaved}
								<span
									class="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400"
								>
									<svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
										<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
									</svg>
									Saved
								</span>
							{/if}
						</div>
					</div>

					<!-- Notes Body -->
					<div class="flex min-h-0 flex-1 flex-col p-6">
						<textarea
							bind:value={notesDraft}
							oninput={handleNotesInput}
							onblur={saveNotes}
							placeholder="Add notes about this variation — production notes, arrangement ideas, directions for future versions…"
							maxlength="500"
							class="min-h-0 w-full flex-1 resize-none rounded-xl border border-amber-200/60 bg-white px-4 py-3 text-sm leading-relaxed text-gray-900 placeholder-gray-400 transition-colors focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 focus:outline-none dark:border-amber-800/40 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-amber-500 dark:focus:ring-amber-500/30"
						></textarea>
						<div class="mt-3 flex items-center justify-between pt-3">
							<p class="text-xs text-gray-500 dark:text-gray-400">Auto-saves as you type</p>
							<span
								class="text-xs font-medium {notesCharCount > 450
									? 'text-amber-600 dark:text-amber-400'
									: 'text-gray-400 dark:text-gray-500'}"
							>
								{notesCharCount}/500
							</span>
						</div>
					</div>
				</div>

				<!-- Right: Flex column stacking waveform and style/lyrics -->
				<div class="flex min-h-0 flex-col gap-4">
					<!-- Waveform -->
					{#if generationState.song.streamUrl || generationState.song.audioUrl}
						<div
							class="overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
						>
							<Waveform
								audioUrl={generationState.song.audioUrl || generationState.song.streamUrl || ''}
								height={80}
								currentTime={playbackState.currentTime}
								duration={playbackState.duration}
								onSeek={playbackState.handleWaveformSeek}
							/>
							<div class="mt-2">
								<input
									type="range"
									min="0"
									max={playbackState.duration || 100}
									value={playbackState.currentTime}
									oninput={playbackState.handleSeek}
									class="h-1 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-indigo-600 dark:bg-gray-700"
								/>
							</div>
						</div>
					{/if}

					<!-- Style + Lyrics side by side with max-height -->
					<div
						class="grid min-h-0 flex-1 gap-4 {hasLyrics || hasNegativeTags
							? 'grid-cols-2'
							: 'grid-cols-1'}"
					>
						<!-- Style -->
						<div
							class="group relative flex max-h-80 flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
						>
							<div class="mb-3 flex shrink-0 items-center justify-between">
								<div class="flex items-center gap-2">
									<span
										class="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/30"
									>
										<svg
											class="h-4 w-4 text-indigo-500"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
											/>
										</svg>
									</span>
									<h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
										{isAddInstrumental ? 'Tags' : 'Style'}
									</h3>
									{#if generationState.generation.instrumental}
										<span
											class="ml-1 inline-flex items-center gap-1 rounded-full bg-linear-to-r from-indigo-50 to-purple-50 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-indigo-600 ring-1 ring-indigo-200/60 dark:from-indigo-900/40 dark:to-purple-900/40 dark:text-indigo-300 dark:ring-indigo-700/40"
										>
											<svg
												class="h-2.5 w-2.5 shrink-0"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2.5"
												stroke-linecap="round"
												stroke-linejoin="round"
											>
												<path d="M9 18V5l12-2v13" />
												<circle cx="6" cy="18" r="3" />
												<circle cx="18" cy="16" r="3" />
											</svg>
											Instrumental
										</span>
									{/if}
								</div>
								<!-- Save to collection -->
								{#if saveStyleSuccess}
									<span
										class="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400"
									>
										<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2.5"
												d="M5 13l4 4L19 7"
											/>
										</svg>
										Saved!
									</span>
								{:else}
									<button
										onclick={() => (showSaveStyleModal = true)}
										class="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-600 opacity-0 transition-all group-hover:opacity-100 hover:border-indigo-300 hover:bg-indigo-100 dark:border-indigo-800/60 dark:bg-indigo-950/40 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
										title="Save to style collection"
									>
										<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
											/>
										</svg>
										Save
									</button>
								{/if}
								<button
									onclick={() => copyStyle(generationState.generation.style)}
									class="shrink-0 cursor-pointer rounded-lg p-1.5 text-gray-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-gray-100 hover:text-gray-500 dark:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-400"
									title="Copy style"
								>
									{#if styleCopied}
										<svg
											class="h-4 w-4 text-green-500"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M5 13l4 4L19 7"
											/>
										</svg>
									{:else}
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
											/>
										</svg>
									{/if}
								</button>
							</div>
							<p
								class="min-h-0 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap text-gray-600 dark:text-gray-300"
							>
								{generationState.generation.style.trim()}
							</p>
						</div>

						<!-- Lyrics -->
						{#if hasLyrics}
							<div
								class="group relative flex max-h-80 flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
							>
								<div class="mb-3 flex shrink-0 items-center justify-between">
									<div class="flex items-center gap-2">
										<span
											class="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-900/30"
										>
											<svg
												class="h-4 w-4 text-violet-500"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
												/>
											</svg>
										</span>
										<h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Lyrics</h3>
									</div>
									<button
										onclick={() => copyLyrics(generationState.generation.lyrics ?? '')}
										class="shrink-0 cursor-pointer rounded-lg p-1.5 text-gray-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-gray-100 hover:text-gray-500 dark:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-400"
										title="Copy lyrics"
									>
										{#if lyricsCopied}
											<svg
												class="h-4 w-4 text-green-500"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M5 13l4 4L19 7"
												/>
											</svg>
										{:else}
											<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
												/>
											</svg>
										{/if}
									</button>
								</div>
								<p
									class="min-h-0 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap text-gray-600 dark:text-gray-300"
								>
									{(generationState.generation.lyrics ?? '').trim()}
								</p>
							</div>
						{/if}

						<!-- Negative Tags (add_instrumental only) -->
						{#if hasNegativeTags}
							<div
								class="group relative flex max-h-80 flex-col overflow-hidden rounded-2xl border border-rose-200/80 bg-white p-5 shadow-sm dark:border-rose-800/50 dark:bg-gray-900"
							>
								<div class="mb-3 flex shrink-0 items-center justify-between">
									<div class="flex items-center gap-2">
										<span
											class="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-900/30"
										>
											<svg
												class="h-4 w-4 text-rose-500"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
												/>
											</svg>
										</span>
										<h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
											Negative Tags
										</h3>
									</div>
									<button
										onclick={() => copyNegativeTags(generationState.generation.negative_tags ?? '')}
										class="shrink-0 cursor-pointer rounded-lg p-1.5 text-gray-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-gray-100 hover:text-gray-500 dark:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-400"
										title="Copy negative tags"
									>
										{#if negativeTagsCopied}
											<svg
												class="h-4 w-4 text-green-500"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M5 13l4 4L19 7"
												/>
											</svg>
										{:else}
											<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
												/>
											</svg>
										{/if}
									</button>
								</div>
								<p
									class="min-h-0 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap text-rose-700 dark:text-rose-300"
								>
									{(generationState.generation.negative_tags ?? '').trim()}
								</p>
							</div>
						{/if}
					</div>
				</div>
			</div>

			<!-- Full-width cards below the main grid -->
			<div class="mt-4 space-y-4">
				<!-- Stem Separation -->
				{#if hasStemContent}
					<div
						class="overflow-hidden rounded-2xl border border-cyan-200/80 bg-linear-to-br from-cyan-50 to-white p-5 shadow-sm dark:border-cyan-800/50 dark:from-cyan-950/30 dark:to-gray-900"
					>
						<button
							onclick={() => (stemsCollapsed = !stemsCollapsed)}
							class="flex w-full cursor-pointer items-center justify-between"
						>
							<h3
								class="flex items-center gap-2 text-sm font-semibold text-cyan-900 dark:text-cyan-100"
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
									/>
								</svg>
								Stem Separation
								{#if stemState.pendingVocalSeparation || stemState.pendingStemSeparation}
									<span class="ml-1 inline-flex h-2 w-2 animate-pulse rounded-full bg-cyan-500"
									></span>
								{/if}
							</h3>
							<svg
								class="h-4 w-4 text-cyan-400 transition-transform {stemsCollapsed
									? ''
									: 'rotate-180'}"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 9l-7 7-7-7"
								/>
							</svg>
						</button>
						{#if !stemsCollapsed}
							<div class="mt-4">
								<StemSeparationResults
									vocalSeparation={stemState.vocalSeparation}
									stemSeparation={stemState.stemSeparation}
									pendingVocalSeparation={stemState.pendingVocalSeparation}
									pendingStemSeparation={stemState.pendingStemSeparation}
									projectId={generationState.generation.project_id}
									songTitle={generationState.song.title}
									imageUrl={generationState.song.imageUrl}
									onExtendStem={handleExtendStem}
									onAddInstrumental={handleAddInstrumental}
								/>
							</div>
						{/if}
					</div>
				{/if}

				{#if hasAddInstrumentalGenerations}
					<div
						class="overflow-hidden rounded-2xl border border-teal-200/80 bg-linear-to-br from-teal-50 to-white p-5 shadow-sm dark:border-teal-800/50 dark:from-teal-950/30 dark:to-gray-900"
					>
						<button
							onclick={() => (addInstrumentalCollapsed = !addInstrumentalCollapsed)}
							class="flex w-full cursor-pointer items-center justify-between"
						>
							<h3
								class="flex items-center gap-2 text-sm font-semibold text-teal-900 dark:text-teal-100"
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zm12-2a3 3 0 11-6 0 3 3 0 016 0z"
									/>
								</svg>
								Instrumental Versions
								<span
									class="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-700 dark:bg-teal-900/50 dark:text-teal-300"
								>
									{(data.addInstrumentalGenerations ?? []).length}
								</span>
							</h3>
							<svg
								class="h-4 w-4 text-teal-400 transition-transform {addInstrumentalCollapsed
									? ''
									: 'rotate-180'}"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 9l-7 7-7-7"
								/>
							</svg>
						</button>
						{#if !addInstrumentalCollapsed}
							<div class="mt-4">
								<AddInstrumentalGenerationsList
									generations={data.addInstrumentalGenerations ?? []}
								/>
							</div>
						{/if}
					</div>
				{/if}

				<!-- Extended Versions -->
				{#if hasExtensions}
					<div
						class="overflow-hidden rounded-2xl border border-green-200/80 bg-linear-to-br from-green-50 to-white p-5 shadow-sm dark:border-green-800/50 dark:from-green-950/30 dark:to-gray-900"
					>
						<button
							onclick={() => (extensionsCollapsed = !extensionsCollapsed)}
							class="flex w-full cursor-pointer items-center justify-between"
						>
							<h3
								class="flex items-center gap-2 text-sm font-semibold text-green-900 dark:text-green-100"
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M13 5l7 7-7 7M5 5l7 7-7 7"
									/>
								</svg>
								Extended Versions
								<span
									class="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/50 dark:text-green-300"
								>
									{(data.extendedGenerations ?? []).length}
								</span>
							</h3>
							<svg
								class="h-4 w-4 text-green-400 transition-transform {extensionsCollapsed
									? ''
									: 'rotate-180'}"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 9l-7 7-7-7"
								/>
							</svg>
						</button>
						{#if !extensionsCollapsed}
							<div class="mt-4">
								<ExtendedGenerationsList extendedGenerations={data.extendedGenerations ?? []} />
							</div>
						{/if}
					</div>
				{/if}
			</div>
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
