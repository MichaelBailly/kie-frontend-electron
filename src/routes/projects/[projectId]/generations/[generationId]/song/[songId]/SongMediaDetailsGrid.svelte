<script lang="ts">
	import Waveform from '$lib/components/Waveform.svelte';
	import { createCopyWithFeedback } from '$lib/utils/clipboard';
	import type { Generation } from '$lib/types';

	let {
		generation,
		audioUrl,
		currentTime,
		duration,
		onSeek,
		onWaveformSeek,
		saveStyleSuccess,
		onOpenSaveStyle
	}: {
		generation: Generation;
		audioUrl: string | null;
		currentTime: number;
		duration: number;
		onSeek: (event: Event) => void;
		onWaveformSeek: (time: number) => void;
		saveStyleSuccess: boolean;
		onOpenSaveStyle: () => void;
	} = $props();

	let styleCopied = $state(false);
	let lyricsCopied = $state(false);
	let negativeTagsCopied = $state(false);

	const isAddInstrumental = $derived(
		generation.generation_type === 'add_instrumental' ||
			generation.generation_type === 'upload_instrumental'
	);
	const hasLyrics = $derived(!!generation.lyrics && !isAddInstrumental);
	const hasNegativeTags = $derived(!!generation.negative_tags?.trim());

	const copyStyle = createCopyWithFeedback((copied) => {
		styleCopied = copied;
	});
	const copyLyrics = createCopyWithFeedback((copied) => {
		lyricsCopied = copied;
	});
	const copyNegativeTags = createCopyWithFeedback((copied) => {
		negativeTagsCopied = copied;
	});
</script>

<div class="flex min-h-0 flex-col gap-4">
	{#if audioUrl}
		<div
			class="overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
		>
			<Waveform {audioUrl} height={160} {currentTime} {duration} onSeek={onWaveformSeek} />
			<div class="mt-2">
				<input
					type="range"
					min="0"
					max={duration || 100}
					value={currentTime}
					oninput={onSeek}
					class="h-1 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-indigo-600 dark:bg-gray-700"
				/>
			</div>
		</div>
	{/if}

	<div
		class="grid min-h-0 flex-1 gap-4 {hasLyrics || hasNegativeTags ? 'grid-cols-2' : 'grid-cols-1'}"
	>
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
					{#if generation.instrumental}
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
				<div class="flex items-center gap-2">
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
							onclick={onOpenSaveStyle}
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
						onclick={() => copyStyle(generation.style)}
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
			</div>
			<p
				class="min-h-0 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap text-gray-600 dark:text-gray-300"
			>
				{generation.style.trim()}
			</p>
		</div>

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
						onclick={() => copyLyrics(generation.lyrics ?? '')}
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
					{(generation.lyrics ?? '').trim()}
				</p>
			</div>
		{/if}

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
						<h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Negative Tags</h3>
					</div>
					<button
						onclick={() => copyNegativeTags(generation.negative_tags ?? '')}
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
					{(generation.negative_tags ?? '').trim()}
				</p>
			</div>
		{/if}
	</div>
</div>
