<script lang="ts">
	import { audioStore, type AudioTrack } from '$lib/stores/audio.svelte';
	import { formatTime } from '$lib/utils/format';
	import ArtworkImage from './ArtworkImage.svelte';

	let {
		src,
		title = 'Audio Track',
		imageUrl = '',
		duration = 0,
		continueAt = null,
		trackId,
		generationId,
		projectId
	}: {
		src: string;
		title?: string;
		imageUrl?: string;
		duration?: number;
		continueAt?: number | null;
		trackId: string;
		generationId: number;
		projectId: number;
	} = $props();

	// Check if this track is currently loaded/playing
	let isCurrentTrack = $derived(audioStore.isCurrentTrack(trackId));
	let isPlaying = $derived(audioStore.isTrackPlaying(trackId));
	let currentTime = $derived(isCurrentTrack ? audioStore.currentTime : 0);
	let audioDuration = $derived(isCurrentTrack ? audioStore.duration : duration);
	let totalDuration = $derived(audioDuration || duration || 0);
	let volume = $derived(audioStore.volume);
	let isMuted = $derived(audioStore.isMuted);
	let progressBar: HTMLDivElement | undefined = $state();
	let hoverTime = $state<number | null>(null);
	let hoverPercent = $state(0);
	let hasExtensionTime = $derived(continueAt !== null && Number.isFinite(continueAt));
	let extensionTime = $derived(hasExtensionTime ? Math.max(0, continueAt as number) : 0);
	let extensionJumpTime = $derived(Math.max(0, extensionTime - 10));

	function buildTrack(): AudioTrack {
		return {
			id: trackId,
			generationId,
			projectId,
			title,
			imageUrl: imageUrl || null,
			streamUrl: null,
			audioUrl: src,
			duration
		};
	}

	function handlePlayPause() {
		if (isCurrentTrack) {
			audioStore.toggle();
		} else {
			// Start playing this track
			audioStore.play(buildTrack());
		}
	}

	function handlePlayFromExtension() {
		if (!hasExtensionTime) return;
		audioStore.play(buildTrack(), extensionJumpTime);
	}

	function handleSeek(e: Event) {
		const target = e.target as HTMLInputElement;
		if (isCurrentTrack) {
			audioStore.seek(parseFloat(target.value));
		}
	}

	function getTimeFromMouseEvent(e: MouseEvent) {
		if (!progressBar || totalDuration === 0) return null;
		const rect = progressBar.getBoundingClientRect();
		const clampedX = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
		const ratio = rect.width > 0 ? clampedX / rect.width : 0;
		return {
			time: ratio * totalDuration,
			percent: ratio * 100
		};
	}

	function handleProgressMove(e: MouseEvent) {
		const result = getTimeFromMouseEvent(e);
		if (!result) {
			hoverTime = null;
			return;
		}
		hoverTime = result.time;
		hoverPercent = result.percent;
	}

	function handleProgressLeave() {
		hoverTime = null;
	}

	function handleVolumeChange(e: Event) {
		const target = e.target as HTMLInputElement;
		audioStore.setVolume(parseFloat(target.value));
	}

	function toggleMute() {
		audioStore.toggleMute();
	}
</script>

<div
	class="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
>
	<ArtworkImage
		src={imageUrl}
		alt={title}
		imageClass="h-16 w-16 shrink-0 rounded-lg object-cover"
		fallbackClass="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-indigo-500 to-purple-600"
		iconClass="h-8 w-8 text-white"
	/>

	<div class="min-w-0 flex-1">
		<div class="flex items-center gap-2">
			<h4 class="truncate font-medium text-gray-900 dark:text-gray-100">{title}</h4>
			{#if hasExtensionTime}
				<span
					class="inline-flex shrink-0 items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300"
				>
					Extended at {formatTime(extensionTime)}
				</span>
			{/if}
		</div>
		<div class="mt-2 flex items-center gap-3">
			<div class="flex shrink-0 items-center gap-2">
				<!-- Play/Pause button -->
				<button
					onclick={handlePlayPause}
					class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-indigo-600 text-white transition-colors hover:bg-indigo-700"
				>
					{#if isPlaying}
						<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
							<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
						</svg>
					{:else}
						<svg class="h-5 w-5 pl-0.5" fill="currentColor" viewBox="0 0 24 24">
							<path d="M8 5v14l11-7z" />
						</svg>
					{/if}
				</button>

				{#if hasExtensionTime}
					<button
						onclick={handlePlayFromExtension}
						title={`Play from ${formatTime(extensionJumpTime)} (10 seconds before extension point)`}
						class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 transition-all hover:border-indigo-300 hover:bg-indigo-100 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:border-indigo-400/50 dark:hover:bg-indigo-500/20"
					>
						<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
							<path
								d="M11 5v5.5h5.5a.75.75 0 010 1.5h-7A.75.75 0 019 11V5a.75.75 0 011.5 0v3.232A7.25 7.25 0 1110 19.5a7.18 7.18 0 01-5.126-2.126.75.75 0 111.06-1.06A5.75 5.75 0 1010 6.75h-.06l1.28 1.28A.75.75 0 0110.16 9l-2.5-2.5a.75.75 0 010-1.06l2.5-2.5a.75.75 0 011.06 1.06L9.94 5.25h.06c3.997 0 7.25 3.253 7.25 7.25S13.997 19.75 10 19.75 2.75 16.497 2.75 12.5 6.003 5.25 10 5.25z"
							/>
						</svg>
					</button>
				{/if}
			</div>

			<!-- Progress bar -->
			<div class="flex flex-1 items-center gap-2">
				<span class="w-10 text-xs text-gray-500 dark:text-gray-400">
					{formatTime(currentTime)}
				</span>
				<div bind:this={progressBar} class="relative flex-1">
					{#if hoverTime !== null}
						<div
							class="pointer-events-none absolute -top-6 -translate-x-1/2 rounded bg-gray-900 px-2 py-0.5 text-xs text-white"
							style={`left: ${hoverPercent}%`}
						>
							{formatTime(hoverTime)}
						</div>
					{/if}
					<input
						type="range"
						min="0"
						max={totalDuration || 100}
						value={currentTime}
						oninput={handleSeek}
						onmousemove={handleProgressMove}
						onmouseleave={handleProgressLeave}
						class="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-indigo-600 dark:bg-gray-700"
					/>
				</div>
				<span class="w-10 text-xs text-gray-500 dark:text-gray-400">
					{formatTime(totalDuration)}
				</span>
			</div>

			<!-- Volume control -->
			<div class="flex items-center gap-2">
				<button
					onclick={toggleMute}
					class="cursor-pointer text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
				>
					{#if isMuted || volume === 0}
						<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
							/>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
							/>
						</svg>
					{:else}
						<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
							/>
						</svg>
					{/if}
				</button>
				<input
					type="range"
					min="0"
					max="1"
					step="0.1"
					value={volume}
					oninput={handleVolumeChange}
					class="hidden h-1 w-20 cursor-pointer appearance-none rounded-full bg-gray-200 accent-indigo-600 sm:block dark:bg-gray-700"
				/>
			</div>
		</div>
	</div>
</div>
