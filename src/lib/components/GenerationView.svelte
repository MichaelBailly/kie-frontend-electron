<script lang="ts">
	import type { Generation } from '$lib/types';
	import { getStatusLabel, isGenerating } from '$lib/types';
	import AudioPlayer from './AudioPlayer.svelte';
	import AnnotationActions from './AnnotationActions.svelte';
	import ParentSongBanner from './ParentSongBanner.svelte';
	import { resolve } from '$app/paths';

	let {
		generation,
		parentGeneration = null,
		parentSong = null
	}: {
		generation: Generation;
		parentGeneration?: { id: number } | null;
		parentSong?: { id: string; title: string } | null;
	} = $props();
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
		<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
			{generation.title}
		</h2>
		{#if parentGeneration && parentSong}
			<ParentSongBanner
				parentGenerationId={parentGeneration.id}
				parentGenerationProjectId={generation.project_id}
				parentSongId={parentSong.id}
				parentSongTitle={parentSong.title}
				continueAt={null}
				variant="compact"
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
								<button hidden class="hidden">
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
										/>
									</svg>
								</button>
								<AnnotationActions
									generationId={generation.id}
									audioId={generation.track1_audio_id}
								/>
							{/if}
						</div>
						{#if generation.track1_stream_url || generation.track1_audio_url}
							<AudioPlayer
								src={generation.track1_audio_url || generation.track1_stream_url || ''}
								title="{generation.title} (V1)"
								imageUrl={generation.track1_image_url || ''}
								duration={generation.track1_duration || 0}
								trackId={generation.track1_audio_id || `preview-${generation.id}-1`}
								generationId={generation.id}
								projectId={generation.project_id}
							/>
						{/if}
					</div>
					{#if generation.track2_stream_url || generation.track2_audio_url}
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
									<button hidden class="hidden">
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
											/>
										</svg>
									</button>
									<!-- LabelPicker removed -->
									<AnnotationActions
										generationId={generation.id}
										audioId={generation.track2_audio_id}
									/>
								{/if}
							</div>
							<AudioPlayer
								src={generation.track2_audio_url || generation.track2_stream_url || ''}
								title="{generation.title} (V2)"
								imageUrl={generation.track2_image_url || ''}
								duration={generation.track2_duration || 0}
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
			<div>
				<h4 class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Title</h4>
				<div
					class="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
				>
					{generation.title}
				</div>
			</div>

			<div>
				<h4 class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
					Style Prompt
				</h4>
				<div
					class="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 whitespace-pre-wrap text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
				>
					{generation.style.trim()}
				</div>
			</div>

			<div>
				<h4 class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Lyrics</h4>
				<div
					class="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 font-mono text-sm whitespace-pre-wrap text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
				>
					{generation.lyrics?.trim()}
				</div>
			</div>
		</div>
	</div>
</div>
