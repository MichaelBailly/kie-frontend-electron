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
		onSubmit: (data: { title: string; tags: string; negativeTags: string }) => Promise<void>;
		onCancel: () => void;
	} = $props();

	const normalizedStemType = $derived(normalizeStemType(stemType));
	const stemDisplay = $derived(getStemDisplay(normalizedStemType));

	let title = $state(
		untrack(() => `${generation.title.replace(/( — Instrumental)+$/, '')} — Instrumental`)
	);
	let tags = $state(untrack(() => generation.style ?? ''));
	let negativeTags = $state(untrack(() => generation.negative_tags ?? ''));
	let isSubmitting = $state(false);

	const previewTrackId = $derived(`${song.id}:${normalizedStemType}:add-instrumental-preview`);
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
		if (!title.trim() || !tags.trim()) return;

		isSubmitting = true;
		try {
			await onSubmit({
				title: title.trim(),
				tags: tags.trim(),
				negativeTags: negativeTags.trim()
			});
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="space-y-6">
	<div
		class="rounded-xl border border-teal-200 bg-teal-50 p-4 dark:border-teal-800 dark:bg-teal-900/30"
	>
		<div class="mb-2 flex items-center gap-2">
			<span class="text-xl">{stemDisplay.icon}</span>
			<h3 class="font-semibold text-teal-900 dark:text-teal-100">
				Add Instrumental from {stemDisplay.label} Stem
			</h3>
		</div>
		<p class="text-sm text-teal-700 dark:text-teal-300">
			Generate a fresh instrumental accompaniment from this isolated stem while keeping full lineage
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
				for="add-instrumental-title"
				class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
			>
				Title
			</label>
			<input
				type="text"
				id="add-instrumental-title"
				bind:value={title}
				maxlength="80"
				placeholder="Instrumental title"
				class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
			/>
		</div>

		<div>
			<div class="mb-1.5 flex items-center justify-between">
				<label
					for="add-instrumental-tags"
					class="block text-sm font-medium text-gray-700 dark:text-gray-300"
				>
					Tags
				</label>
				<StylePicker
					onSelect={(s) => {
						tags = s.style;
					}}
				/>
			</div>
			<textarea
				id="add-instrumental-tags"
				bind:value={tags}
				rows="3"
				maxlength="1000"
				placeholder="relaxing, piano, cinematic"
				class="w-full resize-y rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
			></textarea>
		</div>

		<div>
			<label
				for="add-instrumental-negative-tags"
				class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
			>
				Negative Tags
			</label>
			<textarea
				id="add-instrumental-negative-tags"
				bind:value={negativeTags}
				rows="2"
				maxlength="1000"
				placeholder="heavy metal, harsh distortion"
				class="w-full resize-y rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
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
				disabled={isSubmitting || !title.trim() || !tags.trim()}
				class="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-linear-to-r from-teal-600 to-emerald-600 px-6 py-3 font-semibold text-white shadow-lg shadow-teal-500/30 transition-all hover:from-teal-700 hover:to-emerald-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
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
							d="M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zm12-2a3 3 0 11-6 0 3 3 0 016 0z"
						/>
					</svg>
					Add Instrumental
				{/if}
			</button>
		</div>
	</form>
</div>
