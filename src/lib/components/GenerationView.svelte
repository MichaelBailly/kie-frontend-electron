<script lang="ts">
	import type { Generation } from '$lib/types';
	import { getStatusLabel, isGenerating } from '$lib/types';
	import AudioPlayer from './AudioPlayer.svelte';
	import AnnotationActions from './AnnotationActions.svelte';
	import ParentSongBanner from './ParentSongBanner.svelte';
	import ReadonlyMetadataField from './ReadonlyMetadataField.svelte';
	import { getStemDisplay, normalizeStemType } from '$lib/utils/stems';
	import { resolve } from '$app/paths';

	let {
		generation,
		parentGeneration = null,
		parentSong = null,
		onRetryExtension = null,
		retryDisabledReason = null,
		onRetryUpload = null,
		retryUploadDisabledReason = null
	}: {
		generation: Generation;
		parentGeneration?: { id: number } | null;
		parentSong?: { id: string; title: string } | null;
		onRetryExtension?: (() => void) | null;
		retryDisabledReason?: string | null;
		onRetryUpload?: (() => void) | null;
		retryUploadDisabledReason?: string | null;
	} = $props();

	const parentBannerLabel = $derived.by(() => {
		const stemType = generation.extends_stem_type;
		if (!stemType) return undefined;
		const stemDisplay = getStemDisplay(normalizeStemType(stemType));
		if (generation.generation_type === 'add_instrumental') {
			return `Instrumental from ${stemDisplay.icon} ${stemDisplay.label} stem of:`;
		}
		if (generation.generation_type === 'add_vocals') {
			return `Vocals from ${stemDisplay.icon} ${stemDisplay.label} stem of:`;
		}
		return `Extended from ${stemDisplay.icon} ${stemDisplay.label} stem of:`;
	});

	const isInstrumentalGeneration = $derived(
		generation.generation_type === 'add_instrumental' ||
			generation.generation_type === 'upload_instrumental'
	);

	const isAddVocalsGeneration = $derived(
		generation.generation_type === 'add_vocals' || generation.generation_type === 'upload_vocals'
	);
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
		<h2 class="flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
			{generation.title}
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
						{generation.generation_type === 'add_instrumental'
							? 'Retry instrumental creation'
							: generation.generation_type === 'add_vocals'
								? 'Retry vocals creation'
								: "Retry song's extension"}
					</span>
				</button>
			{/if}
			{#if onRetryUpload && (generation.generation_type === 'upload_instrumental' || generation.generation_type === 'upload_vocals')}
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
						{generation.generation_type === 'upload_instrumental'
							? 'Retry generate instrumental'
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

	<div class="flex-1 overflow-y-auto p-6">
		<!-- Status indicator for completed or error -->
		{#if generation.status === 'success'}
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
				{#if generation.error_message}
					<p class="mt-2 text-sm text-red-700 dark:text-red-300">{generation.error_message}</p>
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
					<div>
						<div class="mb-2 flex items-center gap-2">
							{#if generation.track1_audio_id}
								<a
									href={resolve(
										`/projects/${generation.project_id}/generations/${generation.id}/song/${generation.track1_audio_id}`
									)}
									class="shrink-0 text-sm font-semibold text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
								>
									Variation 1
								</a>
							{:else}
								<p class="text-sm font-medium text-gray-600 dark:text-gray-400">Variation 1</p>
							{/if}
							{#if generation.track1_audio_id}
								<AnnotationActions
									generationId={generation.id}
									audioId={generation.track1_audio_id}
								/>
							{/if}
						</div>
						{#if generation.track1_stream_url || generation.track1_audio_local_url || generation.track1_audio_url}
							<AudioPlayer
								src={generation.track1_audio_local_url ||
									generation.track1_audio_url ||
									generation.track1_stream_url ||
									''}
								title="{generation.title} (V1)"
								imageUrl={generation.track1_image_local_url || generation.track1_image_url || ''}
								duration={generation.track1_duration || 0}
								continueAt={generation.continue_at}
								trackId={generation.track1_audio_id || `preview-${generation.id}-1`}
								generationId={generation.id}
								projectId={generation.project_id}
							/>
						{/if}
					</div>
					{#if generation.track2_stream_url || generation.track2_audio_local_url || generation.track2_audio_url}
						<div>
							<div class="mb-2 flex items-center gap-2">
								{#if generation.track2_audio_id}
									<a
										href={resolve(
											`/projects/${generation.project_id}/generations/${generation.id}/song/${generation.track2_audio_id}`
										)}
										class="shrink-0 text-sm font-semibold text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
									>
										Variation 2
									</a>
								{:else}
									<p class="text-sm font-medium text-gray-600 dark:text-gray-400">Variation 2</p>
								{/if}
								{#if generation.track2_audio_id}
									<!-- LabelPicker removed -->
									<AnnotationActions
										generationId={generation.id}
										audioId={generation.track2_audio_id}
									/>
								{/if}
							</div>
							<AudioPlayer
								src={generation.track2_audio_local_url ||
									generation.track2_audio_url ||
									generation.track2_stream_url ||
									''}
								title="{generation.title} (V2)"
								imageUrl={generation.track2_image_local_url || generation.track2_image_url || ''}
								duration={generation.track2_duration || 0}
								continueAt={generation.continue_at}
								trackId={generation.track2_audio_id || `preview-${generation.id}-2`}
								generationId={generation.id}
								projectId={generation.project_id}
							/>
						</div>
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
				{generation.style.trim()}
			</ReadonlyMetadataField>

			{#if !isInstrumentalGeneration}
				<ReadonlyMetadataField label="Lyrics" valueClass="font-mono text-sm whitespace-pre-wrap">
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
							title={`${generation.title} (${isAddVocalsGeneration ? 'Vocal' : 'Instrumental'} Source Upload)`}
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
</div>
