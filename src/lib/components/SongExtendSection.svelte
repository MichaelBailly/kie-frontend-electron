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
	<div class="mb-10">
		<ExtendSongForm {generation} song={normalizedSong} onExtend={handleExtend} {onCancel} />
	</div>
{/if}
