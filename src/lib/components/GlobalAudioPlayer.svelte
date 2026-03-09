<script lang="ts">
	import { audioStore } from '$lib/stores/audio.svelte';

	let audio: HTMLAudioElement | undefined = $state();

	$effect(() => {
		audioStore.setAudioElement(audio ?? null);

		return () => {
			audioStore.setAudioElement(null);
		};
	});

	function handleTimeUpdate() {
		if (audio) {
			audioStore.onTimeUpdate(audio.currentTime);
		}
	}

	function handleDurationChange() {
		if (audio) {
			audioStore.onDurationChange(audio.duration);
		}
	}

	function handleLoadedMetadata() {
		if (audio) {
			audioStore.onDurationChange(audio.duration);
			// Check if we need to resume after a URL swap
			if (audioStore.hasPendingUrlSwap()) {
				audioStore.handleUrlSwapReady();
			}
		}
	}

	function handlePlay() {
		audioStore.onPlay();
	}

	function handlePause() {
		audioStore.onPause();
	}

	function handleEnded() {
		audioStore.onEnded();
	}

	function handleError() {
		const track = audioStore.currentTrack;
		console.error('[AudioPlayer] Audio element error', {
			trackId: track?.id,
			src: audio?.src,
			audioUrl: track?.audioUrl,
			streamUrl: track?.streamUrl,
			error: audio?.error ? { code: audio.error.code, message: audio.error.message } : 'unknown'
		});
	}
</script>

<!-- Hidden audio element that persists across navigation -->
<audio
	bind:this={audio}
	ontimeupdate={handleTimeUpdate}
	ondurationchange={handleDurationChange}
	onloadedmetadata={handleLoadedMetadata}
	onplay={handlePlay}
	onpause={handlePause}
	onended={handleEnded}
	onerror={handleError}
	preload="metadata"
	class="hidden"
></audio>
