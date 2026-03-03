<script lang="ts">
	import type { Generation } from '$lib/types';
	import AddInstrumentalForm from '$lib/components/AddInstrumentalForm.svelte';
	import { getStemDisplay, normalizeStemType } from '$lib/utils/stems';

	type SongInfo = {
		id: string;
		title: string;
		imageUrl: string | null;
	};

	let {
		show,
		generation,
		song,
		stemType = null,
		stemUrl = null,
		onSubmit,
		onCancel
	}: {
		show: boolean;
		generation: Generation;
		song: SongInfo;
		stemType?: string | null;
		stemUrl?: string | null;
		onSubmit: (data: { title: string; tags: string; negativeTags: string }) => Promise<void>;
		onCancel: () => void;
	} = $props();

	let normalizedStemType = $derived(normalizeStemType(stemType));
	let stemDisplay = $derived(getStemDisplay(normalizedStemType));
	let canRenderForm = $derived(!!stemUrl && !!normalizedStemType);
</script>

{#if show}
	<div class="mb-6">
		<div
			class="overflow-hidden rounded-2xl border border-teal-200/80 bg-white shadow-lg shadow-teal-500/10 dark:border-teal-800/50 dark:bg-gray-900"
		>
			<div class="h-1 w-full bg-linear-to-r from-teal-500 via-emerald-500 to-cyan-500"></div>
			<div
				class="flex items-center gap-2.5 border-b border-gray-100 px-5 py-3.5 dark:border-gray-800"
			>
				<span
					class="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900/40"
				>
					<svg
						class="h-4 w-4 text-teal-600 dark:text-teal-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zm12-2a3 3 0 11-6 0 3 3 0 016 0z"
						/>
					</svg>
				</span>
				<span class="text-sm font-semibold text-gray-900 dark:text-gray-100">Add Instrumental</span>
				{#if canRenderForm}
					<span
						class="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700 dark:border-teal-700/60 dark:bg-teal-900/30 dark:text-teal-300"
					>
						<span>{stemDisplay.icon}</span>
						<span>{stemDisplay.label}</span>
					</span>
				{/if}
			</div>
			<div class="p-5">
				{#if canRenderForm}
					<AddInstrumentalForm
						{generation}
						{song}
						stemType={normalizedStemType as string}
						stemUrl={stemUrl!}
						{onSubmit}
						{onCancel}
					/>
				{:else}
					<p class="text-sm text-gray-500 dark:text-gray-400">No stem selected for this action.</p>
				{/if}
			</div>
		</div>

		<div class="relative mt-6 flex items-center gap-3">
			<div
				class="h-px flex-1 bg-linear-to-r from-transparent via-gray-200 to-transparent dark:via-gray-700"
			></div>
			<span
				class="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-medium tracking-wide text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500"
			>
				Track details
			</span>
			<div
				class="h-px flex-1 bg-linear-to-r from-transparent via-gray-200 to-transparent dark:via-gray-700"
			></div>
		</div>
	</div>
{/if}
