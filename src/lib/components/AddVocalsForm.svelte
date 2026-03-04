<script lang="ts">
	import type { Generation } from '$lib/types';
	import StylePicker from './StylePicker.svelte';
	import { audioStore, type AudioTrack } from '$lib/stores/audio.svelte';
	import { getStemDisplay, normalizeStemType } from '$lib/utils/stems';
	import { untrack } from 'svelte';

	let {
		generation,
		song,
		stemType,
		stemUrl,
		onSubmit,
		onCancel
	}: {
		generation: Generation;
		song: {
			id: string;
			imageUrl: string | null;
			title: string;
		};
		stemType: string;
		stemUrl: string;
		onSubmit: (data: {
			title: string;
			prompt: string;
			style: string;
			negativeTags: string;
		}) => Promise<void>;
		onCancel: () => void;
	} = $props();

	const normalizedStemType = $derived(normalizeStemType(stemType));
	const stemDisplay = $derived(getStemDisplay(normalizedStemType));

	let title = $state(untrack(() => `${generation.title.replace(/( — Vocals)+$/, '')} — Vocals`));
	let prompt = $state(untrack(() => generation.lyrics ?? ''));
	let style = $state(untrack(() => generation.style ?? ''));
	let negativeTags = $state(untrack(() => generation.negative_tags ?? ''));
	let isSubmitting = $state(false);

	const previewTrackId = $derived(`${song.id}:${normalizedStemType}:add-vocals-preview`);
	const isCurrentTrack = $derived(audioStore.isCurrentTrack(previewTrackId));
	const isPlaying = $derived(audioStore.isTrackPlaying(previewTrackId));

	function buildPreviewTrack(): AudioTrack {
		return {
			id: previewTrackId,
			generationId: generation.id,
			projectId: generation.project_id,
			title: `${song.title} — ${stemDisplay.label} Stem`,
			imageUrl: song.imageUrl,
			streamUrl: stemUrl,
			audioUrl: stemUrl,
			duration: null
		};
	}

	function togglePreview() {
		if (isCurrentTrack) {
			audioStore.toggle();
			return;
		}
		audioStore.play(buildPreviewTrack());
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();
		if (!title.trim() || !prompt.trim() || !style.trim()) return;

		isSubmitting = true;
		try {
			await onSubmit({
				title: title.trim(),
				prompt: prompt.trim(),
				style: style.trim(),
				negativeTags: negativeTags.trim()
			});
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="space-y-6">
	<div
		class="rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-900/30"
	>
		<div class="mb-2 flex items-center gap-2">
			<span class="text-xl">🎤</span>
			<h3 class="font-semibold text-violet-900 dark:text-violet-100">
				Add Vocals from {stemDisplay.label} Stem
			</h3>
		</div>
		<p class="text-sm text-violet-700 dark:text-violet-300">
			Generate a new vocal performance and lyrics from this isolated stem while keeping full lineage
			to the source track.
		</p>
	</div>

	<div
		class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
	>
		<div class="flex items-center justify-between gap-3">
			<div>
				<p class="text-xs font-semibold tracking-wider text-gray-400 uppercase">Source Stem</p>
				<p class="text-sm font-medium text-gray-800 dark:text-gray-200">{song.title}</p>
			</div>
			<button
				type="button"
				onclick={togglePreview}
				class="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
			>
				{#if isPlaying}
					<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
						<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
					</svg>
					Pause Preview
				{:else}
					<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
						<path d="M8 5v14l11-7z" />
					</svg>
					Preview Stem
				{/if}
			</button>
		</div>
	</div>

	<form onsubmit={handleSubmit} class="space-y-4">
		<div>
			<label
				for="add-vocals-title"
				class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
			>
				Title
			</label>
			<input
				type="text"
				id="add-vocals-title"
				bind:value={title}
				maxlength="80"
				placeholder="Vocals title"
				class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
			/>
		</div>

		<div>
			<label
				for="add-vocals-prompt"
				class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
			>
				Prompt / Lyrics
			</label>
			<textarea
				id="add-vocals-prompt"
				bind:value={prompt}
				rows="5"
				maxlength="5000"
				placeholder="[Verse] Neon rain on city streets..."
				class="w-full resize-y rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
			></textarea>
		</div>

		<div>
			<div class="mb-1.5 flex items-center justify-between">
				<label
					for="add-vocals-style"
					class="block text-sm font-medium text-gray-700 dark:text-gray-300"
				>
					Style
				</label>
				<StylePicker
					onSelect={(selectedStyle) => {
						style = selectedStyle.style;
					}}
				/>
			</div>
			<textarea
				id="add-vocals-style"
				bind:value={style}
				rows="3"
				maxlength="1000"
				placeholder="electro pop, moody, lush pads"
				class="w-full resize-y rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
			></textarea>
		</div>

		<div>
			<label
				for="add-vocals-negative-tags"
				class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
			>
				Negative Tags
			</label>
			<textarea
				id="add-vocals-negative-tags"
				bind:value={negativeTags}
				rows="2"
				maxlength="1000"
				placeholder="screamo, harsh distortion"
				class="w-full resize-y rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
			></textarea>
		</div>

		<div class="flex gap-3 pt-2">
			<button
				type="button"
				onclick={onCancel}
				disabled={isSubmitting}
				class="flex-1 cursor-pointer rounded-lg border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
			>
				Cancel
			</button>
			<button
				type="submit"
				disabled={isSubmitting || !title.trim() || !prompt.trim() || !style.trim()}
				class="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-linear-to-r from-violet-600 to-purple-600 px-6 py-3 font-semibold text-white shadow-lg shadow-violet-500/30 transition-all hover:from-violet-700 hover:to-purple-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
			>
				{#if isSubmitting}
					<svg class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
						></circle>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
					Creating...
				{:else}
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 18.5c4.142 0 7.5-3.134 7.5-7s-3.358-7-7.5-7-7.5 3.134-7.5 7 3.358 7 7.5 7zM12 18.5v3m0-17v3m0 0a2 2 0 100-4 2 2 0 000 4z"
						/>
					</svg>
					Add Vocals
				{/if}
			</button>
		</div>
	</form>
</div>
