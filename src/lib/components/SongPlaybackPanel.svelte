<script lang="ts">
	import Waveform from '$lib/components/Waveform.svelte';
	import type { StemSeparationType } from '$lib/types';

	type SongInfo = {
		title: string;
		streamUrl?: string | null;
		audioUrl?: string | null;
		duration?: number | null;
	};

	let {
		song,
		currentTime,
		duration,
		isPlaying,
		onPlayPause,
		onSeek,
		onWaveformSeek,
		starred,
		starAnimClass,
		onToggleStar,
		onToggleExtend,
		showStemOptions,
		onToggleStemOptions,
		separatingType,
		hasVocalSeparation,
		hasStemSeparation,
		pendingVocalSeparation,
		pendingStemSeparation,
		onRequestStemSeparation
	}: {
		song: SongInfo;
		currentTime: number;
		duration: number;
		isPlaying: boolean;
		onPlayPause: () => void;
		onSeek: (e: Event) => void;
		onWaveformSeek: (time: number) => void;
		starred: boolean;
		starAnimClass: string;
		onToggleStar: () => void;
		onToggleExtend: () => void;
		showStemOptions: boolean;
		onToggleStemOptions: () => void;
		separatingType: StemSeparationType | null;
		hasVocalSeparation: boolean;
		hasStemSeparation: boolean;
		pendingVocalSeparation: boolean;
		pendingStemSeparation: boolean;
		onRequestStemSeparation: (type: StemSeparationType) => void;
	} = $props();
</script>

<div class="mb-10">
	{#if song.streamUrl || song.audioUrl}
		<div
			class="mb-6 rounded-xl border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-700 dark:bg-gray-800"
		>
			<Waveform
				audioUrl={song.audioUrl || song.streamUrl || ''}
				height={160}
				{currentTime}
				{duration}
				onSeek={onWaveformSeek}
			/>
		</div>

		<div
			class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
		>
			<div class="flex items-center justify-center gap-6">
				<button
					onclick={onPlayPause}
					class="flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition-all hover:scale-105 hover:bg-indigo-700"
				>
					{#if !isPlaying}
						<svg class="h-8 w-8 pl-1" fill="currentColor" viewBox="0 0 24 24">
							<path d="M8 5v14l11-7z" />
						</svg>
					{:else}
						<svg class="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
							<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
						</svg>
					{/if}
				</button>

				<div class="flex flex-1 items-center gap-3">
					<span class="w-14 text-right text-sm font-medium text-gray-600 dark:text-gray-300">
						{Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}
					</span>
					<input
						type="range"
						min="0"
						max={duration || 100}
						value={currentTime}
						oninput={onSeek}
						class="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-gray-200 accent-indigo-600 dark:bg-gray-700"
					/>
					<span class="w-14 text-sm font-medium text-gray-600 dark:text-gray-300">
						{Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}
					</span>
				</div>

				{#if song.audioUrl}
					<a
						href={song.audioUrl}
						rel="external"
						download={`${song.title}.mp3`}
						class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
						title="Download track"
					>
						<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
							/>
						</svg>
					</a>
				{/if}

				<button
					onclick={onToggleStar}
					class="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors {starred
						? 'bg-amber-100 text-amber-600 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:hover:bg-amber-900/60'
						: 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}"
					title={starred ? 'Unstar' : 'Star'}
				>
					<svg
						class="h-5 w-5 {starAnimClass}"
						fill={starred ? 'currentColor' : 'none'}
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

				<button
					onclick={onToggleExtend}
					class="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full bg-purple-100 text-purple-600 transition-colors hover:bg-purple-200 dark:bg-purple-900/50 dark:text-purple-400 dark:hover:bg-purple-900"
					title="Extend song"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 5l7 7-7 7M5 5l7 7-7 7"
						/>
					</svg>
				</button>

				<div class="relative">
					<button
						onclick={onToggleStemOptions}
						disabled={separatingType !== null}
						class="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full bg-cyan-100 text-cyan-600 transition-colors hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-cyan-900/50 dark:text-cyan-400 dark:hover:bg-cyan-900"
						title="Stem Separation"
					>
						{#if separatingType !== null || pendingVocalSeparation || pendingStemSeparation}
							<svg class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								></circle>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
						{:else}
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
								/>
							</svg>
						{/if}
					</button>

					{#if showStemOptions}
						<div
							class="absolute top-14 right-0 z-10 w-64 rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800"
						>
							<div class="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">
								Separate Stems
							</div>
							<div class="space-y-2">
								<button
									onclick={() => onRequestStemSeparation('separate_vocal')}
									disabled={hasVocalSeparation || pendingVocalSeparation}
									class="flex w-full cursor-pointer items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-700"
								>
									<span class="text-xl">🎤</span>
									<div>
										<div class="text-sm font-medium text-gray-900 dark:text-gray-100">
											Vocals + Instrumental
										</div>
										<div class="text-xs text-gray-500 dark:text-gray-400">
											{#if hasVocalSeparation}
												✓ Already separated
											{:else if pendingVocalSeparation}
												Processing...
											{:else}
												Separate vocals from backing track
											{/if}
										</div>
									</div>
								</button>
								<button
									onclick={() => onRequestStemSeparation('split_stem')}
									disabled={hasStemSeparation || pendingStemSeparation}
									class="flex w-full cursor-pointer items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-700"
								>
									<span class="text-xl">🎛️</span>
									<div>
										<div class="text-sm font-medium text-gray-900 dark:text-gray-100">
											Full Stem Split
										</div>
										<div class="text-xs text-gray-500 dark:text-gray-400">
											{#if hasStemSeparation}
												✓ Already separated
											{:else if pendingStemSeparation}
												Processing...
											{:else}
												Drums, bass, guitar, keys, etc.
											{/if}
										</div>
									</div>
								</button>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{:else}
		<div
			class="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center dark:border-gray-700 dark:bg-gray-800"
		>
			<p class="text-gray-600 dark:text-gray-400">Audio not yet available</p>
		</div>
	{/if}
</div>
