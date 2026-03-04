<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Generation } from '$lib/types';
	import AnnotationActions from './AnnotationActions.svelte';
	import AudioPlayer from './AudioPlayer.svelte';

	let {
		generation,
		variation
	}: {
		generation: Generation;
		variation: 1 | 2;
	} = $props();

	const trackAudioId = $derived(
		variation === 1 ? generation.track1_audio_id : generation.track2_audio_id
	);
	const trackStreamUrl = $derived(
		variation === 1 ? generation.track1_stream_url : generation.track2_stream_url
	);
	const trackAudioLocalUrl = $derived(
		variation === 1 ? generation.track1_audio_local_url : generation.track2_audio_local_url
	);
	const trackAudioUrl = $derived(
		variation === 1 ? generation.track1_audio_url : generation.track2_audio_url
	);
	const trackImageUrl = $derived(
		variation === 1
			? generation.track1_image_local_url || generation.track1_image_url || ''
			: generation.track2_image_local_url || generation.track2_image_url || ''
	);
	const trackDuration = $derived(
		variation === 1 ? generation.track1_duration || 0 : generation.track2_duration || 0
	);
	const trackSrc = $derived(trackAudioLocalUrl || trackAudioUrl || trackStreamUrl || '');
	const hasTrackSource = $derived(!!trackStreamUrl || !!trackAudioLocalUrl || !!trackAudioUrl);
</script>

{#if hasTrackSource}
	<div>
		<div class="mb-2 flex items-center gap-2">
			{#if trackAudioId}
				<a
					href={resolve(
						`/projects/${generation.project_id}/generations/${generation.id}/song/${trackAudioId}`
					)}
					class="shrink-0 text-sm font-semibold text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
				>
					Variation {variation}
				</a>
			{:else}
				<p class="text-sm font-medium text-gray-600 dark:text-gray-400">Variation {variation}</p>
			{/if}
			{#if trackAudioId}
				<AnnotationActions generationId={generation.id} audioId={trackAudioId} />
			{/if}
		</div>
		<AudioPlayer
			src={trackSrc}
			title="{generation.title} (V{variation})"
			imageUrl={trackImageUrl}
			duration={trackDuration}
			continueAt={generation.continue_at}
			trackId={trackAudioId || `preview-${generation.id}-${variation}`}
			generationId={generation.id}
			projectId={generation.project_id}
		/>
	</div>
{/if}
