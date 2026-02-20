<script lang="ts">
	import type { PageData } from './$types';
	import type { HighlightVariation, HighlightStem } from './+page.server';
	import { audioStore, type AudioTrack } from '$lib/stores/audio.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { formatTime, getTimeAgo, formatDate } from '$lib/utils/format';

	let { data }: { data: PageData } = $props();

	// Section collapse state — all start expanded
	let starredExpanded = $state(true);
	let notedExpanded = $state(true);
	let stemsExpanded = $state(true);
	let extensionsExpanded = $state(true);
	let labeledExpanded = $state(true);

	const dateOptions = {
		locale: 'en-US',
		formatOptions: {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		} satisfies Intl.DateTimeFormatOptions
	};

	function formatHighlightDate(dateStr: string): string {
		return getTimeAgo(dateStr, {
			fallback: (date) => formatDate(date.toISOString(), dateOptions)
		});
	}

	function handlePlayVariation(variation: HighlightVariation) {
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

		if (audioStore.isTrackPlaying(song.id) || audioStore.isCurrentTrack(song.id)) {
			audioStore.toggle();
		} else {
			audioStore.play(track);
		}
	}

	function handlePlayStem(stem: HighlightStem) {
		const { song, generation } = stem;
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

		if (audioStore.isTrackPlaying(song.id) || audioStore.isCurrentTrack(song.id)) {
			audioStore.toggle();
		} else {
			audioStore.play(track);
		}
	}

	function getStemTypeLabel(type: string): string {
		return type === 'separate_vocal' ? 'Vocal/Instrumental' : 'Full Stems';
	}

	let hasAnyContent = $derived(
		data.starred.length > 0 ||
			data.noted.length > 0 ||
			data.stems.length > 0 ||
			data.extensions.length > 0 ||
			data.labeled.length > 0
	);
</script>

<svelte:head>
	<title>Highlights - KIE Music</title>
</svelte:head>

<div class="min-h-screen bg-linear-to-br from-gray-900 via-gray-900 to-indigo-950">
	<!-- Header -->
	<header class="border-b border-white/10 bg-black/20 backdrop-blur-sm">
		<div class="mx-auto max-w-5xl px-6 py-8">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-4">
					<button
						onclick={() => goto(resolve('/'))}
						class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-white/20 bg-white/5 text-gray-400 transition-all hover:border-white/30 hover:bg-white/10 hover:text-white"
						aria-label="Back to projects"
					>
						<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15 19l-7-7 7-7"
							/>
						</svg>
					</button>
					<div>
						<h1 class="text-3xl font-bold text-white">Highlights</h1>
						<p class="mt-1 text-gray-400">Notable work across all projects</p>
					</div>
				</div>
			</div>
		</div>
	</header>

	<!-- Main content -->
	<main class="mx-auto max-w-5xl px-6 py-8">
		{#if !hasAnyContent}
			<!-- Empty state -->
			<div
				class="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-8 py-20 text-center backdrop-blur-sm"
			>
				<div
					class="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-br from-amber-500/20 to-orange-500/20"
				>
					<svg
						class="h-10 w-10 text-amber-400"
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
				<h3 class="text-xl font-semibold text-white">No highlights yet</h3>
				<p class="mt-2 max-w-sm text-gray-400">
					Star variations, add notes, separate stems, extend songs, or assign labels — they'll all
					appear here.
				</p>
				<button
					onclick={() => goto(resolve('/'))}
					class="mt-6 rounded-xl border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-white transition-all hover:border-white/30 hover:bg-white/10"
				>
					Back to Projects
				</button>
			</div>
		{:else}
			<div class="space-y-6">
				<!-- Starred Section -->
				{#if data.starred.length > 0}
					<section
						class="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm"
					>
						<button
							onclick={() => (starredExpanded = !starredExpanded)}
							class="flex w-full cursor-pointer items-center justify-between px-6 py-4 text-left transition-colors hover:bg-white/5"
							aria-expanded={starredExpanded}
						>
							<div class="flex items-center gap-3">
								<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/20">
									<svg class="h-5 w-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
										<path
											d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
										/>
									</svg>
								</div>
								<div>
									<h2 class="text-lg font-semibold text-white">Starred</h2>
									<p class="text-sm text-gray-400">
										{data.starred.length} variation{data.starred.length !== 1 ? 's' : ''}
									</p>
								</div>
							</div>
							<svg
								class="h-5 w-5 text-gray-500 transition-transform {starredExpanded
									? 'rotate-180'
									: ''}"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 9l-7 7-7-7"
								/>
							</svg>
						</button>
						{#if starredExpanded}
							<div class="space-y-2 px-6 pb-6">
								{#each data.starred as variation (variation.annotation.id)}
									{@const isPlaying = audioStore.isTrackPlaying(variation.song.id)}
									{@const isCurrentTrack = audioStore.isCurrentTrack(variation.song.id)}
									<div
										class="group flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.03] p-3 transition-all hover:border-white/10 hover:bg-white/[0.06] {isCurrentTrack
											? 'border-indigo-500/30 ring-1 ring-indigo-500/20'
											: ''}"
									>
										<!-- Thumbnail + Play -->
										<button
											onclick={() => handlePlayVariation(variation)}
											class="group/play relative h-12 w-12 shrink-0 cursor-pointer overflow-hidden rounded-lg"
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
														class="h-5 w-5 text-white"
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
														class="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-lg"
													>
														<svg
															class="h-3.5 w-3.5 text-gray-900"
															fill="currentColor"
															viewBox="0 0 24 24"
														>
															<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
														</svg>
													</div>
												{:else}
													<div
														class="flex h-7 w-7 items-center justify-center rounded-full bg-white opacity-0 shadow-lg transition-opacity group-hover/play:opacity-100"
													>
														<svg
															class="h-3.5 w-3.5 pl-0.5 text-gray-900"
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
											<a
												href={resolve(
													`/projects/${variation.generation.project_id}/generations/${variation.generation.id}/song/${variation.song.id}`
												)}
												class="block truncate text-sm font-semibold text-white transition-colors hover:text-indigo-300"
											>
												{variation.generation.title}
											</a>
											<div class="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
												<span
													class="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-gray-300"
												>
													{variation.annotation.project_name}
												</span>
												<span
													class="rounded bg-gray-700 px-1.5 py-0.5 text-[10px] font-medium text-gray-300"
												>
													V{variation.song.trackNumber}
												</span>
												{#if variation.song.duration}
													<span>{formatTime(variation.song.duration)}</span>
												{/if}
												<span class="text-gray-600">·</span>
												<span>{formatHighlightDate(variation.annotation.updated_at)}</span>
											</div>
										</div>

										<!-- Star indicator -->
										<svg
											class="h-4 w-4 shrink-0 text-amber-400"
											fill="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
											/>
										</svg>
									</div>
								{/each}
							</div>
						{/if}
					</section>
				{/if}

				<!-- Notes Section -->
				{#if data.noted.length > 0}
					<section
						class="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm"
					>
						<button
							onclick={() => (notedExpanded = !notedExpanded)}
							class="flex w-full cursor-pointer items-center justify-between px-6 py-4 text-left transition-colors hover:bg-white/5"
							aria-expanded={notedExpanded}
						>
							<div class="flex items-center gap-3">
								<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/20">
									<svg
										class="h-5 w-5 text-indigo-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
										/>
									</svg>
								</div>
								<div>
									<h2 class="text-lg font-semibold text-white">With Notes</h2>
									<p class="text-sm text-gray-400">
										{data.noted.length} variation{data.noted.length !== 1 ? 's' : ''}
									</p>
								</div>
							</div>
							<svg
								class="h-5 w-5 text-gray-500 transition-transform {notedExpanded
									? 'rotate-180'
									: ''}"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 9l-7 7-7-7"
								/>
							</svg>
						</button>
						{#if notedExpanded}
							<div class="space-y-2 px-6 pb-6">
								{#each data.noted as variation (variation.annotation.id)}
									{@const isPlaying = audioStore.isTrackPlaying(variation.song.id)}
									{@const isCurrentTrack = audioStore.isCurrentTrack(variation.song.id)}
									<div
										class="group rounded-xl border border-white/5 bg-white/[0.03] p-3 transition-all hover:border-white/10 hover:bg-white/[0.06] {isCurrentTrack
											? 'border-indigo-500/30 ring-1 ring-indigo-500/20'
											: ''}"
									>
										<div class="flex items-center gap-4">
											<!-- Thumbnail + Play -->
											<button
												onclick={() => handlePlayVariation(variation)}
												class="group/play relative h-12 w-12 shrink-0 cursor-pointer overflow-hidden rounded-lg"
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
															class="h-5 w-5 text-white"
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
															class="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-lg"
														>
															<svg
																class="h-3.5 w-3.5 text-gray-900"
																fill="currentColor"
																viewBox="0 0 24 24"
															>
																<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
															</svg>
														</div>
													{:else}
														<div
															class="flex h-7 w-7 items-center justify-center rounded-full bg-white opacity-0 shadow-lg transition-opacity group-hover/play:opacity-100"
														>
															<svg
																class="h-3.5 w-3.5 pl-0.5 text-gray-900"
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
												<a
													href={resolve(
														`/projects/${variation.generation.project_id}/generations/${variation.generation.id}/song/${variation.song.id}`
													)}
													class="block truncate text-sm font-semibold text-white transition-colors hover:text-indigo-300"
												>
													{variation.generation.title}
												</a>
												<div class="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
													<span
														class="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-gray-300"
													>
														{variation.annotation.project_name}
													</span>
													<span
														class="rounded bg-gray-700 px-1.5 py-0.5 text-[10px] font-medium text-gray-300"
													>
														V{variation.song.trackNumber}
													</span>
													{#if variation.song.duration}
														<span>{formatTime(variation.song.duration)}</span>
													{/if}
													<span class="text-gray-600">·</span>
													<span>{formatHighlightDate(variation.annotation.updated_at)}</span>
												</div>
											</div>
										</div>

										<!-- Comment preview -->
										{#if variation.annotation.comment}
											<div class="mt-2 ml-16 rounded-lg bg-indigo-500/10 px-3 py-2">
												<p class="line-clamp-2 text-sm leading-relaxed text-gray-300">
													{variation.annotation.comment}
												</p>
											</div>
										{/if}
									</div>
								{/each}
							</div>
						{/if}
					</section>
				{/if}

				<!-- Stem Separations Section -->
				{#if data.stems.length > 0}
					<section
						class="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm"
					>
						<button
							onclick={() => (stemsExpanded = !stemsExpanded)}
							class="flex w-full cursor-pointer items-center justify-between px-6 py-4 text-left transition-colors hover:bg-white/5"
							aria-expanded={stemsExpanded}
						>
							<div class="flex items-center gap-3">
								<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20">
									<svg
										class="h-5 w-5 text-emerald-400"
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
								<div>
									<h2 class="text-lg font-semibold text-white">Stem Separations</h2>
									<p class="text-sm text-gray-400">
										{data.stems.length} completed separation{data.stems.length !== 1 ? 's' : ''}
									</p>
								</div>
							</div>
							<svg
								class="h-5 w-5 text-gray-500 transition-transform {stemsExpanded
									? 'rotate-180'
									: ''}"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 9l-7 7-7-7"
								/>
							</svg>
						</button>
						{#if stemsExpanded}
							<div class="space-y-2 px-6 pb-6">
								{#each data.stems as stem (stem.stemSeparation.id)}
									{@const isPlaying = audioStore.isTrackPlaying(stem.song.id)}
									{@const isCurrentTrack = audioStore.isCurrentTrack(stem.song.id)}
									<div
										class="group flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.03] p-3 transition-all hover:border-white/10 hover:bg-white/[0.06] {isCurrentTrack
											? 'border-indigo-500/30 ring-1 ring-indigo-500/20'
											: ''}"
									>
										<!-- Thumbnail + Play -->
										<button
											onclick={() => handlePlayStem(stem)}
											class="group/play relative h-12 w-12 shrink-0 cursor-pointer overflow-hidden rounded-lg"
										>
											{#if stem.song.imageUrl}
												<img
													src={stem.song.imageUrl}
													alt={stem.song.title}
													class="h-full w-full object-cover"
												/>
											{:else}
												<div
													class="flex h-full w-full items-center justify-center bg-linear-to-br from-emerald-500 to-teal-600"
												>
													<svg
														class="h-5 w-5 text-white"
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
														class="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-lg"
													>
														<svg
															class="h-3.5 w-3.5 text-gray-900"
															fill="currentColor"
															viewBox="0 0 24 24"
														>
															<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
														</svg>
													</div>
												{:else}
													<div
														class="flex h-7 w-7 items-center justify-center rounded-full bg-white opacity-0 shadow-lg transition-opacity group-hover/play:opacity-100"
													>
														<svg
															class="h-3.5 w-3.5 pl-0.5 text-gray-900"
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
											<a
												href={resolve(
													`/projects/${stem.generation.project_id}/generations/${stem.generation.id}/song/${stem.song.id}`
												)}
												class="block truncate text-sm font-semibold text-white transition-colors hover:text-indigo-300"
											>
												{stem.stemSeparation.generation_title}
											</a>
											<div class="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
												<span
													class="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-gray-300"
												>
													{stem.stemSeparation.project_name}
												</span>
												<span
													class="rounded bg-gray-700 px-1.5 py-0.5 text-[10px] font-medium text-gray-300"
												>
													V{stem.song.trackNumber}
												</span>
												{#if stem.song.duration}
													<span>{formatTime(stem.song.duration)}</span>
												{/if}
												<span class="text-gray-600">·</span>
												<span>{formatHighlightDate(stem.stemSeparation.updated_at)}</span>
											</div>
										</div>

										<!-- Stem type badge -->
										<span
											class="shrink-0 rounded-full bg-emerald-500/20 px-2.5 py-1 text-[10px] font-medium text-emerald-300"
										>
											{getStemTypeLabel(stem.stemSeparation.type)}
										</span>
									</div>
								{/each}
							</div>
						{/if}
					</section>
				{/if}

				<!-- Extended Section -->
				{#if data.extensions.length > 0}
					<section
						class="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm"
					>
						<button
							onclick={() => (extensionsExpanded = !extensionsExpanded)}
							class="flex w-full cursor-pointer items-center justify-between px-6 py-4 text-left transition-colors hover:bg-white/5"
							aria-expanded={extensionsExpanded}
						>
							<div class="flex items-center gap-3">
								<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/20">
									<svg
										class="h-5 w-5 text-purple-400"
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
								</div>
								<div>
									<h2 class="text-lg font-semibold text-white">Extended</h2>
									<p class="text-sm text-gray-400">
										{data.extensions.length} song{data.extensions.length !== 1 ? 's' : ''} with extensions
									</p>
								</div>
							</div>
							<svg
								class="h-5 w-5 text-gray-500 transition-transform {extensionsExpanded
									? 'rotate-180'
									: ''}"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 9l-7 7-7-7"
								/>
							</svg>
						</button>
						{#if extensionsExpanded}
							<div class="space-y-2 px-6 pb-6">
								{#each data.extensions as ext (ext.generation.id)}
									<div
										class="group rounded-xl border border-white/5 bg-white/[0.03] p-3 transition-all hover:border-white/10 hover:bg-white/[0.06]"
									>
										<div class="flex items-center gap-4">
											<!-- Thumbnail -->
											<div class="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg">
												{#if ext.generation.track1_image_url}
													<img
														src={ext.generation.track1_image_url}
														alt={ext.generation.title}
														class="h-full w-full object-cover"
													/>
												{:else}
													<div
														class="flex h-full w-full items-center justify-center bg-linear-to-br from-purple-500 to-pink-600"
													>
														<svg
															class="h-5 w-5 text-white"
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
													</div>
												{/if}
											</div>

											<!-- Content -->
											<div class="min-w-0 flex-1">
												<a
													href={resolve(
														`/projects/${ext.generation.project_id}/generations/${ext.generation.id}`
													)}
													class="block truncate text-sm font-semibold text-white transition-colors hover:text-indigo-300"
												>
													{ext.generation.title}
												</a>
												<div class="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
													<span
														class="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-gray-300"
													>
														{ext.generation.project_name}
													</span>
													<span class="text-gray-600">·</span>
													<span>{formatHighlightDate(ext.generation.updated_at)}</span>
												</div>
											</div>

											<!-- Extension count badge -->
											<span
												class="shrink-0 rounded-full bg-purple-500/20 px-2.5 py-1 text-[10px] font-medium text-purple-300"
											>
												{ext.generation.extension_count} extension{ext.generation
													.extension_count !== 1
													? 's'
													: ''}
											</span>
										</div>

										<!-- Song links -->
										{#if ext.songs.length > 0}
											<div class="mt-2 ml-16 flex gap-2">
												{#each ext.songs as song (song.id)}
													<a
														href={resolve(
															`/projects/${ext.generation.project_id}/generations/${ext.generation.id}/song/${song.id}`
														)}
														class="flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
													>
														<span class="font-medium">V{song.trackNumber}</span>
														{#if song.duration}
															<span class="text-gray-600">·</span>
															<span>{formatTime(song.duration)}</span>
														{/if}
													</a>
												{/each}
											</div>
										{/if}
									</div>
								{/each}
							</div>
						{/if}
					</section>
				{/if}

				<!-- Labeled Section -->
				{#if data.labeled.length > 0}
					<section
						class="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm"
					>
						<button
							onclick={() => (labeledExpanded = !labeledExpanded)}
							class="flex w-full cursor-pointer items-center justify-between px-6 py-4 text-left transition-colors hover:bg-white/5"
							aria-expanded={labeledExpanded}
						>
							<div class="flex items-center gap-3">
								<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/20">
									<svg
										class="h-5 w-5 text-cyan-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"
										/>
									</svg>
								</div>
								<div>
									<h2 class="text-lg font-semibold text-white">Labeled</h2>
									<p class="text-sm text-gray-400">
										{data.labeled.length} variation{data.labeled.length !== 1 ? 's' : ''} with labels
									</p>
								</div>
							</div>
							<svg
								class="h-5 w-5 text-gray-500 transition-transform {labeledExpanded
									? 'rotate-180'
									: ''}"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 9l-7 7-7-7"
								/>
							</svg>
						</button>
						{#if labeledExpanded}
							<div class="space-y-2 px-6 pb-6">
								{#each data.labeled as variation (variation.annotation.id)}
									{@const isPlaying = audioStore.isTrackPlaying(variation.song.id)}
									{@const isCurrentTrack = audioStore.isCurrentTrack(variation.song.id)}
									<div
										class="group rounded-xl border border-white/5 bg-white/[0.03] p-3 transition-all hover:border-white/10 hover:bg-white/[0.06] {isCurrentTrack
											? 'border-indigo-500/30 ring-1 ring-indigo-500/20'
											: ''}"
									>
										<div class="flex items-center gap-4">
											<!-- Thumbnail + Play -->
											<button
												onclick={() => handlePlayVariation(variation)}
												class="group/play relative h-12 w-12 shrink-0 cursor-pointer overflow-hidden rounded-lg"
											>
												{#if variation.song.imageUrl}
													<img
														src={variation.song.imageUrl}
														alt={variation.song.title}
														class="h-full w-full object-cover"
													/>
												{:else}
													<div
														class="flex h-full w-full items-center justify-center bg-linear-to-br from-cyan-500 to-blue-600"
													>
														<svg
															class="h-5 w-5 text-white"
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
															class="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-lg"
														>
															<svg
																class="h-3.5 w-3.5 text-gray-900"
																fill="currentColor"
																viewBox="0 0 24 24"
															>
																<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
															</svg>
														</div>
													{:else}
														<div
															class="flex h-7 w-7 items-center justify-center rounded-full bg-white opacity-0 shadow-lg transition-opacity group-hover/play:opacity-100"
														>
															<svg
																class="h-3.5 w-3.5 pl-0.5 text-gray-900"
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
												<a
													href={resolve(
														`/projects/${variation.generation.project_id}/generations/${variation.generation.id}/song/${variation.song.id}`
													)}
													class="block truncate text-sm font-semibold text-white transition-colors hover:text-indigo-300"
												>
													{variation.generation.title}
												</a>
												<div class="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
													<span
														class="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-gray-300"
													>
														{variation.annotation.project_name}
													</span>
													<span
														class="rounded bg-gray-700 px-1.5 py-0.5 text-[10px] font-medium text-gray-300"
													>
														V{variation.song.trackNumber}
													</span>
													{#if variation.song.duration}
														<span>{formatTime(variation.song.duration)}</span>
													{/if}
												</div>
											</div>
										</div>

										<!-- Labels -->
										{#if variation.annotation.labels.length > 0}
											<div class="mt-2 ml-16 flex flex-wrap gap-1.5">
												{#each variation.annotation.labels as label (label)}
													<span
														class="rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-[11px] font-medium text-cyan-300"
													>
														{label}
													</span>
												{/each}
											</div>
										{/if}
									</div>
								{/each}
							</div>
						{/if}
					</section>
				{/if}
			</div>
		{/if}
	</main>
</div>
