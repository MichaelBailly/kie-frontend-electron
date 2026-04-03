<script lang="ts">
	import { resolve } from '$app/paths';
	import ArtworkImage from '$lib/components/ArtworkImage.svelte';
	import type { StemSeparationType } from '$lib/types';

	type SongTopBarSong = {
		title: string;
		imageUrl: string | null;
		audioUrl: string | null;
	};

	let {
		projectId,
		generationId,
		song,
		progressPct,
		currentTimeLabel,
		durationLabel,
		isPlaying,
		starred,
		starAnimClass,
		showExtendForm,
		addVocalsMp3SourceUrl,
		isAddVocalsFromMp3Active,
		showStemOptions,
		separatingType,
		hasVocalSeparation,
		hasStemSeparation,
		pendingVocalSeparation,
		pendingStemSeparation,
		isConverting,
		hasWavConversion,
		pendingWavConversion,
		onPlayPause,
		onToggleStar,
		onToggleExtend,
		onAddVocalsFromMp3,
		onToggleStemOptions,
		onRequestStemSeparation,
		onRequestWavConversion,
		setStemsMenuEl
	}: {
		projectId: number;
		generationId: number;
		song: SongTopBarSong;
		progressPct: number;
		currentTimeLabel: string;
		durationLabel: string;
		isPlaying: boolean;
		starred: boolean;
		starAnimClass: string;
		showExtendForm: boolean;
		addVocalsMp3SourceUrl: string | null;
		isAddVocalsFromMp3Active: boolean;
		showStemOptions: boolean;
		separatingType: StemSeparationType | null;
		hasVocalSeparation: boolean;
		hasStemSeparation: boolean;
		pendingVocalSeparation: boolean;
		pendingStemSeparation: boolean;
		isConverting: boolean;
		hasWavConversion: boolean;
		pendingWavConversion: boolean;
		onPlayPause: () => void;
		onToggleStar: () => void;
		onToggleExtend: () => void;
		onAddVocalsFromMp3: () => void;
		onToggleStemOptions: () => void;
		onRequestStemSeparation: (type: StemSeparationType) => void;
		onRequestWavConversion: () => void;
		setStemsMenuEl: (element: HTMLDivElement | null) => void;
	} = $props();

	let stemsMenuEl: HTMLDivElement | null = $state(null);

	const stemActionsBusy = $derived(
		separatingType !== null ||
			pendingVocalSeparation ||
			pendingStemSeparation ||
			isConverting ||
			pendingWavConversion
	);

	$effect(() => {
		setStemsMenuEl(stemsMenuEl);
		return () => setStemsMenuEl(null);
	});
</script>

<div
	class="relative z-10 border-b border-gray-200/80 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
>
	<div class="h-0.5 bg-gray-100 dark:bg-gray-800">
		<div
			class="h-full bg-linear-to-r from-indigo-500 to-purple-500 transition-all duration-150"
			style="width: {progressPct}%"
		></div>
	</div>

	<div class="flex items-center gap-4 px-5 py-3">
		<a
			href={resolve('/projects/[projectId]/generations/[generationId]', {
				projectId: String(projectId),
				generationId: String(generationId)
			})}
			class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
			title="Back to generation"
		>
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
		</a>

		<div class="group/art relative shrink-0">
			<ArtworkImage
				src={song.imageUrl}
				alt=""
				imageClass="h-11 w-11 rounded-lg object-cover shadow-sm ring-1 ring-black/5"
				fallbackClass="flex h-11 w-11 items-center justify-center rounded-lg bg-linear-to-br from-indigo-400 to-purple-500"
				iconClass="h-5 w-5 text-white/60"
			/>
			<button
				onclick={onToggleStar}
				class="absolute -right-1.5 -bottom-1.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full shadow-md transition-all duration-200
					{starred
					? 'scale-110 bg-amber-400 text-white shadow-amber-400/50'
					: 'bg-white/90 text-gray-300 opacity-0 group-hover/art:opacity-100 hover:bg-white! hover:text-amber-400! dark:bg-gray-800/90 dark:text-gray-500'}"
				title={starred ? 'Unstar' : 'Star'}
			>
				<svg
					class="h-3.5 w-3.5 {starAnimClass}"
					fill={starred ? 'currentColor' : 'none'}
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

		<div class="min-w-0 flex-1">
			<h1 class="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{song.title}</h1>
			<p class="text-xs text-gray-400 dark:text-gray-500">
				{currentTimeLabel} / {durationLabel}
			</p>
		</div>

		<button
			onclick={onPlayPause}
			class="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-indigo-600 text-white shadow-md shadow-indigo-500/20 transition-all hover:scale-105 hover:bg-indigo-700 active:scale-95"
		>
			{#if !isPlaying}
				<svg class="h-5 w-5 pl-0.5" fill="currentColor" viewBox="0 0 24 24">
					<path d="M8 5v14l11-7z" />
				</svg>
			{:else}
				<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
					<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
				</svg>
			{/if}
		</button>

		{#if song.audioUrl}
			<a
				href={song.audioUrl}
				rel="external"
				download={`${song.title}.mp3`}
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

		<button
			onclick={onToggleExtend}
			class="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors {showExtendForm
				? 'bg-purple-600 text-white shadow-md shadow-purple-500/35'
				: 'bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50'}"
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

		{#if addVocalsMp3SourceUrl}
			<button
				onclick={onAddVocalsFromMp3}
				class="group relative flex h-9 shrink-0 cursor-pointer items-center gap-1.5 overflow-hidden rounded-lg px-3 text-xs font-semibold tracking-wide transition-all duration-200 {isAddVocalsFromMp3Active
					? 'bg-violet-600 text-white shadow-md shadow-violet-500/35'
					: 'bg-linear-to-r from-violet-50 to-fuchsia-50 text-violet-700 hover:from-violet-100 hover:to-fuchsia-100 dark:from-violet-900/30 dark:to-fuchsia-900/20 dark:text-violet-300 dark:hover:from-violet-900/45 dark:hover:to-fuchsia-900/35'}"
				title="Generate new vocals from this variation MP3"
			>
				<span
					class="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 {isAddVocalsFromMp3Active
						? ''
						: 'bg-linear-to-r from-white/35 via-white/0 to-white/20 dark:from-white/10 dark:to-white/5'}"
				></span>
				<svg class="relative h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 18.5c4.142 0 7.5-3.134 7.5-7s-3.358-7-7.5-7-7.5 3.134-7.5 7 3.358 7 7.5 7zM12 18.5v3"
					/>
				</svg>
				<span class="relative">Add Vocal</span>
			</button>
		{/if}

		<div class="relative" bind:this={stemsMenuEl}>
			<button
				onclick={onToggleStemOptions}
				disabled={stemActionsBusy}
				class="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 {showStemOptions
					? 'bg-cyan-600 text-white shadow-md shadow-cyan-500/35'
					: 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100 dark:bg-cyan-900/30 dark:text-cyan-400 dark:hover:bg-cyan-900/50'}"
			>
				{#if stemActionsBusy}
					<svg class="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
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

			{#if showStemOptions}
				<div
					class="absolute top-11 right-0 z-20 w-64 rounded-xl border border-gray-200 bg-white p-3 shadow-xl dark:border-gray-700 dark:bg-gray-800"
				>
					<div class="mb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
						Separate Stems
					</div>
					<div class="space-y-1">
						<button
							onclick={() => onRequestStemSeparation('separate_vocal')}
							disabled={hasVocalSeparation || pendingVocalSeparation}
							class="flex w-full cursor-pointer items-center gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-700"
						>
							<span class="text-lg">🎤</span>
							<div>
								<div class="text-sm font-medium text-gray-900 dark:text-gray-100">
									Vocals + Instrumental
								</div>
								<div class="text-xs text-gray-500">
									{#if hasVocalSeparation}✓ Done{:else if pendingVocalSeparation}Processing...{:else}Separate
										vocals{/if}
								</div>
							</div>
						</button>
						<button
							onclick={() => onRequestStemSeparation('split_stem')}
							disabled={hasStemSeparation || pendingStemSeparation}
							class="flex w-full cursor-pointer items-center gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-700"
						>
							<span class="text-lg">🎛️</span>
							<div>
								<div class="text-sm font-medium text-gray-900 dark:text-gray-100">
									Full Stem Split
								</div>
								<div class="text-xs text-gray-500">
									{#if hasStemSeparation}✓ Done{:else if pendingStemSeparation}Processing...{:else}Drums,
										bass, guitar...{/if}
								</div>
							</div>
						</button>
						<div class="my-2 border-t border-gray-200 dark:border-gray-700"></div>
						<button
							onclick={onRequestWavConversion}
							disabled={hasWavConversion || pendingWavConversion || isConverting}
							class="flex w-full cursor-pointer items-center gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-700"
						>
							<span class="text-lg">🎵</span>
							<div>
								<div class="text-sm font-medium text-gray-900 dark:text-gray-100">
									Convert to WAV
								</div>
								<div class="text-xs text-gray-500">
									{#if hasWavConversion}✓ Done{:else if pendingWavConversion}Processing...{:else}Uncompressed
										export for editing{/if}
								</div>
							</div>
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
