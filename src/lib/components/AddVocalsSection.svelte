<script lang="ts">
	import type { Generation } from '$lib/types';
	import AddVocalsForm from '$lib/components/AddVocalsForm.svelte';
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
		onSubmit: (data: {
			title: string;
			prompt: string;
			style: string;
			negativeTags: string;
		}) => Promise<void>;
		onCancel: () => void;
	} = $props();

	let normalizedStemType = $derived(normalizeStemType(stemType));
	let stemDisplay = $derived(getStemDisplay(normalizedStemType));
	let canRenderForm = $derived(
		!!stemUrl && (normalizedStemType === 'instrumental' || normalizedStemType === 'mp3')
	);
</script>

{#if show}
	<div class="mb-6">
		<div
			class="overflow-hidden rounded-2xl border border-violet-200/80 bg-white shadow-lg shadow-violet-500/10 dark:border-violet-800/50 dark:bg-gray-900"
		>
			<div class="h-1 w-full bg-linear-to-r from-violet-500 via-purple-500 to-fuchsia-500"></div>
			<div
				class="flex items-center gap-2.5 border-b border-gray-100 px-5 py-3.5 dark:border-gray-800"
			>
				<span
					class="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/40"
				>
					<svg
						class="h-4 w-4 text-violet-600 dark:text-violet-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 18.5c4.142 0 7.5-3.134 7.5-7s-3.358-7-7.5-7-7.5 3.134-7.5 7 3.358 7 7.5 7zM12 18.5v3"
						/>
					</svg>
				</span>
				<span class="text-sm font-semibold text-gray-900 dark:text-gray-100">Add Vocals</span>
				{#if canRenderForm}
					<span
						class="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:border-violet-700/60 dark:bg-violet-900/30 dark:text-violet-300"
					>
						<span>{stemDisplay.icon}</span>
						<span>{stemDisplay.label}</span>
					</span>
				{/if}
			</div>
			<div class="p-5">
				{#if canRenderForm}
					<AddVocalsForm
						{generation}
						{song}
						stemType={normalizedStemType as string}
						stemUrl={stemUrl!}
						{onSubmit}
						{onCancel}
					/>
				{:else}
					<p class="text-sm text-gray-500 dark:text-gray-400">
						An instrumental stem or full-mix MP3 is required for this action.
					</p>
				{/if}
			</div>
		</div>
	</div>
{/if}
