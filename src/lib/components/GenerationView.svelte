<script lang="ts">
	import type { Generation } from '$lib/types';
	import {
		getGenerationTypeLabel,
		getStatusLabel,
		isGenerating,
		isGenerationTypeOneOf
	} from '$lib/types';
	import AudioPlayer from './AudioPlayer.svelte';
	import GenerationVariationTrack from './GenerationVariationTrack.svelte';
	import ParentSongBanner from './ParentSongBanner.svelte';
	import ReadonlyMetadataField from './ReadonlyMetadataField.svelte';
	import SaveStyleModal from './SaveStyleModal.svelte';
	import { audioStore } from '$lib/stores/audio.svelte';
	import { getStemDisplay, normalizeStemType } from '$lib/utils/stems';
	import { createCopyWithFeedback } from '$lib/utils/clipboard';
	import { getPinnedGenerationTrack } from './generationStickyPlayer';

	let {
		generation,
		parentGeneration = null,
		parentSong = null,
		onRetryGenerate = null,
		onRetryExtension = null,
		retryDisabledReason = null,
		onRetryUpload = null,
		retryUploadDisabledReason = null
	}: {
		generation: Generation;
		parentGeneration?: { id: number } | null;
		parentSong?: { id: string; title: string } | null;
		onRetryGenerate?: (() => void) | null;
		onRetryExtension?: (() => void) | null;
		retryDisabledReason?: string | null;
		onRetryUpload?: (() => void) | null;
		retryUploadDisabledReason?: string | null;
	} = $props();

	const parentBannerLabel = $derived.by(() => {
		const stemType = generation.extends_stem_type;
		if (!stemType) return undefined;
		const stemDisplay = getStemDisplay(normalizeStemType(stemType));
		const isFullMix = stemType.trim().toLowerCase() === 'mp3';
		if (isGenerationTypeOneOf(generation.generation_type, ['add_instrumental'])) {
			return `Instrumental from ${stemDisplay.icon} ${stemDisplay.label} stem of:`;
		}
		if (isGenerationTypeOneOf(generation.generation_type, ['add_vocals'])) {
			if (isFullMix) {
				return `Vocals from ${stemDisplay.icon} ${stemDisplay.label} of:`;
			}
			return `Vocals from ${stemDisplay.icon} ${stemDisplay.label} stem of:`;
		}
		return `Extended from ${stemDisplay.icon} ${stemDisplay.label} stem of:`;
	});

	const isInstrumentalGeneration = $derived(
		isGenerationTypeOneOf(generation.generation_type, ['add_instrumental', 'upload_instrumental'])
	);

	const isUploadGeneration = $derived(
		isGenerationTypeOneOf(generation.generation_type, ['upload_instrumental', 'upload_vocals'])
	);

	let showSaveStyleModal = $state(false);
	let saveStyleSuccess = $state(false);

	let showCompleteBanner = $state(false);
	let completeBannerTimer: ReturnType<typeof setTimeout> | undefined;
	let prevGenerationStatus: string | undefined;

	$effect(() => {
		const status = generation.status;
		if (
			prevGenerationStatus !== undefined &&
			status === 'success' &&
			prevGenerationStatus !== 'success'
		) {
			showCompleteBanner = true;
			clearTimeout(completeBannerTimer);
			completeBannerTimer = setTimeout(() => (showCompleteBanner = false), 8000);
		}
		prevGenerationStatus = status;
		return () => clearTimeout(completeBannerTimer);
	});

	let styleCopied = $state(false);
	const copyStyle = createCopyWithFeedback((copied) => {
		styleCopied = copied;
	});

	let lyricsCopied = $state(false);
	const copyLyrics = createCopyWithFeedback((copied) => {
		lyricsCopied = copied;
	});
	let viewRoot: HTMLDivElement | undefined = $state();
	let isInlinePlayerHidden = $state(false);

	const generationTrackIds = $derived.by(() => {
		const ids = [
			generation.track1_audio_id || `preview-${generation.id}-1`,
			(generation.track2_stream_url ||
				generation.track2_audio_local_url ||
				generation.track2_audio_url) &&
				(generation.track2_audio_id || `preview-${generation.id}-2`)
		].filter((value): value is string => Boolean(value));

		return ids;
	});

	const pinnedTrack = $derived(
		getPinnedGenerationTrack({
			currentTrack: audioStore.currentTrack,
			isPlaying: audioStore.isPlaying,
			isInlinePlayerHidden,
			generationId: generation.id,
			trackIds: generationTrackIds
		})
	);

	function handleStyleSaved() {
		saveStyleSuccess = true;
		setTimeout(() => (saveStyleSuccess = false), 3000);
	}

	function getErrorSummary(errorMessage: string | null): string {
		if (!errorMessage) {
			return 'The generation could not be completed. Try again or inspect the technical details.';
		}

		const normalized = errorMessage.toLowerCase();

		if (normalized.includes('permission to use negative tags')) {
			return 'The music provider rejected this request because it included an unsupported advanced option.';
		}

		if (normalized.includes('sensitive')) {
			return 'The music provider rejected this request because of content restrictions.';
		}

		if (normalized.includes('timed out')) {
			return 'The generation took too long to complete.';
		}

		if (normalized.includes('network')) {
			return 'The app could not reach the music provider to finish this generation.';
		}

		return 'The generation could not be completed. Try again or inspect the technical details.';
	}

	function getScrollHost(node: HTMLElement | undefined): HTMLElement | null {
		let current = node?.parentElement ?? null;

		while (current) {
			const styles = window.getComputedStyle(current);
			if (/(auto|scroll)/.test(styles.overflowY) && current.scrollHeight > current.clientHeight) {
				return current;
			}

			current = current.parentElement;
		}

		return null;
	}

	function getInlineTrackElement(root: HTMLElement, trackId: string): HTMLElement | null {
		if (typeof CSS === 'undefined') {
			return null;
		}

		return root.querySelector(`[data-generation-track-id="${CSS.escape(trackId)}"]`);
	}

	$effect(() => {
		if (typeof window === 'undefined' || !viewRoot) {
			return;
		}

		const root = viewRoot;
		const scrollHost = getScrollHost(viewRoot);
		if (!scrollHost) {
			isInlinePlayerHidden = false;
			return;
		}

		const currentTrack = audioStore.currentTrack;
		const isPlaying = audioStore.isPlaying;

		const syncInlinePlayerVisibility = () => {
			if (
				!currentTrack ||
				!isPlaying ||
				currentTrack.generationId !== generation.id ||
				!generationTrackIds.includes(currentTrack.id)
			) {
				isInlinePlayerHidden = false;
				return;
			}

			const inlineTrack = getInlineTrackElement(root, currentTrack.id);
			if (!inlineTrack) {
				isInlinePlayerHidden = false;
				return;
			}

			const scrollHostTop = scrollHost.getBoundingClientRect().top;
			const inlineTrackRect = inlineTrack.getBoundingClientRect();
			isInlinePlayerHidden = inlineTrackRect.bottom <= scrollHostTop;
		};

		syncInlinePlayerVisibility();
		scrollHost.addEventListener('scroll', syncInlinePlayerVisibility, { passive: true });
		window.addEventListener('resize', syncInlinePlayerVisibility);

		return () => {
			scrollHost.removeEventListener('scroll', syncInlinePlayerVisibility);
			window.removeEventListener('resize', syncInlinePlayerVisibility);
		};
	});
</script>

<div class="flex h-full flex-col" bind:this={viewRoot}>
	<!-- Header -->
	<div class="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
		<h2 class="flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
			{generation.title}
			{#if onRetryGenerate && isGenerationTypeOneOf(generation.generation_type, ['generate'])}
				<button
					type="button"
					onclick={onRetryGenerate}
					class="group inline-flex items-center justify-center overflow-hidden rounded-full bg-gray-100/50 p-1.5 text-sm font-medium whitespace-nowrap text-gray-500 transition-all duration-300 hover:cursor-pointer hover:bg-gray-100 hover:text-gray-900 dark:bg-gray-800/50 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
				>
					<svg
						class="h-5 w-5 shrink-0"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M4 4v5h.582m14.836 2A8.001 8.001 0 005.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-13.837-2m13.837 2H15"
						/>
					</svg>
					<span
						class="max-w-0 pr-0 opacity-0 transition-all duration-300 group-hover:max-w-xs group-hover:px-1.5 group-hover:opacity-100"
					>
						Retry generation
					</span>
				</button>
			{/if}
			{#if onRetryExtension && generation.extends_generation_id}
				<button
					type="button"
					onclick={onRetryExtension}
					disabled={!!retryDisabledReason}
					title={retryDisabledReason || ''}
					class="group inline-flex items-center justify-center overflow-hidden rounded-full bg-gray-100/50 p-1.5 text-sm font-medium whitespace-nowrap text-gray-500 transition-all duration-300 hover:cursor-pointer hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800/50 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
				>
					<svg
						class="h-5 w-5 shrink-0"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M4 4v5h.582m14.836 2A8.001 8.001 0 005.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-13.837-2m13.837 2H15"
						/>
					</svg>
					<span
						class="max-w-0 pr-0 opacity-0 transition-all duration-300 group-hover:max-w-xs group-hover:px-1.5 group-hover:opacity-100"
					>
						{isGenerationTypeOneOf(generation.generation_type, ['add_instrumental'])
							? 'Retry instrumental creation'
							: isGenerationTypeOneOf(generation.generation_type, ['add_vocals'])
								? 'Retry vocals creation'
								: "Retry song's extension"}
					</span>
				</button>
			{/if}
			{#if onRetryUpload && isUploadGeneration}
				<button
					type="button"
					onclick={onRetryUpload}
					disabled={!!retryUploadDisabledReason}
					title={retryUploadDisabledReason || ''}
					class="group inline-flex items-center justify-center overflow-hidden rounded-full bg-gray-100/50 p-1.5 text-sm font-medium whitespace-nowrap text-gray-500 transition-all duration-300 hover:cursor-pointer hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800/50 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
				>
					<svg
						class="h-5 w-5 shrink-0"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M4 4v5h.582m14.836 2A8.001 8.001 0 005.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-13.837-2m13.837 2H15"
						/>
					</svg>
					<span
						class="max-w-0 pr-0 opacity-0 transition-all duration-300 group-hover:max-w-xs group-hover:px-1.5 group-hover:opacity-100"
					>
						{isInstrumentalGeneration
							? `Retry generate ${getGenerationTypeLabel(generation.generation_type).replace('Upload ', '').toLowerCase()}`
							: 'Retry add vocals'}
					</span>
				</button>
			{/if}
		</h2>
		{#if parentGeneration && parentSong}
			<ParentSongBanner
				parentGenerationId={parentGeneration.id}
				parentGenerationProjectId={generation.project_id}
				parentSongId={parentSong.id}
				parentSongTitle={parentSong.title}
				continueAt={generation.continue_at ?? null}
				variant="compact"
				generationType={generation.generation_type}
				label={parentBannerLabel}
			/>
		{/if}
		{#if isGenerating(generation.status)}
			<div class="mt-2 flex items-center gap-2">
				<div class="h-2 w-2 animate-pulse rounded-full bg-amber-500"></div>
				<span class="text-sm text-amber-600 dark:text-amber-400">
					{getStatusLabel(generation.status)}
				</span>
			</div>
			{#if generation.track1_stream_url || generation.track2_stream_url}
				<div class="mt-2 text-sm text-blue-600 dark:text-blue-400">
					💡 Preview available below while generation completes
				</div>
			{/if}
		{/if}
	</div>

	<div class="flex-1 p-6">
		{#if pinnedTrack}
			<div
				class="sticky top-0 z-30 -mx-6 mb-6 border-b border-gray-200/80 bg-white/95 px-6 py-3 shadow-sm backdrop-blur dark:border-gray-700/80 dark:bg-gray-800/95"
			>
				<p
					class="mb-3 text-xs font-semibold tracking-[0.2em] text-indigo-600 uppercase dark:text-indigo-400"
				>
					Now Playing
				</p>
				<AudioPlayer
					src={pinnedTrack.audioUrl || pinnedTrack.streamUrl || ''}
					title={pinnedTrack.title}
					imageUrl={pinnedTrack.imageUrl || ''}
					duration={pinnedTrack.duration || 0}
					continueAt={generation.continue_at}
					trackId={pinnedTrack.id}
					generationId={pinnedTrack.generationId}
					projectId={pinnedTrack.projectId}
				/>
			</div>
		{/if}

		<!-- Status indicator for completed or error -->
		{#if showCompleteBanner}
			<div
				class="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20"
			>
				<div class="flex items-center gap-2">
					<svg
						class="h-5 w-5 text-green-600 dark:text-green-400"
						fill="currentColor"
						viewBox="0 0 20 20"
					>
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
							clip-rule="evenodd"
						/>
					</svg>
					<span class="font-medium text-green-800 dark:text-green-200">Generation complete!</span>
				</div>
			</div>
		{:else if generation.status === 'error'}
			<div
				class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20"
			>
				<div class="flex items-center gap-2">
					<svg
						class="h-5 w-5 text-red-600 dark:text-red-400"
						fill="currentColor"
						viewBox="0 0 20 20"
					>
						<path
							fill-rule="evenodd"
							d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
							clip-rule="evenodd"
						/>
					</svg>
					<span class="font-medium text-red-800 dark:text-red-200">Generation failed</span>
				</div>
				<p class="mt-2 text-sm text-red-700 dark:text-red-300">
					{getErrorSummary(generation.error_message)}
				</p>
				{#if generation.error_message}
					<details
						class="mt-3 rounded-md border border-red-200/70 bg-white/50 px-3 py-2 dark:border-red-800/70 dark:bg-red-950/20"
					>
						<summary
							class="cursor-pointer text-sm font-medium text-red-800 select-none dark:text-red-200"
						>
							Technical details
						</summary>
						<p class="mt-2 text-xs leading-5 break-words text-red-700 dark:text-red-300">
							{generation.error_message}
						</p>
					</details>
				{/if}
			</div>
		{/if}

		<!-- Audio players if tracks are available -->
		{#if generation.track1_stream_url || generation.track1_audio_url}
			<div class="mb-6 space-y-4">
				<div class="flex items-center justify-between">
					<h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">
						{#if isGenerating(generation.status)}
							Preview (Generating...)
						{:else}
							Generated Tracks
						{/if}
					</h3>
					{#if isGenerating(generation.status) && (generation.track1_stream_url || generation.track2_stream_url)}
						<span class="text-xs text-gray-500 dark:text-gray-400">
							Final audio will be higher quality
						</span>
					{/if}
				</div>
				<div class="space-y-3">
					<GenerationVariationTrack {generation} variation={1} />
					{#if generation.track2_stream_url || generation.track2_audio_local_url || generation.track2_audio_url}
						<GenerationVariationTrack {generation} variation={2} />
					{/if}
				</div>
			</div>
		{/if}

		<!-- Song details (read-only) -->
		<div class="space-y-5">
			<ReadonlyMetadataField label="Title">{generation.title}</ReadonlyMetadataField>

			<ReadonlyMetadataField
				label={isInstrumentalGeneration ? 'Tags' : 'Style Prompt'}
				valueClass="whitespace-pre-wrap"
			>
				{#snippet HeaderRight()}
					<div class="flex items-center gap-2">
						<button
							onclick={() => copyStyle(generation.style)}
							class="shrink-0 cursor-pointer rounded-lg p-1.5 text-gray-500 transition-all hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
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
						{#if saveStyleSuccess}
							<span
								class="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400"
							>
								<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
									><path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2.5"
										d="M5 13l4 4L19 7"
									/></svg
								>Saved!
							</span>
						{:else}
							<button
								onclick={() => (showSaveStyleModal = true)}
								class="flex cursor-pointer items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-600 transition-all hover:border-indigo-300 hover:bg-indigo-100 dark:border-indigo-800/60 dark:bg-indigo-950/40 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
								title="Save to style collection"
							>
								<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"
									><path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
									/></svg
								>Save
							</button>
						{/if}
					</div>
				{/snippet}
				{generation.style.trim()}
			</ReadonlyMetadataField>

			{#if !isInstrumentalGeneration}
				<ReadonlyMetadataField label="Lyrics" valueClass="font-mono text-sm whitespace-pre-wrap">
					{#snippet HeaderRight()}
						<button
							onclick={() => copyLyrics(generation.lyrics ?? '')}
							class="shrink-0 cursor-pointer rounded-lg p-1.5 text-gray-500 transition-all hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
							title="Copy lyrics"
						>
							{#if lyricsCopied}
								<svg
									class="h-4 w-4 text-green-500"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									><path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M5 13l4 4L19 7"
									/></svg
								>
							{:else}
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
									><path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
									/></svg
								>
							{/if}
						</button>
					{/snippet}
					{generation.lyrics?.trim()}
				</ReadonlyMetadataField>
			{/if}

			{#if generation.negative_tags?.trim()}
				<ReadonlyMetadataField
					label="Negative Tags"
					valueClass="whitespace-pre-wrap text-rose-700 dark:text-rose-300"
				>
					{generation.negative_tags.trim()}
				</ReadonlyMetadataField>
			{/if}

			{#if (generation.generation_type === 'upload_instrumental' || generation.generation_type === 'upload_vocals') && generation.source_audio_local_url}
				<div class="overflow-hidden rounded-xl border border-teal-200/80 dark:border-teal-800/50">
					<div class="h-1 bg-linear-to-r from-teal-500 via-emerald-500 to-cyan-500"></div>
					<div class="bg-teal-50/70 p-4 dark:bg-teal-950/20">
						<div class="mb-3 flex items-center justify-between gap-3">
							<p
								class="text-xs font-semibold tracking-wider text-teal-600 uppercase dark:text-teal-400"
							>
								Source Audio
							</p>
						</div>
						<AudioPlayer
							src={generation.source_audio_local_url}
							title="Audio Source Upload"
							imageUrl={generation.track1_image_local_url || generation.track1_image_url || ''}
							duration={0}
							continueAt={null}
							trackId={`source-upload-${generation.id}`}
							generationId={generation.id}
							projectId={generation.project_id}
						/>
					</div>
				</div>
			{/if}
		</div>
	</div>
	{#if generation.task_id}
		<p class="task-id-footer">Task ID: {generation.task_id}</p>
	{/if}
</div>

{#if showSaveStyleModal}
	<SaveStyleModal
		style={generation.style}
		onClose={() => (showSaveStyleModal = false)}
		onSaved={handleStyleSaved}
	/>
{/if}

<style>
	.task-id-footer {
		padding: 0.5rem;
		text-align: center;
		font-size: 0.7rem;
		color: color-mix(in srgb, currentColor 25%, transparent);
		font-family: monospace;
		user-select: all;
		border-top: 1px solid color-mix(in srgb, currentColor 8%, transparent);
	}
</style>
