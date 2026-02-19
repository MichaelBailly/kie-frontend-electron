<script lang="ts">
	import type { Generation } from '$lib/types';
	import ExtendSongForm from '$lib/components/ExtendSongForm.svelte';

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
		onExtend,
		onCancel
	}: {
		show: boolean;
		generation: Generation;
		song: SongInfo;
		onExtend: (data: {
			title: string;
			style: string;
			lyrics: string;
			continueAt: number;
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

	async function handleExtend(data: {
		title: string;
		style: string;
		lyrics: string;
		continueAt: number;
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
			<div class="h-1 w-full bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-500"></div>
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
				<span class="text-sm font-semibold text-gray-900 dark:text-gray-100">Extend Song</span>
			</div>
			<!-- Form body -->
			<div class="p-5">
				<ExtendSongForm {generation} song={normalizedSong} onExtend={handleExtend} {onCancel} />
			</div>
		</div>

		<!-- Closing divider — visual "end of extend zone" -->
		<div class="relative mt-6 flex items-center gap-3">
			<div
				class="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent dark:via-gray-700"
			></div>
			<span
				class="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-medium tracking-wide text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500"
			>
				Track details
			</span>
			<div
				class="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent dark:via-gray-700"
			></div>
		</div>
	</div>
{/if}
