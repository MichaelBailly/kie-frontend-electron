import { audioStore } from '$lib/stores/audio.svelte';
import { buildAudioTrack } from '$lib/utils/audio';
import type { Generation } from '$lib/types';

type SongData = {
	id: string;
	streamUrl: string | null;
	audioUrl: string | null;
	imageUrl: string | null;
	duration: number | null;
	title: string;
};

export function useSongPlaybackState(options: {
	getGeneration: () => Generation;
	getSong: () => SongData;
}) {
	const { getGeneration, getSong } = options;

	const isCurrentTrack = $derived(audioStore.isCurrentTrack(getSong().id));
	const isPlaying = $derived(audioStore.isTrackPlaying(getSong().id));
	const currentTime = $derived(isCurrentTrack ? audioStore.currentTime : 0);
	const duration = $derived(isCurrentTrack ? audioStore.duration : getSong().duration || 0);

	function handleWaveformSeek(time: number) {
		if (isCurrentTrack) {
			audioStore.seek(time);
			return;
		}

		audioStore.play(buildAudioTrack(getGeneration(), getSong()));
		setTimeout(() => audioStore.seek(time), 100);
	}

	function handlePlayPause() {
		if (isCurrentTrack) {
			audioStore.toggle();
			return;
		}

		audioStore.play(buildAudioTrack(getGeneration(), getSong()));
	}

	function handleSeek(event: Event) {
		const target = event.target as HTMLInputElement;
		const time = parseFloat(target.value);

		if (isCurrentTrack) {
			audioStore.seek(time);
		}
	}

	return {
		get isCurrentTrack() {
			return isCurrentTrack;
		},
		get isPlaying() {
			return isPlaying;
		},
		get currentTime() {
			return currentTime;
		},
		get duration() {
			return duration;
		},
		handleWaveformSeek,
		handlePlayPause,
		handleSeek
	};
}
