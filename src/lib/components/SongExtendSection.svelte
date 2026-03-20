<script lang="ts">
	import type { Generation } from '$lib/types';
	import ExtendSongForm from '$lib/components/ExtendSongForm.svelte';
	import { getStemDisplay, normalizeStemType } from '$lib/utils/stems';

	type SongInfo = {
		id: string;
		title: string;
		streamUrl: string | null;
		audioUrl: string | null;
		imageUrl: string | null;
		duration: number | null;
	};

	let {
		show,
		generation,
		song,
		stemType = null,
		stemUrl = null,
		onExtend,
		onCancel
	}: {
		show: boolean;
		generation: Generation;
		song: SongInfo;
		stemType?: string | null;
		stemUrl?: string | null;
		onExtend: (data: {
			title: string;
			style: string;
			lyrics: string;
			negativeTags: string;
			continueAt: number;
			instrumental: boolean;
		}) => void | Promise<void>;
		onCancel: () => void;
	} = $props();

	let normalizedSong = $derived.by(() => ({
		id: song.id,
		title: song.title,
		streamUrl: song.streamUrl ?? null,
		audioUrl: song.audioUrl ?? null,
		imageUrl: song.imageUrl ?? null,
		duration: song.duration ?? null
	}));

	let normalizedStemType = $derived(normalizeStemType(stemType));
	let stemDisplay = $derived(getStemDisplay(normalizedStemType));
	let isStemExtension = $derived(!!stemUrl && !!normalizedStemType);

	async function handleExtend(data: {
		title: string;
		style: string;
		lyrics: string;
		negativeTags: string;
		continueAt: number;
		instrumental: boolean;
	}): Promise<void> {
		await onExtend(data);
	}
</script>

{#if show}
	<div class="mb-6">
		<!-- Card shell -->
		<div
			class="overflow-hidden rounded-2xl border border-purple-200/80 bg-white shadow-lg shadow-purple-500/10 dark:border-purple-800/50 dark:bg-gray-900"
		>
			<!-- Top accent bar + header -->
			<div
				class="h-1 w-full bg-linear-to-r {isStemExtension
					? 'from-cyan-500 via-purple-500 to-indigo-500'
					: 'from-purple-500 via-violet-500 to-indigo-500'}"
			></div>
			<div
				class="flex items-center gap-2.5 border-b border-gray-100 px-5 py-3.5 dark:border-gray-800"
			>
				<span
					class="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/40"
				>
					<svg
						class="h-4 w-4 text-purple-600 dark:text-purple-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 5l7 7-7 7M5 5l7 7-7 7"
						/>
					</svg>
				</span>
				<span class="text-sm font-semibold text-gray-900 dark:text-gray-100"
					>{isStemExtension ? 'Extend Stem' : 'Extend Song'}</span
				>
				{#if isStemExtension}
					<span
						class="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[11px] font-semibold text-cyan-700 dark:border-cyan-700/60 dark:bg-cyan-900/30 dark:text-cyan-300"
					>
						<span>{stemDisplay.icon}</span>
						<span>{stemDisplay.label}</span>
					</span>
				{/if}
			</div>
			<!-- Form body -->
			<div class="p-5">
				<ExtendSongForm
					{generation}
					song={normalizedSong}
					{stemType}
					{stemUrl}
					onExtend={handleExtend}
					{onCancel}
				/>
			</div>
		</div>

		<!-- Closing divider — visual "end of extend zone" -->
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
