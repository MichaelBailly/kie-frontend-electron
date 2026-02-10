<script lang="ts">
	import type { PageData } from './$types';
	import type { StarredVariation } from './+page.server';
	import type { VariationAnnotation } from '$lib/types';
	import { audioStore, type AudioTrack } from '$lib/stores/audio.svelte';
	import LabelPicker from '$lib/components/LabelPicker.svelte';
	import { getContext } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { resolve } from '$app/paths';

	let { data }: { data: PageData } = $props();

	// Filter state: 'all' | 'starred' | 'notes'
	let filter = $state<'all' | 'starred' | 'notes'>('all');

	// Get annotations context for live updates
	const annotationsContext = getContext<
		| {
				get: (generationId: number, audioId: string) => VariationAnnotation | undefined;
				isStarred: (generationId: number, audioId: string) => boolean;
		  }
		| undefined
	>('annotations');

	let variations = $derived.by(() => {
		let items = data.starredVariations as StarredVariation[];

		// Apply live annotation updates from context
		if (annotationsContext) {
			items = items.map((item) => {
				const liveAnn = annotationsContext.get(
					item.annotation.generation_id,
					item.annotation.audio_id
				);
				if (liveAnn) {
					return { ...item, annotation: { ...item.annotation, ...liveAnn } };
				}
				return item;
			});
		}

		// Filter
		if (filter === 'starred') {
			items = items.filter((v) => v.annotation.starred === 1);
		} else if (filter === 'notes') {
			items = items.filter((v) => v.annotation.comment && v.annotation.comment.trim() !== '');
		}

		return items;
	});

	let starredCount = $derived(
		(data.starredVariations as StarredVariation[]).filter((v) => v.annotation.starred === 1).length
	);
	let notesCount = $derived(
		(data.starredVariations as StarredVariation[]).filter(
			(v) => v.annotation.comment && v.annotation.comment.trim() !== ''
		).length
	);

	// Star animation tracking per variation
	let starAnimations = new SvelteMap<string, string>();

	async function handleToggleStar(generationId: number, audioId: string) {
		const wasStarred = annotationsContext?.isStarred(generationId, audioId) ?? false;
		starAnimations.set(audioId, wasStarred ? 'star-unstar' : 'star-burst');
		setTimeout(() => {
			starAnimations.delete(audioId);
		}, 600);

		try {
			await fetch(`/api/generations/${generationId}/annotations`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ audioId, action: 'toggle_star' })
			});
		} catch {
			console.error('Failed to toggle star');
		}
	}

	function handlePlay(variation: StarredVariation) {
		const { song, generation } = variation;
		const track: AudioTrack = {
			id: song.id,
			generationId: generation.id,
			projectId: generation.project_id,
			title: song.title,
			imageUrl: song.imageUrl,
			streamUrl: song.streamUrl,
			audioUrl: song.audioUrl,
			duration: song.duration
		};

		if (audioStore.isTrackPlaying(song.id)) {
			audioStore.toggle();
		} else if (audioStore.isCurrentTrack(song.id)) {
			audioStore.toggle();
		} else {
			audioStore.play(track);
		}
	}

	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getTimeAgo(dateStr: string): string {
		const date = new Date(dateStr);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMins / 60);
		const diffDays = Math.floor(diffHours / 24);

		if (diffMins < 1) return 'just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;
		return formatDate(dateStr);
	}

	let progressBar: HTMLDivElement | undefined = $state();
	let hoverTime = $state<number | null>(null);
	let hoverPercent = $state(0);

	function getHoverTimeFromMouseEvent(event: MouseEvent, duration: number) {
		if (!progressBar || duration === 0) return null;
		const rect = progressBar.getBoundingClientRect();
		const clampedX = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
		const ratio = rect.width > 0 ? clampedX / rect.width : 0;
		return {
			time: ratio * duration,
			percent: ratio * 100
		};
	}

	function handleProgressMove(event: MouseEvent, duration: number) {
		const result = getHoverTimeFromMouseEvent(event, duration);
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

	function handleProgressClick(event: MouseEvent, duration: number) {
		if (duration === 0) return;
		const result = getHoverTimeFromMouseEvent(event, duration);
		if (!result) return;
		audioStore.seek(result.time);
	}
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<div
					class="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-amber-400 to-orange-500 shadow-md shadow-amber-500/20"
				>
					<svg class="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
						<path
							d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
						/>
					</svg>
				</div>
				<div>
					<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Starred & Notes</h2>
					<p class="text-sm text-gray-500 dark:text-gray-400">
						{data.starredVariations.length} annotated variation{data.starredVariations.length !== 1
							? 's'
							: ''}
					</p>
				</div>
			</div>
		</div>

		<!-- Filter pills -->
		{#if data.starredVariations.length > 0}
			<div class="mt-4 flex gap-2">
				<button
					onclick={() => (filter = 'all')}
					class="cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-medium transition-all {filter ===
					'all'
						? 'bg-gray-900 text-white shadow-sm dark:bg-gray-100 dark:text-gray-900'
						: 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'}"
				>
					All ({data.starredVariations.length})
				</button>
				<button
					onclick={() => (filter = 'starred')}
					class="cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-medium transition-all {filter ===
					'starred'
						? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
						: 'bg-gray-100 text-gray-600 hover:bg-amber-50 hover:text-amber-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-amber-900/30 dark:hover:text-amber-400'}"
				>
					<span class="inline-flex items-center gap-1">
						<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
							<path
								d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
							/>
						</svg>
						Starred ({starredCount})
					</span>
				</button>
				<button
					onclick={() => (filter = 'notes')}
					class="cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-medium transition-all {filter ===
					'notes'
						? 'bg-indigo-500 text-white shadow-sm shadow-indigo-500/30'
						: 'bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400'}"
				>
					<span class="inline-flex items-center gap-1">
						<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
							/>
						</svg>
						With Notes ({notesCount})
					</span>
				</button>
			</div>
		{/if}
	</div>

	<!-- Variation list -->
	<div class="flex-1 overflow-y-auto p-6">
		{#if variations.length === 0}
			<div class="flex flex-col items-center justify-center py-20">
				{#if data.starredVariations.length === 0}
					<!-- No annotations at all -->
					<div
						class="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800"
					>
						<svg
							class="h-10 w-10 text-gray-300 dark:text-gray-600"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="1.5"
								d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
							/>
						</svg>
					</div>
					<h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
						No starred variations yet
					</h3>
					<p class="mt-2 max-w-sm text-center text-sm text-gray-500 dark:text-gray-400">
						Star your favorite variations or add notes from the song detail page. They'll appear
						here for easy access.
					</p>
				{:else}
					<!-- Filter returned no results -->
					<div
						class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800"
					>
						<svg
							class="h-8 w-8 text-gray-300 dark:text-gray-600"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="1.5"
								d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
							/>
						</svg>
					</div>
					<h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">No matches</h3>
					<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
						No variations match the current filter.
					</p>
				{/if}
			</div>
		{:else}
			<div class="mx-auto max-w-4xl space-y-3">
				{#each variations as variation (variation.annotation.id)}
					{@const isPlaying = audioStore.isTrackPlaying(variation.song.id)}
					{@const isCurrentTrack = audioStore.isCurrentTrack(variation.song.id)}
					{@const liveAnnotation =
						annotationsContext?.get(
							variation.annotation.generation_id,
							variation.annotation.audio_id
						) ?? variation.annotation}
					{@const liveStarred = liveAnnotation.starred === 1}
					<div
						class="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 hover:border-gray-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600 {isCurrentTrack
							? 'border-indigo-300 ring-2 ring-indigo-500/30 dark:border-indigo-600'
							: ''}"
					>
						<div class="flex items-start gap-4">
							<!-- Thumbnail + Play overlay -->
							<button
								onclick={() => handlePlay(variation)}
								class="group/play relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-lg"
							>
								{#if variation.song.imageUrl}
									<img
										src={variation.song.imageUrl}
										alt={variation.song.title}
										class="h-full w-full object-cover"
									/>
								{:else}
									<div
										class="flex h-full w-full items-center justify-center bg-linear-to-br from-indigo-500 to-purple-600"
									>
										<svg
											class="h-7 w-7 text-white"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
											/>
										</svg>
									</div>
								{/if}
								<div
									class="absolute inset-0 flex items-center justify-center bg-black/0 transition-all group-hover/play:bg-black/40"
								>
									{#if isPlaying}
										<div
											class="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg"
										>
											<svg class="h-4 w-4 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
												<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
											</svg>
										</div>
									{:else}
										<div
											class="flex h-8 w-8 items-center justify-center rounded-full bg-white opacity-0 shadow-lg transition-opacity group-hover/play:opacity-100"
										>
											<svg
												class="h-4 w-4 pl-0.5 text-gray-900"
												fill="currentColor"
												viewBox="0 0 24 24"
											>
												<path d="M8 5v14l11-7z" />
											</svg>
										</div>
									{/if}
								</div>
							</button>

							<!-- Content -->
							<div class="min-w-0 flex-1">
								<div class="flex items-start justify-between gap-2">
									<div class="min-w-0 flex-1">
										<a
											href={resolve(
												`/projects/${variation.generation.project_id}/generations/${variation.generation.id}/song/${variation.song.id}`
											)}
											class="block truncate text-base font-semibold text-gray-900 transition-colors hover:text-indigo-600 dark:text-gray-100 dark:hover:text-indigo-400"
										>
											{variation.generation.title}
										</a>
										<div
											class="mt-0.5 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"
										>
											<span
												class="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300"
											>
												V{variation.song.trackNumber}
											</span>
											{#if variation.song.duration}
												<span>{formatTime(variation.song.duration)}</span>
											{/if}
											<span class="text-gray-300 dark:text-gray-600">·</span>
											<span
												class="truncate text-xs"
												title={formatDate(variation.annotation.updated_at)}
											>
												{getTimeAgo(variation.annotation.updated_at)}
											</span>
										</div>
									</div>

									<!-- Star button -->
									<button
										onclick={() =>
											handleToggleStar(
												variation.annotation.generation_id,
												variation.annotation.audio_id
											)}
										class="shrink-0 cursor-pointer rounded-lg p-1.5 transition-colors {liveStarred
											? 'text-amber-500 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-900/30'
											: 'text-gray-300 hover:bg-gray-100 hover:text-amber-400 dark:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-amber-400'}"
										title={liveStarred ? 'Unstar' : 'Star'}
									>
										<svg
											class="h-5 w-5 {starAnimations.get(variation.annotation.audio_id) || ''}"
											fill={liveStarred ? 'currentColor' : 'none'}
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
											/>
										</svg>
									</button>
								</div>

								<!-- Style badge -->
								<p class="mt-1.5 truncate text-xs text-gray-400 dark:text-gray-500">
									{variation.generation.style}
								</p>

								<LabelPicker
									labels={liveAnnotation.labels ?? []}
									generationId={variation.annotation.generation_id}
									audioId={variation.annotation.audio_id}
									placeholder="Add a label"
								/>

								<!-- Comment / Note -->
								{#if liveAnnotation.comment}
									<div class="mt-2 rounded-lg bg-amber-50/60 px-3 py-2 dark:bg-amber-900/10">
										<p class="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
											{liveAnnotation.comment}
										</p>
									</div>
								{/if}

								<!-- Inline playback progress bar when this is the current track -->
								{#if isCurrentTrack}
									<div class="mt-2 flex items-center gap-2">
										<span
											class="w-10 text-right text-xs font-medium text-gray-500 dark:text-gray-400"
										>
											{formatTime(audioStore.currentTime)}
										</span>
										<div
											bind:this={progressBar}
											role="slider"
											tabindex="0"
											aria-valuemin="0"
											aria-valuemax={audioStore.duration}
											aria-valuenow={audioStore.currentTime}
											class="relative h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
											onmousemove={(event) => handleProgressMove(event, audioStore.duration)}
											onmouseleave={handleProgressLeave}
											onclick={(event) => handleProgressClick(event, audioStore.duration)}
											onkeydown={(event) => {
												if (audioStore.duration === 0) return;
												const step = Math.max(audioStore.duration * 0.02, 1);
												if (event.key === 'ArrowLeft') {
													event.preventDefault();
													audioStore.seek(Math.max(0, audioStore.currentTime - step));
												}
												if (event.key === 'ArrowRight') {
													event.preventDefault();
													audioStore.seek(
														Math.min(audioStore.duration, audioStore.currentTime + step)
													);
												}
												if (event.key === 'Home') {
													event.preventDefault();
													audioStore.seek(0);
												}
												if (event.key === 'End') {
													event.preventDefault();
													audioStore.seek(audioStore.duration);
												}
											}}
										>
											{#if hoverTime !== null}
												<div
													class="pointer-events-none absolute -top-6 -translate-x-1/2 rounded bg-gray-900 px-2 py-0.5 text-xs text-white"
													style={`left: ${hoverPercent}%`}
												>
													{formatTime(hoverTime)}
												</div>
											{/if}
											<div
												class="absolute inset-y-0 left-0 rounded-full bg-indigo-500 transition-all duration-150"
												style="width: {audioStore.duration > 0
													? (audioStore.currentTime / audioStore.duration) * 100
													: 0}%"
											></div>
										</div>
										<span class="w-10 text-xs font-medium text-gray-500 dark:text-gray-400">
											{formatTime(audioStore.duration)}
										</span>
									</div>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
